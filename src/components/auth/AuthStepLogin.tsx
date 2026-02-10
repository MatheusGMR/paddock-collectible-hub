import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Fingerprint, Loader2, KeyRound } from "lucide-react";
import { AuthStepPassword } from "./AuthStepPassword";

interface UserProfile {
  username: string;
  avatar_url: string | null;
}

interface AuthStepLoginProps {
  email: string;
  profile: UserProfile | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricLabel: string;
  onBiometricAuth: () => Promise<boolean>;
  onPasswordSubmit: (password: string) => void;
  onBack: () => void;
  loading: boolean;
}

export const AuthStepLogin = ({
  email,
  profile,
  biometricAvailable,
  biometricEnabled,
  biometricLabel,
  onBiometricAuth,
  onPasswordSubmit,
  onBack,
  loading,
}: AuthStepLoginProps) => {
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Auto-trigger biometric on mount
  useEffect(() => {
    if (biometricAvailable && biometricEnabled) {
      handleBiometric();
    } else {
      setShowPasswordFallback(true);
    }
  }, []);

  const handleBiometric = async () => {
    setBiometricLoading(true);
    try {
      const success = await onBiometricAuth();
      if (!success) {
        setShowPasswordFallback(true);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  if (showPasswordFallback) {
    return (
      <AuthStepPassword
        onSubmit={onPasswordSubmit}
        onBack={onBack}
        loading={loading}
        isLogin
      />
    );
  }

  return (
    <div className="space-y-8 w-full">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
            {profile?.username?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Olá, {profile?.username || email}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{email}</p>
        </div>
      </div>

      {biometricLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Autenticando com {biometricLabel}...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {biometricAvailable && biometricEnabled && (
            <Button
              onClick={handleBiometric}
              className="w-full h-14 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 font-medium gap-3"
              variant="outline"
            >
              <Fingerprint className="h-6 w-6" />
              Entrar com {biometricLabel}
            </Button>
          )}

          <Button
            onClick={() => setShowPasswordFallback(true)}
            variant="ghost"
            className="w-full h-12 text-muted-foreground hover:text-foreground gap-2"
          >
            <KeyRound className="h-5 w-5" />
            Usar senha
          </Button>
        </div>
      )}
    </div>
  );
};
