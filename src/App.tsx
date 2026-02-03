import { useState, useEffect, useCallback, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { DeepLinkHandler } from "@/components/DeepLinkHandler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { GuidedTipsProvider, useGuidedTips } from "@/contexts/GuidedTipsContext";
import { SpotlightOverlay } from "@/components/guided-tips/SpotlightOverlay";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { SubscriptionGate } from "@/components/onboarding/SubscriptionGate";
import { ChallengeCelebrationModal } from "@/components/challenge/ChallengeCelebrationModal";
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
  const { status, isNewUser, isLoading: subLoading, startTrial, createCheckout } = useSubscription();
  const { markOnboardingComplete } = useGuidedTips();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnboardingInProgress, setIsOnboardingInProgress] = useState(false);
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
        markOnboardingComplete();
      } else if (isNewUser && status === "none") {
        // New user who hasn't completed onboarding
        console.log("[Onboarding] Showing onboarding for new user");
        setIsOnboardingInProgress(true);
        setShowOnboarding(true);
      } else {
        // User has subscription record but hasn't been marked locally - mark now
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
    }
  }, [user]);

  const handleStartTrial = useCallback(async () => {
    if (!user) return;
    
    setCheckoutLoading(true);
    const url = await createCheckout();
    setCheckoutLoading(false);
    
    if (url) {
      // Mark onboarding as complete before redirecting to checkout
      markUserOnboardingComplete(user.id);
      markOnboardingComplete();
      setIsOnboardingInProgress(false);
      window.location.href = url;
    }
  }, [createCheckout, markOnboardingComplete, markUserOnboardingComplete, user]);

  const handleSkipOnboarding = useCallback(async () => {
    if (!user) return;
    
    setCheckoutLoading(true);
    const success = await startTrial();
    setCheckoutLoading(false);
    
    if (success) {
      // Mark onboarding as complete after starting trial
      markUserOnboardingComplete(user.id);
      markOnboardingComplete();
      setIsOnboardingInProgress(false);
      setShowOnboarding(false);
    }
  }, [startTrial, markOnboardingComplete, markUserOnboardingComplete, user]);

  const handleSubscribe = useCallback(async () => {
    setCheckoutLoading(true);
    const url = await createCheckout();
    setCheckoutLoading(false);
    
    if (url) {
      window.location.href = url;
    }
  }, [createCheckout]);

  // If not logged in, show app normally (will redirect to auth)
  if (!user) {
    return <>{children}</>;
  }

  // Wait for both auth and subscription loading to complete
  // But render children to avoid layout shifts
  if (authLoading || subLoading) {
    return <>{children}</>;
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
        navigate("/auth", { replace: true });
      }
    }
  }, [showSplash, loading, user, navigate, initialAuthChecked]);

  // Handle sign out - redirect to auth when user becomes null AFTER initial check
  useEffect(() => {
    if (initialAuthChecked && !loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, initialAuthChecked, navigate]);

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
