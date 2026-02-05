import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Fingerprint } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

const BIOMETRIC_PROMPT_SHOWN_KEY = "paddock_biometric_prompt_shown";

interface BiometricPromptProps {
  userEmail: string;
  onComplete: () => void;
}

export const BiometricPrompt = ({ userEmail, onComplete }: BiometricPromptProps) => {
  const [isEnabling, setIsEnabling] = useState(false);
  const { isAvailable, loading, enableBiometric } = useBiometricAuth();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      onComplete();
      return;
    }

    // Wait for biometric check to complete
    if (loading) return;

    // Check if we already processed this
    const alreadyShown = localStorage.getItem(BIOMETRIC_PROMPT_SHOWN_KEY);
    
    if (alreadyShown) {
      onComplete();
      return;
    }

    // Auto-enable biometric if available (default behavior)
    if (isAvailable && !isEnabling) {
      setIsEnabling(true);
      
      enableBiometric(userEmail)
        .then((success) => {
          localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
          console.log("[BiometricPrompt] Auto-enabled:", success);
          onComplete();
        })
        .catch((error) => {
          console.error("[BiometricPrompt] Auto-enable failed:", error);
          // Still mark as shown and continue even if it fails
          localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
          onComplete();
        });
    } else if (!isAvailable) {
      // Mark as shown if not available to prevent future checks
      localStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
      onComplete();
    }
  }, [loading, isAvailable, isEnabling, userEmail, enableBiometric, onComplete]);

  // No UI needed - this component now auto-enables silently
  // Just show a minimal loading state while enabling
  if (isEnabling) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Fingerprint className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-sm text-muted-foreground">Configurando acesso seguro...</p>
        </div>
      </div>
    );
  }

  return null;
};

// Helper to reset the prompt (useful for testing or when user logs out)
export const resetBiometricPrompt = () => {
  localStorage.removeItem(BIOMETRIC_PROMPT_SHOWN_KEY);
};
