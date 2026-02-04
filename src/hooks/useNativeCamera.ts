import { useCallback, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export interface NativeCameraResult {
  base64Image: string;
  format: string;
}

/**
 * Hook for using native camera on iOS/Android via Capacitor
 * Returns stable references to prevent re-render loops
 */
export const useNativeCamera = () => {
  const isNative = Capacitor.isNativePlatform();

  const isAvailable = useCallback((): boolean => {
    return isNative;
  }, [isNative]);

  const takePhoto = useCallback(async (): Promise<NativeCameraResult | null> => {
    if (!isNative) {
      console.log("[NativeCamera] Not on native platform");
      return null;
    }

    try {
      console.log("[NativeCamera] Opening native camera...");
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 1280,
        height: 960,
      });

      if (!image.base64String) {
        console.error("[NativeCamera] No image data returned");
        return null;
      }

      console.log("[NativeCamera] Photo captured successfully");
      
      return {
        base64Image: `data:image/${image.format || 'jpeg'};base64,${image.base64String}`,
        format: image.format || 'jpeg',
      };
    } catch (error) {
      console.error("[NativeCamera] Error taking photo:", error);
      return null;
    }
  }, [isNative]);

  const pickFromGallery = useCallback(async (): Promise<NativeCameraResult | null> => {
    if (!isNative) {
      console.log("[NativeCamera] Not on native platform");
      return null;
    }

    try {
      console.log("[NativeCamera] Opening native gallery...");
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      });

      if (!image.base64String) {
        console.error("[NativeCamera] No image data returned");
        return null;
      }

      console.log("[NativeCamera] Photo selected successfully");
      
      return {
        base64Image: `data:image/${image.format || 'jpeg'};base64,${image.base64String}`,
        format: image.format || 'jpeg',
      };
    } catch (error) {
      console.error("[NativeCamera] Error picking photo:", error);
      return null;
    }
  }, [isNative]);

  const checkPermissions = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const permissions = await Camera.checkPermissions();
      
      if (permissions.camera === 'granted') {
        return true;
      }
      
      if (permissions.camera === 'denied') {
        console.log("[NativeCamera] Camera permission denied");
        return false;
      }
      
      // Request permission
      const requested = await Camera.requestPermissions({ permissions: ['camera'] });
      return requested.camera === 'granted';
    } catch (error) {
      console.error("[NativeCamera] Error checking permissions:", error);
      return false;
    }
  }, [isNative]);

  // Return stable object reference using useMemo
  return useMemo(() => ({
    isNative,
    isAvailable,
    takePhoto,
    pickFromGallery,
    checkPermissions,
  }), [isNative, isAvailable, takePhoto, pickFromGallery, checkPermissions]);
};
