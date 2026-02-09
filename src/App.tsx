import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { GuidedTipsProvider, useGuidedTips } from "@/contexts/GuidedTipsContext";
import { SpotlightOverlay } from "@/components/guided-tips/SpotlightOverlay";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { EmbeddedCheckout } from "@/components/onboarding/EmbeddedCheckout";
import { SubscriptionGate } from "@/components/onboarding/SubscriptionGate";
import { ChallengeCelebrationModal } from "@/components/challenge/ChallengeCelebrationModal";
import { BiometricPrompt } from "@/components/auth/BiometricPrompt";
import { usePageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Mercado from "./pages/Mercado";
import Scanner from "./pages/Scanner";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ListingDetails from "./pages/ListingDetails";
import PaymentSuccess from "./pages/PaymentSuccess";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PaymentCanceled from "./pages/PaymentCanceled";

const queryClient = new QueryClient();

// Analytics tracker component
const AnalyticsTracker = () => {
  usePageTracking();
  return null;
};

// Component that handles subscription flow
const SubscriptionFlow = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { status, isNewUser, isLoading: subLoading, startTrial, createCheckout, checkSubscription } = useSubscription();
  const { markOnboardingComplete } = useGuidedTips();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEmbeddedCheckout, setShowEmbeddedCheckout] = useState(false);
  const [isOnboardingInProgress, setIsOnboardingInProgress] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const hasCheckedRef = useRef(false);

  // Check if user has completed onboarding before (persisted in localStorage)
  const hasCompletedOnboardingBefore = useCallback((userId: string): boolean => {
    const completedUsers = localStorage.getItem("paddock_onboarding_completed");
    if (!completedUsers) return false;
    try {
      const users = JSON.parse(completedUsers) as string[];
      return users.includes(userId);
    } catch {
      return false;
    }
  }, []);

  // Mark user as having completed onboarding
  const markUserOnboardingComplete = useCallback((userId: string) => {
    const completedUsers = localStorage.getItem("paddock_onboarding_completed");
    let users: string[] = [];
    try {
      users = completedUsers ? JSON.parse(completedUsers) : [];
    } catch {
      users = [];
    }
    if (!users.includes(userId)) {
      users.push(userId);
      localStorage.setItem("paddock_onboarding_completed", JSON.stringify(users));
    }
  }, []);

  // Show onboarding for new users - only check once
  useEffect(() => {
    // If onboarding is in progress, don't interrupt it
    if (isOnboardingInProgress) return;
    
    // If we've already checked, don't check again
    if (hasCheckedRef.current) return;
    
    if (!authLoading && !subLoading && user) {
      hasCheckedRef.current = true;
      
      // Check if this specific user has completed onboarding before
      const alreadyCompleted = hasCompletedOnboardingBefore(user.id);
      
      if (alreadyCompleted) {
        // User already completed onboarding, don't show again
        console.log("[Onboarding] User already completed onboarding before");
        // Only mark guided tips as complete if user has active subscription/trial
        if (status === "trial" || status === "active") {
          markOnboardingComplete();
        }
      } else if (isNewUser && status === "none") {
        // New user who hasn't completed onboarding
        console.log("[Onboarding] Showing onboarding for new user");
        setIsOnboardingInProgress(true);
        setShowOnboarding(true);
      } else if (status === "trial" || status === "active") {
        // User has subscription record - mark as completed
        console.log("[Onboarding] User has subscription, marking onboarding complete");
        markUserOnboardingComplete(user.id);
        markOnboardingComplete();
      }
    }
  }, [authLoading, subLoading, user, isNewUser, status, isOnboardingInProgress, markOnboardingComplete, hasCompletedOnboardingBefore, markUserOnboardingComplete]);

  // Reset onboarding check when user changes
  useEffect(() => {
    if (!user) {
      hasCheckedRef.current = false;
      setIsOnboardingInProgress(false);
      setShowOnboarding(false);
      setShowEmbeddedCheckout(false);
    }
  }, [user]);

  const handleStartTrial = useCallback(() => {
    if (!user) return;
    
    // Mark onboarding as complete BEFORE showing checkout
    // This ensures user won't see onboarding again even if they abandon checkout
    markUserOnboardingComplete(user.id);
    
    // Show embedded checkout instead of redirecting
    setShowOnboarding(false);
    setShowEmbeddedCheckout(true);
  }, [markUserOnboardingComplete, user]);

  const handleCheckoutBack = useCallback(() => {
    // If was in onboarding, go back to onboarding
    // Otherwise, just close checkout (user came from subscription gate)
    setShowEmbeddedCheckout(false);
    if (isOnboardingInProgress) {
      setShowOnboarding(true);
    }
  }, [isOnboardingInProgress]);

  const handleCheckoutComplete = useCallback(async () => {
    // Checkout completed - navigate directly, skip biometric on web
    setShowEmbeddedCheckout(false);
    setIsOnboardingInProgress(false);
    markOnboardingComplete();
    
    if (Capacitor.isNativePlatform()) {
      // Show biometric prompt only on native
      setShowBiometricPrompt(true);
    } else {
      // On web, just refresh subscription and navigate
      await checkSubscription();
      navigate("/", { replace: true });
    }
  }, [markOnboardingComplete, checkSubscription, navigate]);

  const handleBiometricComplete = useCallback(() => {
    setShowBiometricPrompt(false);
    // Use navigate instead of window.location.href to avoid full reload
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSkipOnboarding = useCallback(async () => {
    if (!user) return;
    
    // Mark onboarding as complete first
    markUserOnboardingComplete(user.id);
    
    setCheckoutLoading(true);
    try {
      const success = await startTrial();
      
      // Always close onboarding after attempting trial
      markOnboardingComplete();
      setIsOnboardingInProgress(false);
      setShowOnboarding(false);
      
      if (success) {
        if (Capacitor.isNativePlatform()) {
          // Show biometric prompt on native
          setShowBiometricPrompt(true);
        } else {
          // On web, just navigate directly
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      console.error("Error starting trial:", err);
      // Still close onboarding on error
      setIsOnboardingInProgress(false);
      setShowOnboarding(false);
    } finally {
      setCheckoutLoading(false);
    }
  }, [startTrial, markOnboardingComplete, markUserOnboardingComplete, user, navigate]);

  const handleSubscribe = useCallback(() => {
    // Show embedded checkout instead of redirecting
    setShowEmbeddedCheckout(true);
  }, []);

  // If not logged in, show app normally (will redirect to auth)
  if (!user) {
    return <>{children}</>;
  }

  // Wait for both auth and subscription loading to complete
  // But render children to avoid layout shifts
  if (authLoading || subLoading) {
    return <>{children}</>;
  }

  // Show biometric prompt
  if (showBiometricPrompt && user?.email) {
    return (
      <BiometricPrompt
        userEmail={user.email}
        onComplete={handleBiometricComplete}
      />
    );
  }

  // Show embedded checkout
  if (showEmbeddedCheckout) {
    return (
      <EmbeddedCheckout
        onBack={handleCheckoutBack}
        onComplete={handleCheckoutComplete}
      />
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <OnboardingCarousel
        onStartTrial={handleStartTrial}
        onSkip={handleSkipOnboarding}
        isLoading={checkoutLoading}
      />
    );
  }

  // Show subscription gate for expired trials
  if (status === "expired") {
    return (
      <SubscriptionGate
        onSubscribe={handleSubscribe}
        isLoading={checkoutLoading}
      />
    );
  }

  // User has active subscription or trial
  return <>{children}</>;
};

// Component that handles splash → auth check → redirect
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If we just returned from an OAuth provider, the URL can contain callback params.
  // We must NOT redirect away (and drop query/hash) before the auth client exchanges them.
  const hasOAuthCallbackParams = (() => {
    try {
      const sp = new URLSearchParams(location.search);
      return (
        sp.has("code") ||
        sp.has("access_token") ||
        sp.has("refresh_token") ||
        location.hash.includes("access_token=") ||
        location.hash.includes("refresh_token=")
      );
    } catch {
      return false;
    }
  })();

  // After splash completes, mark it as done
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Only redirect to auth once after initial auth check
  useEffect(() => {
    // Wait for splash to finish and auth to complete initial check
    if (!showSplash && !loading && !initialAuthChecked) {
      setInitialAuthChecked(true);
      if (!user) {
        // Avoid navigating if we're already on /auth (especially with ?code=...)
        // and avoid dropping OAuth callback params by redirecting too early.
        if (location.pathname !== "/auth" && !hasOAuthCallbackParams) {
          navigate("/auth", { replace: true });
        }
      }
    }
  }, [showSplash, loading, user, navigate, initialAuthChecked, location.pathname, hasOAuthCallbackParams]);

  // Handle sign out - redirect to auth when user becomes null AFTER initial check
  useEffect(() => {
    if (initialAuthChecked && !loading && !user) {
      if (location.pathname !== "/auth" && !hasOAuthCallbackParams) {
        navigate("/auth", { replace: true });
      }
    }
  }, [user, loading, initialAuthChecked, navigate, location.pathname, hasOAuthCallbackParams]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <AnalyticsTracker />
      <SubscriptionFlow>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/listing/:id" element={<ListingDetails />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-canceled" element={<PaymentCanceled />} />
          <Route path="/subscription-success" element={<PaymentSuccess />} />
          <Route
            path="/*"
            element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/mercado" element={<Mercado />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </SubscriptionFlow>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <LanguageProvider>
            <GuidedTipsProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <DeepLinkHandler />
                  <AppContent />
                  <SpotlightOverlay />
                  <ChallengeCelebrationModal />
                </BrowserRouter>
              </TooltipProvider>
            </GuidedTipsProvider>
          </LanguageProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
