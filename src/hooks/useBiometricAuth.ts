import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  BiometricAuth,
  BiometryType,
  CheckBiometryResult,
} from "@aparajita/capacitor-biometric-auth";

const BIOMETRIC_ENABLED_KEY = "paddock_biometric_enabled";
const STORED_EMAIL_KEY = "paddock_stored_email";

interface BiometricState {
  isAvailable: boolean;
  biometryType: BiometryType;
  isEnabled: boolean;
  storedEmail: string | null;
}

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometryType: BiometryType.none,
    isEnabled: false,
    storedEmail: null,
  });
  const [loading, setLoading] = useState(true);

  // Check if biometric is available on device
  const checkBiometryAvailability = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }

    try {
      const result: CheckBiometryResult = await BiometricAuth.checkBiometry();
      const isEnabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
      const storedEmail = localStorage.getItem(STORED_EMAIL_KEY);

      setState({
        isAvailable: result.isAvailable,
        biometryType: result.biometryType,
        isEnabled,
        storedEmail,
      });
    } catch (error) {
      console.error("[Biometric] Error checking availability:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBiometryAvailability();
  }, [checkBiometryAvailability]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !state.isAvailable) {
      return false;
    }

    try {
      await BiometricAuth.authenticate({
        reason: "Acesse sua conta Paddock",
        cancelTitle: "Cancelar",
        allowDeviceCredential: true,
        iosFallbackTitle: "Usar senha do dispositivo",
        androidTitle: "Autenticação Paddock",
        androidSubtitle: "Use biometria para acessar",
        androidConfirmationRequired: false,
      });
      return true;
    } catch (error) {
      console.error("[Biometric] Authentication failed:", error);
      return false;
    }
  }, [state.isAvailable]);

  // Enable biometric login for a user
  const enableBiometric = useCallback(async (email: string): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !state.isAvailable) {
      return false;
    }

    // First authenticate to confirm identity
    const authenticated = await authenticate();
    if (!authenticated) {
      return false;
    }

    // Store preferences
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
    localStorage.setItem(STORED_EMAIL_KEY, email);

    setState((prev) => ({
      ...prev,
      isEnabled: true,
      storedEmail: email,
    }));

    return true;
  }, [state.isAvailable, authenticate]);

  // Disable biometric login
  const disableBiometric = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(STORED_EMAIL_KEY);

    setState((prev) => ({
      ...prev,
      isEnabled: false,
      storedEmail: null,
    }));
  }, []);

  // Get biometry type label
  const getBiometryLabel = useCallback((): string => {
    switch (state.biometryType) {
      case BiometryType.faceId:
        return "Face ID";
      case BiometryType.touchId:
        return "Touch ID";
      case BiometryType.fingerprintAuthentication:
        return "Impressão Digital";
      case BiometryType.faceAuthentication:
        return "Reconhecimento Facial";
      case BiometryType.irisAuthentication:
        return "Reconhecimento de Íris";
      default:
        return "Biometria";
    }
  }, [state.biometryType]);

  return {
    ...state,
    loading,
    authenticate,
    enableBiometric,
    disableBiometric,
    getBiometryLabel,
    refresh: checkBiometryAvailability,
  };
};
