import { useEffect, useRef, useState, useCallback } from "react";

interface DetectionResult {
  detectedCount: number;
  isModelLoading: boolean;
  isModelReady: boolean;
}

/**
 * Hook that uses COCO-SSD to detect car-like objects in a video feed.
 * Runs entirely on-device (no API calls). Only works with web getUserMedia.
 */
export function useObjectDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
): DetectionResult {
  const [detectedCount, setDetectedCount] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const modelRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lazy-load model
  const loadModel = useCallback(async () => {
    if (modelRef.current || isModelLoading) return;
    
    setIsModelLoading(true);
    console.log("[ObjectDetection] Loading COCO-SSD model...");
    
    try {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      modelRef.current = model;
      setIsModelReady(true);
      console.log("[ObjectDetection] Model loaded successfully");
    } catch (err) {
      console.error("[ObjectDetection] Failed to load model:", err);
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelLoading]);

  useEffect(() => {
    if (!enabled) {
      // Cleanup interval when disabled
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDetectedCount(0);
      return;
    }

    loadModel();
  }, [enabled, loadModel]);

  // Run detection loop
  useEffect(() => {
    if (!enabled || !isModelReady || !modelRef.current) return;

    // Create offscreen canvas once
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    const detect = async () => {
      const video = videoRef.current;
      const model = modelRef.current;
      if (!video || !model || video.readyState < 2) return;

      try {
        const canvas = canvasRef.current!;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w === 0 || h === 0) return;

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, w, h);
        
        const predictions = await model.detect(canvas);
        
        const carClasses = new Set(["car", "truck", "bus"]);
        const cars = predictions.filter(
          (p: any) => carClasses.has(p.class) && p.score > 0.5
        );
        
        setDetectedCount(cars.length);
      } catch {
        // Silently ignore detection errors
      }
    };

    // Run immediately then every 1.5s
    detect();
    intervalRef.current = setInterval(detect, 1500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isModelReady, videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      modelRef.current = null;
      canvasRef.current = null;
    };
  }, []);

  return { detectedCount, isModelLoading, isModelReady };
}
