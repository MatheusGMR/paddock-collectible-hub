import { useState, useCallback, useEffect } from "react";
import { subscribeToPush } from "@/lib/pushNotifications";
import { useAuth } from "@/contexts/AuthContext";

type PermissionState = "prompt" | "granted" | "denied";

interface PermissionsState {
  camera: PermissionState;
  notifications: PermissionState;
  allGranted: boolean;
  isRequesting: boolean;
}

const PERMISSIONS_STORAGE_KEY = "paddock_permissions_requested";

export const usePermissions = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PermissionsState>({
    camera: "prompt",
    notifications: "prompt",
    allGranted: false,
    isRequesting: false,
  });

  // Check current permission states on mount
  useEffect(() => {
    const checkPermissions = async () => {
      let cameraState: PermissionState = "prompt";
      let notificationState: PermissionState = "prompt";

      // Check camera permission
      try {
        const cameraPermission = await navigator.permissions.query({ 
          name: "camera" as PermissionName 
        });
        cameraState = cameraPermission.state as PermissionState;
      } catch {
        // Fallback: check if we've previously requested
        const requested = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
        if (requested) {
          cameraState = "granted"; // Assume granted if previously requested
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
        // Request camera permission by getting a stream briefly - NO AUDIO to avoid iOS issues
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false, // Don't request audio - causes permission issues on iOS
        });
        
        // Immediately stop the stream - we just needed permission
        stream.getTracks().forEach(track => track.stop());
        cameraGranted = true;
        
        console.log("[Permissions] Camera permission granted");
      } catch (error) {
        console.log("[Permissions] Camera permission denied:", error);
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

  return {
    ...state,
    requestAllPermissions,
    hasRequestedPermissions,
  };
};
