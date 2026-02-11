import { useState, useCallback, useEffect } from "react";
import { subscribeToPush, requestPushPermission } from "@/lib/pushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraPermissionState } from "@capacitor/camera";

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

interface PermissionsState {
  camera: PermissionState;
  notifications: PermissionState;
  allGranted: boolean;
  isRequesting: boolean;
}

const PERMISSIONS_STORAGE_KEY = "paddock_permissions_requested";
const CAMERA_GRANTED_KEY = "paddock_camera_granted";

// Helper to map Capacitor permission to our type
const mapCapacitorPermission = (state: CameraPermissionState): PermissionState => {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  if (state === "prompt" || state === "prompt-with-rationale") return "prompt";
  return "unknown";
};

export const usePermissions = () => {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  
  const [state, setState] = useState<PermissionsState>({
    camera: "unknown",
    notifications: "prompt",
    allGranted: false,
    isRequesting: false,
  });

  // Check current permission states on mount
  useEffect(() => {
    const checkPermissions = async () => {
      let cameraState: PermissionState = "unknown";
      let notificationState: PermissionState = "prompt";

      // Check camera permission - use native API on native platforms
      if (isNative) {
        try {
          console.log("[Permissions] Checking native camera permissions...");
          const permissions = await Camera.checkPermissions();
          cameraState = mapCapacitorPermission(permissions.camera);
          console.log("[Permissions] Native camera state:", cameraState);
        } catch (error) {
          console.error("[Permissions] Error checking native permissions:", error);
          cameraState = "unknown";
        }
      } else {
        // Web fallback
        try {
          if (navigator.permissions && navigator.permissions.query) {
            const cameraPermission = await navigator.permissions.query({ 
              name: "camera" as PermissionName 
            });
            cameraState = cameraPermission.state as PermissionState;
          }
        } catch {
          // Permissions API not available
          const wasGranted = localStorage.getItem(CAMERA_GRANTED_KEY);
          if (wasGranted === "true") {
            cameraState = "granted";
          } else {
            cameraState = "unknown";
          }
        }
      }

      // Check notification permission
      if ("Notification" in window) {
        notificationState = Notification.permission as PermissionState;
      }

      setState({
        camera: cameraState,
        notifications: notificationState,
        allGranted: cameraState === "granted" && notificationState === "granted",
        isRequesting: false,
      });
    };

    checkPermissions();
  }, [isNative]);

  // Request all permissions at once
  const requestAllPermissions = useCallback(async (): Promise<boolean> => {
    // Check if permissions are already granted
    const alreadyGranted = state.camera === "granted" && state.notifications === "granted";
    if (alreadyGranted) {
      console.log("[Permissions] All permissions already granted, skipping request");
      return true;
    }

    setState(prev => ({ ...prev, isRequesting: true }));

    let cameraGranted = state.camera === "granted";
    let notificationsGranted = state.notifications === "granted";

    // Only request camera if not already granted
    if (!cameraGranted) {
      if (isNative) {
        // Use native Capacitor Camera permission request on iOS/Android
        try {
          console.log("[Permissions] Requesting native camera permission...");
          const requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
          cameraGranted = requested.camera === 'granted';
          console.log("[Permissions] Native camera permission result:", requested.camera);
          
          if (cameraGranted) {
            localStorage.setItem(CAMERA_GRANTED_KEY, "true");
          }
        } catch (error) {
          console.error("[Permissions] Native camera permission error:", error);
          cameraGranted = false;
        }
      } else {
        // Web fallback - request via getUserMedia
        try {
          console.log("[Permissions] Requesting web camera permission...");
          
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
          
          stream.getTracks().forEach(track => track.stop());
          cameraGranted = true;
          localStorage.setItem(CAMERA_GRANTED_KEY, "true");
          
          console.log("[Permissions] Web camera permission granted");
        } catch (error) {
          console.log("[Permissions] Web camera permission denied:", error);
          localStorage.setItem(CAMERA_GRANTED_KEY, "false");
          cameraGranted = false;
        }
      }
    }

    // Only request notifications if not already granted
    if (!notificationsGranted) {
      try {
        if (isNative) {
          // Use native Capacitor push permission
          console.log("[Permissions] Requesting native push permission...");
          const permission = await requestPushPermission();
          notificationsGranted = permission === "granted";
          console.log("[Permissions] Native push permission:", permission);
          
          if (notificationsGranted && user?.id) {
            const subResult = await subscribeToPush(user.id);
            console.log("[Permissions] Native push subscribe result:", subResult);
          }
        } else if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          notificationsGranted = permission === "granted";
          
          if (notificationsGranted && user?.id) {
            await subscribeToPush(user.id);
          }
          
          console.log("[Permissions] Notification permission:", permission);
        }
      } catch (error) {
        console.log("[Permissions] Notification permission error:", error);
        notificationsGranted = false;
      }
    }

    // Mark that we've requested permissions
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, "true");

    const allGranted = cameraGranted && notificationsGranted;

    setState({
      camera: cameraGranted ? "granted" : "denied",
      notifications: notificationsGranted ? "granted" : "denied",
      allGranted,
      isRequesting: false,
    });

    return allGranted;
  }, [state.camera, state.notifications, user?.id, isNative]);

  // Check if permissions were already requested during onboarding
  const hasRequestedPermissions = useCallback((): boolean => {
    return localStorage.getItem(PERMISSIONS_STORAGE_KEY) === "true";
  }, []);

  // Reset camera permission state (useful when user manually changes in Settings)
  const resetCameraPermission = useCallback(() => {
    localStorage.removeItem(CAMERA_GRANTED_KEY);
    setState(prev => ({ ...prev, camera: "unknown" }));
  }, []);

  return {
    ...state,
    requestAllPermissions,
    hasRequestedPermissions,
    resetCameraPermission,
  };
};
