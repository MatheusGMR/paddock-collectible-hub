import { useState, useCallback, useEffect } from "react";
import { subscribeToPush } from "@/lib/pushNotifications";
import { useAuth } from "@/contexts/AuthContext";

type PermissionState = "prompt" | "granted" | "denied" | "unknown";

interface PermissionsState {
  camera: PermissionState;
  notifications: PermissionState;
  allGranted: boolean;
  isRequesting: boolean;
}

const PERMISSIONS_STORAGE_KEY = "paddock_permissions_requested";
const CAMERA_GRANTED_KEY = "paddock_camera_granted";

export const usePermissions = () => {
  const { user } = useAuth();
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

      // Check camera permission - navigator.permissions.query is not supported on iOS WKWebView
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const cameraPermission = await navigator.permissions.query({ 
            name: "camera" as PermissionName 
          });
          cameraState = cameraPermission.state as PermissionState;
        }
      } catch {
        // Permissions API not available (common on iOS)
        // Check our local storage for previous successful grant
        const wasGranted = localStorage.getItem(CAMERA_GRANTED_KEY);
        if (wasGranted === "true") {
          cameraState = "granted";
        } else {
          // Unknown state - we'll try to request when scanner opens
          cameraState = "unknown";
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
  }, []);

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
      try {
        console.log("[Permissions] Requesting camera permission...");
        
        // Request camera permission by getting a stream briefly - NO AUDIO to avoid iOS issues
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false, // Don't request audio - causes permission issues on iOS
        });
        
        // Immediately stop the stream - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        cameraGranted = true;
        
        // Store successful grant for future reference (important for iOS where permissions API doesn't work)
        localStorage.setItem(CAMERA_GRANTED_KEY, "true");
        
        console.log("[Permissions] Camera permission granted");
      } catch (error) {
        console.log("[Permissions] Camera permission denied:", error);
        localStorage.setItem(CAMERA_GRANTED_KEY, "false");
        cameraGranted = false;
      }
    }

    // Only request notifications if not already granted
    if (!notificationsGranted) {
      try {
        if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          notificationsGranted = permission === "granted";
          
          if (notificationsGranted && user?.id) {
            // Also subscribe to push notifications
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
  }, [state.camera, state.notifications, user?.id]);

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
