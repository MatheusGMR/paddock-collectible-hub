import { useState, useEffect, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { OnboardingCarousel } from "@/components/onboarding/OnboardingCarousel";
import { SubscriptionGate } from "@/components/onboarding/SubscriptionGate";
import Index from "./pages/Index";
import Mercado from "./pages/Mercado";
import Scanner from "./pages/Scanner";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ListingDetails from "./pages/ListingDetails";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";

const queryClient = new QueryClient();

// Component that handles subscription flow
const SubscriptionFlow = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { status, isNewUser, isLoading, startTrial, createCheckout } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding for new users
  useEffect(() => {
    if (!isLoading && user && isNewUser && status === "none") {
      setShowOnboarding(true);
    }
  }, [isLoading, user, isNewUser, status]);

  const handleStartTrial = useCallback(async () => {
    setCheckoutLoading(true);
    const url = await createCheckout();
    setCheckoutLoading(false);
    
    if (url) {
      window.location.href = url;
    }
  }, [createCheckout]);

  const handleSkipOnboarding = useCallback(async () => {
    setCheckoutLoading(true);
    const success = await startTrial();
    setCheckoutLoading(false);
    
    if (success) {
      setShowOnboarding(false);
    }
  }, [startTrial]);

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

  // Loading state
  if (isLoading) {
    return null; // Splash screen handles this
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // After splash completes, redirect based on auth state
  const handleSplashComplete = () => {
    setShowSplash(false);
    
    // If not loading and no user, redirect to auth
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  };

  // Also handle redirect when auth state changes after splash
  useEffect(() => {
    if (!showSplash && !loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [showSplash, loading, user, navigate]);

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <SubscriptionFlow>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/listing/:id" element={<ListingDetails />} />
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
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
