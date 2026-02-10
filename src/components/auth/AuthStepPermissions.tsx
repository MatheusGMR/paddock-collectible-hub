import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

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
  const [biometricDone, setBiometricDone] = useState(false);
  const [cameraDone, setCameraDone] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setCameraDone(true); // proceed anyway
    } finally {
      setLoading(false);
    }
  };

  const allDone = (!biometricAvailable || biometricDone) && cameraDone;

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
            disabled={biometricDone || loading}
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
          disabled={cameraDone || loading}
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
      </div>

      {loading && (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      <Button
        onClick={onComplete}
        disabled={!allDone && !loading}
        className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base"
      >
        {allDone ? "Vamos lá!" : "Pular por agora"}
      </Button>
    </div>
  );
};
