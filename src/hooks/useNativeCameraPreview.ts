import { useCallback, useMemo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { CameraPreview, CameraPreviewOptions, CameraPreviewPictureOptions } from "@capgo/camera-preview";

export interface NativeCameraPreviewResult {
  base64Image: string;
}

/**
 * Hook for using embedded camera preview on iOS/Android via @capgo/camera-preview
 * This provides a live camera feed rendered behind the WebView for an immersive experience
 * Includes setFocus support for tap-to-focus
 */
export const useNativeCameraPreview = () => {
  const isNative = Capacitor.isNativePlatform();
  const isStartedRef = useRef(false);

  const getPreviewSize = useCallback(() => {
    const platform = Capacitor.getPlatform();
    // On iOS, window.innerHeight may exclude safe area insets.
    // Use screen dimensions to ensure the camera preview covers the entire display including safe areas.
    const width = Math.round(
      platform === "ios"
        ? Math.max(window.innerWidth, screen.width, document.documentElement.clientWidth || 390)
        : window.innerWidth || document.documentElement.clientWidth || 390
    );
    const height = Math.round(
      platform === "ios"
        ? Math.max(window.innerHeight, screen.height, document.documentElement.clientHeight || 844)
        : window.innerHeight || document.documentElement.clientHeight || 844
    );

    return {
      width,
      height,
      platform,
    };
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      console.log("[CameraPreview] Not on native platform, skipping");
      return false;
    }

    try {
      console.log("[CameraPreview] Starting camera preview...");

      // Always do a hard restart to avoid stale native sessions after capture/reset
      if (isStartedRef.current) {
        console.log("[CameraPreview] Restarting existing preview session...");
        try {
          await CameraPreview.stop();
        } catch (stopError) {
          console.warn("[CameraPreview] Stop before restart failed:", stopError);
        }
        isStartedRef.current = false;
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      const { width, height, platform } = getPreviewSize();

      const container = document.getElementById("camera-preview-container");
      if (container) {
        container.style.display = "";
        container.style.width = "100vw";
        container.style.height = "100dvh";
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.right = "0";
        container.style.bottom = "0";
      }

      const options: CameraPreviewOptions = {
        position: "rear",
        toBack: true,
        parent: "camera-preview-container",
        className: "camera-preview",
        disableAudio: true,
        storeToFile: false,
        x: 0,
        y: 0,
        width,
        height,
        enableOpacity: true,
        enableZoom: true,
        lockAndroidOrientation: platform === "android",
      } as any;

      console.log("[CameraPreview] Starting with options:", JSON.stringify({ width, height, platform }));

      const startedBounds = await CameraPreview.start(options);
      console.log("[CameraPreview] Started bounds:", JSON.stringify(startedBounds));

      isStartedRef.current = true;
      console.log("[CameraPreview] Camera preview started successfully", startedBounds);
      return true;
    } catch (error) {
      console.error("[CameraPreview] Error starting camera:", error);
      isStartedRef.current = false;
      return false;
    }
  }, [getPreviewSize, isNative]);

  const stop = useCallback(async (): Promise<void> => {
    if (!isNative) return;

    if (!isStartedRef.current) {
      console.log("[CameraPreview] Not started, skipping stop");
      return;
    }

    try {
      console.log("[CameraPreview] Stopping camera preview...");
      await CameraPreview.stop();
      isStartedRef.current = false;
      console.log("[CameraPreview] Camera preview stopped");
    } catch (error) {
      console.error("[CameraPreview] Error stopping camera:", error);
      isStartedRef.current = false;
    }
  }, [isNative]);

  const capture = useCallback(async (): Promise<NativeCameraPreviewResult | null> => {
    if (!isNative) {
      console.log("[CameraPreview] Not on native platform");
      return null;
    }

    if (!isStartedRef.current) {
      console.log("[CameraPreview] Camera not started");
      return null;
    }

    try {
      console.log("[CameraPreview] Capturing photo...");

      const options: CameraPreviewPictureOptions = {
        quality: 90,
      };

      const result = await CameraPreview.capture(options);

      if (!result.value) {
        console.error("[CameraPreview] No image data returned");
        return null;
      }

      console.log("[CameraPreview] Photo captured successfully");

      return {
        base64Image: `data:image/jpeg;base64,${result.value}`,
      };
    } catch (error) {
      console.error("[CameraPreview] Error capturing photo:", error);
      return null;
    }
  }, [isNative]);

  const flip = useCallback(async (): Promise<void> => {
    if (!isNative || !isStartedRef.current) return;

    try {
      console.log("[CameraPreview] Flipping camera...");
      await CameraPreview.flip();
      console.log("[CameraPreview] Camera flipped");
    } catch (error) {
      console.error("[CameraPreview] Error flipping camera:", error);
    }
  }, [isNative]);

  /**
   * Set focus point on the camera (tap-to-focus)
   * @param x normalized x coordinate (0-1) relative to preview bounds
   * @param y normalized y coordinate (0-1) relative to preview bounds
   */
  const setFocus = useCallback(async (x: number, y: number): Promise<void> => {
    if (!isNative || !isStartedRef.current) return;

    try {
      console.log(`[CameraPreview] Setting focus at (${x.toFixed(2)}, ${y.toFixed(2)})`);
      await CameraPreview.setFocus({ x, y });
      console.log("[CameraPreview] Focus set successfully");
    } catch (error) {
      console.error("[CameraPreview] Error setting focus:", error);
    }
  }, [isNative]);

  return useMemo(
    () => ({
      isNative,
      start,
      stop,
      capture,
      flip,
      setFocus,
      get isStarted() {
        return isStartedRef.current;
      },
    }),
    [isNative, start, stop, capture, flip, setFocus]
  );
};
