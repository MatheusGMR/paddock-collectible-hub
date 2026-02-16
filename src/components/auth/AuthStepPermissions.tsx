import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Camera, Bell, Loader2, CheckCircle2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { isPushSupported, subscribeToPush } from "@/lib/pushNotifications";

interface AuthStepPermissionsProps {
  onComplete: () => void;
  onEnableBiometric: () => Promise<boolean>;
  biometricAvailable: boolean;
  biometricLabel: string;
}

export const AuthStepPermissions = ({
  onComplete,
  onEnableBiometric,
  biometricAvailable,
  biometricLabel,
}: AuthStepPermissionsProps) => {
  const { user } = useAuth();
  const [biometricDone, setBiometricDone] = useState(false);
  const [cameraDone, setCameraDone] = useState(false);
  const [pushDone, setPushDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoActivating, setAutoActivating] = useState(true);

  const pushSupported = isPushSupported();

  // Auto-activate all permissions on mount
  useEffect(() => {
    const autoActivate = async () => {
      setAutoActivating(true);

      // 1. Biometric
      if (biometricAvailable) {
        try {
          await onEnableBiometric();
          setBiometricDone(true);
        } catch {
          // User declined, that's ok
        }
      }

      // 2. Camera
      try {
        if (Capacitor.isNativePlatform()) {
          const { Camera: CapCamera } = await import("@capacitor/camera");
          await CapCamera.requestPermissions({ permissions: ["camera"] });
        }
        setCameraDone(true);
      } catch {
        setCameraDone(true);
      }

      // 3. Push notifications
      if (pushSupported && user?.id) {
        try {
          const result = await subscribeToPush(user.id);
          setPushDone(result.success);
        } catch {
          // Not supported or denied
        }
      }

      setAutoActivating(false);
    };

    autoActivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBiometric = async () => {
    setLoading(true);
    try {
      await onEnableBiometric();
      setBiometricDone(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCamera = async () => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { Camera: CapCamera } = await import("@capacitor/camera");
        await CapCamera.requestPermissions({ permissions: ["camera"] });
      }
      setCameraDone(true);
    } catch {
      setCameraDone(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    setLoading(true);
    try {
      if (user?.id) {
        const result = await subscribeToPush(user.id);
        setPushDone(result.success);
      }
    } catch {
      // denied
    } finally {
      setLoading(false);
    }
  };

  const allDone = (!biometricAvailable || biometricDone) && cameraDone && (!pushSupported || pushDone);

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Quase lá!</h2>
        <p className="text-sm text-muted-foreground">
          Configure o acesso rápido e as permissões do app
        </p>
      </div>

      <div className="space-y-4">
        {biometricAvailable && (
          <button
            onClick={handleBiometric}
            disabled={biometricDone || loading || autoActivating}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
              biometricDone
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted hover:bg-muted/80"
            }`}
          >
            {biometricDone ? (
              <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
            ) : (
              <Fingerprint className="h-8 w-8 text-muted-foreground shrink-0" />
            )}
            <div className="text-left">
              <p className="font-medium text-foreground">{biometricLabel}</p>
              <p className="text-xs text-muted-foreground">Acesso rápido e seguro à sua conta</p>
            </div>
          </button>
        )}

        <button
          onClick={handleCamera}
          disabled={cameraDone || loading || autoActivating}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
            cameraDone
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-muted hover:bg-muted/80"
          }`}
        >
          {cameraDone ? (
            <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground shrink-0" />
          )}
          <div className="text-left">
            <p className="font-medium text-foreground">Câmera</p>
            <p className="text-xs text-muted-foreground">Necessária para escanear seus colecionáveis</p>
          </div>
        </button>

        {pushSupported && (
          <button
            onClick={handlePush}
            disabled={pushDone || loading || autoActivating}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
              pushDone
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-muted hover:bg-muted/80"
            }`}
          >
            {pushDone ? (
              <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
            ) : (
              <Bell className="h-8 w-8 text-muted-foreground shrink-0" />
            )}
            <div className="text-left">
              <p className="font-medium text-foreground">Notificações Push</p>
              <p className="text-xs text-muted-foreground">Receba alertas de lançamentos e novidades</p>
            </div>
          </button>
        )}
      </div>

      {(loading || autoActivating) && (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Button
        onClick={onComplete}
        disabled={autoActivating}
        className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base"
      >
        {allDone ? "Vamos lá!" : "Continuar"}
      </Button>
    </div>
  );
};
