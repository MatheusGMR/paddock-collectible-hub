import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/listing/:id" element={<ListingDetails />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-canceled" element={<PaymentCanceled />} />
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
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
