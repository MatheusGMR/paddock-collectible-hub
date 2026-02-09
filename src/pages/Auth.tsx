import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Fingerprint } from "lucide-react";

// Get the appropriate redirect URI based on platform
const getRedirectUri = () => {
  if (Capacitor.isNativePlatform()) {
    return "paddock://auth/callback";
  }
  // On web, return to /auth so we don't lose the OAuth callback params (code/state)
  // due to the app auto-redirecting unauthenticated users.
  return `${window.location.origin}/auth`;
};

// Check if running on native platform
const isNativePlatform = Capacitor.isNativePlatform();

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = window.location;
  
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    storedEmail,
    authenticate: biometricAuthenticate,
    getBiometryLabel,
    loading: biometricCheckLoading,
  } = useBiometricAuth();

  // Detect if we're returning from an OAuth callback (Apple/Google)
  const isOAuthCallback = (() => {
    try {
      const sp = new URLSearchParams(location.search);
      return (
        sp.has("code") ||
        sp.has("access_token") ||
        location.hash.includes("access_token=")
      );
    } catch {
      return false;
    }
  })();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // If OAuth callback is detected but user is not yet set, show a timeout fallback
  useEffect(() => {
    if (!isOAuthCallback) return;
    
    // After 15 seconds, if still no user, something went wrong
    const timeout = setTimeout(() => {
      if (!user) {
        console.error("[Auth] OAuth callback timed out - no session received");
        // Clean the URL without full page reload
        window.history.replaceState({}, "", "/auth");
        toast({
          title: "Erro na autenticação",
          description: "Não foi possível completar o login. Tente novamente.",
          variant: "destructive",
        });
        // Use navigate instead of window.location.href to avoid full page reload
        navigate("/auth", { replace: true });
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isOAuthCallback, user, toast, navigate]);

  // Auto-trigger biometric auth if enabled
  useEffect(() => {
    const tryBiometricLogin = async () => {
      if (
        !authLoading &&
        !user &&
        biometricEnabled &&
        storedEmail &&
        !biometricCheckLoading
      ) {
        await handleBiometricLogin();
      }
    };
    tryBiometricLogin();
  }, [biometricEnabled, storedEmail, authLoading, user, biometricCheckLoading]);

  // Handle biometric login
  const handleBiometricLogin = async () => {
    if (!storedEmail || biometricLoading) return;
    
    setBiometricLoading(true);
    try {
      const success = await biometricAuthenticate();
      if (success) {
        // User authenticated with biometrics - get their session from stored token
        // Since we can't store passwords securely, biometric just confirms identity
        // The session should still be active from Supabase's persistence
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          navigate("/", { replace: true });
        } else {
          // Session expired, need to login again
          toast({
            title: "Sessão expirada",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("[Biometric] Login error:", error);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/");
      } else {
        if (!username.trim()) {
          throw new Error(t.errors.usernameRequired);
        }
        const { error } = await signUp(email, password, username);
        if (error) throw error;
        navigate("/");
      }
    } catch (error) {
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.errors.errorOccurred,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: getRedirectUri(),
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.errors.failedAppleSignIn,
        variant: "destructive"
      });
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getRedirectUri(),
      });
      if (error) throw error;
    } catch (error) {
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.errors.failedGoogleSignIn,
        variant: "destructive"
      });
      setGoogleLoading(false);
    }
  };

  // If we're processing an OAuth callback, show a loading screen instead of the form
  if (isOAuthCallback && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <PaddockLogo variant="wordmark" size={96} />
        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Completando login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 animate-scale-in">
        <PaddockLogo variant="wordmark" size={96} />
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
          </h1>
          <p className="text-sm text-foreground-secondary mt-1">
            {isLogin ? t.auth.enterEmail : t.auth.joinCommunity}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Input
                type="text"
                placeholder={t.auth.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <Input
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary"
              required
            />
          </div>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t.auth.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary pr-12"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLogin ? (
              t.auth.signIn
            ) : (
              t.auth.createAccount
            )}
          </Button>
        </form>

        {/* Biometric Login Button - Only shown when available and enabled */}
        {biometricAvailable && biometricEnabled && storedEmail && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBiometricLogin}
            disabled={biometricLoading}
            className="w-full h-14 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-medium gap-3"
          >
            {biometricLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Fingerprint className="h-6 w-6" />
                Entrar com {getBiometryLabel()}
              </>
            )}
          </Button>
        )}

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">{t.common.or}</span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full h-12 bg-card text-foreground hover:bg-muted border border-border font-medium gap-2"
        >
          {googleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.auth.continueWithGoogle}
            </>
          )}
        </Button>

        {/* Apple Sign In */}
        <Button
          type="button"
          variant="outline"
          onClick={handleAppleSignIn}
          disabled={appleLoading}
          className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 border-0 font-medium gap-2"
        >
          {appleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              {t.auth.continueWithApple}
            </>
          )}
        </Button>

        {/* Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-foreground-secondary hover:text-primary transition-colors"
          >
            {isLogin ? (
              <>{t.auth.dontHaveAccount} <span className="text-primary font-medium">{t.auth.signUp}</span></>
            ) : (
              <>{t.auth.alreadyHaveAccount} <span className="text-primary font-medium">{t.auth.signIn}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
