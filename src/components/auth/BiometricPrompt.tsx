import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint, X, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { cn } from "@/lib/utils";

const BIOMETRIC_PROMPT_SHOWN_KEY = "paddock_biometric_prompt_shown";

interface BiometricPromptProps {
  userEmail: string;
  onComplete: () => void;
}

export const BiometricPrompt = ({ userEmail, onComplete }: BiometricPromptProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const { isAvailable, loading, enableBiometric, getBiometryLabel } = useBiometricAuth();

  useEffect(() => {
    // Only show on native platforms
    if (!Capacitor.isNativePlatform()) {
      onComplete();
      return;
    }

    // Wait for biometric check to complete
    if (loading) return;

    // Check if we already showed this prompt
    const alreadyShown = localStorage.getItem(BIOMETRIC_PROMPT_SHOWN_KEY);
    
    if (alreadyShown) {
      onComplete();
      return;
    }

    // Only show if biometric is available
    if (isAvailable) {
      // Small delay for smooth transition after login
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Mark as shown even if not available to prevent future checks
      localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
      onComplete();
    }
  }, [loading, isAvailable, onComplete]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const success = await enableBiometric(userEmail);
      if (success) {
        localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
        onComplete();
      }
    } catch (error) {
      console.error("[BiometricPrompt] Error enabling:", error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
    onComplete();
  };

  if (!isVisible) {
    return null;
  }

  const biometryLabel = getBiometryLabel();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm mx-4 p-6 bg-card rounded-3xl border border-border shadow-2xl space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Fingerprint className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Ativar {biometryLabel}?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Use {biometryLabel} para acessar o Paddock de forma rápida e segura, sem precisar digitar sua senha.
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Seus dados biométricos nunca saem do dispositivo
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleEnable}
            disabled={isEnabling}
            className="w-full h-12 text-base"
          >
            {isEnabling ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Fingerprint className="h-5 w-5 mr-2" />
                Ativar {biometryLabel}
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isEnabling}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Agora não
          </Button>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground">
          Você pode alterar isso depois em Configurações
        </p>
      </div>
    </div>
  );
};

// Helper to reset the prompt (useful for testing or when user logs out)
export const resetBiometricPrompt = () => {
  localStorage.removeItem(BIOMETRIC_PROMPT_SHOWN_KEY);
};
