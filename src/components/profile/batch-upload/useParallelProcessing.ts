import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cropImageByBoundingBox, BoundingBox } from "@/lib/imageCrop";
import { checkDuplicateInCollection } from "@/lib/database";
import {
  QueuedMedia,
  AnalysisResult,
  PARALLEL_PROCESSING_LIMIT,
} from "./types";

/** Downscale a base64 image to reduce payload size before API call */
function downscaleBase64(base64: string, maxDim = 800, quality = 0.70): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) { resolve(base64); return; }
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

interface UseParallelProcessingProps {
  userId: string | undefined;
  onProgress: (current: number, total: number) => void;
  onMediaUpdate: (media: QueuedMedia) => void;
}

export function useParallelProcessing({
  userId,
  onProgress,
  onMediaUpdate,
}: UseParallelProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const abortRef = useRef(false);

  /** Quick count: detect number of vehicles per image (fast & cheap) */
  const quickCountQueue = useCallback(
    async (queue: QueuedMedia[]): Promise<QueuedMedia[]> => {
      setIsCounting(true);
      abortRef.current = false;

      const results: QueuedMedia[] = [...queue];

      for (let i = 0; i < queue.length; i += PARALLEL_PROCESSING_LIMIT) {
        if (abortRef.current) break;

        const chunk = queue.slice(i, i + PARALLEL_PROCESSING_LIMIT);
        const chunkIndices = chunk.map((_, idx) => i + idx);

        // Mark as counting
        chunkIndices.forEach((idx) => {
          results[idx] = { ...results[idx], status: "counting" };
          onMediaUpdate(results[idx]);
        });

        const chunkResults = await Promise.all(
          chunk.map(async (media) => {
            try {
              const optimized = media.isVideo
                ? media.base64
                : await downscaleBase64(media.base64, 800, 0.70);

              const { data, error } = await supabase.functions.invoke("analyze-collectible", {
                body: { imageBase64: optimized, countOnly: true },
              });

              if (error) throw error;

              return {
                ...media,
                status: "counted" as const,
                vehicleCount: data?.count || 0,
                detectedVehicles: Array.isArray(data?.vehicles) ? data.vehicles : [],
              };
            } catch (err) {
              console.error("[QuickCount] Error:", err);
              return {
                ...media,
                status: "counted" as const,
                vehicleCount: 0,
                detectedVehicles: [],
              };
            }
          })
        );

        chunkResults.forEach((result, chunkIdx) => {
          const globalIdx = i + chunkIdx;
          results[globalIdx] = result;
          onMediaUpdate(result);
          onProgress(globalIdx + 1, queue.length);
        });
      }

      setIsCounting(false);
      return results;
    },
    [onProgress, onMediaUpdate]
  );

  const analyzeMedia = useCallback(
    async (
      mediaBase64: string,
      isVideo: boolean,
      confirmedVehicleCount?: number,
    ): Promise<AnalysisResult[]> => {
      // Downscale image to reduce payload and speed up transfer
      const optimizedBase64 = isVideo ? mediaBase64 : await downscaleBase64(mediaBase64, 800, 0.70);

      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: {
          imageBase64: optimizedBase64,
          skipML: true,
          vehicleCount: confirmedVehicleCount,
          skipVehicleDetectionValidation: Boolean(confirmedVehicleCount && confirmedVehicleCount > 0),
        },
      });

      if (error) throw error;

      // Normalize response - sometimes AI returns items but count=0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      const items: AnalysisResult[] = Array.isArray(raw?.items) ? raw.items : [];
      const count = typeof raw?.count === "number" && raw.count > 0 ? raw.count : items.length;
      const identified = Boolean(raw?.identified) || items.length > 0;
      const responseType = raw?.detectedType || "collectible";

      console.log("[BatchProcessing] Response:", { identified, count, itemsLength: items.length, responseType });

      // For real cars, return empty (handled separately in dedicated flow)
      if (responseType === "real_car") {
        console.log("[BatchProcessing] Real car detected, skipping");
        return [];
      }

      // Only skip if truly unidentified AND no items
      if (!identified && items.length === 0) {
        console.log("[BatchProcessing] Not identified and no items");
        return [];
      }

      // Crop individual car images (only for images, not videos)
      const itemsWithCrops = await Promise.all(
        items.map(async (item) => {
          if (!isVideo && item.boundingBox && mediaBase64) {
            try {
              const croppedImage = await cropImageByBoundingBox(
                mediaBase64,
                item.boundingBox as BoundingBox
              );
              console.log("[BatchProcessing] Cropped image for", item.realCar?.brand, item.realCar?.model);
              return { ...item, croppedImage };
            } catch (error) {
              console.error("[BatchProcessing] Failed to crop image:", error);
              // Fallback to original image
              return { ...item, croppedImage: mediaBase64 };
            }
          }
          // For videos or items without bounding box, use original
          return { ...item, croppedImage: isVideo ? undefined : mediaBase64 };
        })
      );

      // Check for duplicates
      const itemsWithDuplicateCheck = await Promise.all(
        itemsWithCrops.map(async (item) => {
          if (userId) {
            try {
              const duplicate = await checkDuplicateInCollection(
                userId,
                item.realCar.brand,
                item.realCar.model,
                item.collectible?.color
              );
              return {
                ...item,
                isDuplicate: duplicate.isDuplicate,
                existingItemImage: duplicate.existingItemImage,
              };
            } catch (error) {
              console.error("Failed to check duplicate:", error);
              return item;
            }
          }
          return item;
        })
      );

      return itemsWithDuplicateCheck;
    },
    [userId]
  );

  const processMediaItem = useCallback(
    async (media: QueuedMedia): Promise<QueuedMedia> => {
      try {
        const results = await analyzeMedia(media.base64, media.isVideo, media.vehicleCount);
        return {
          ...media,
          status: "success",
          results,
        };
      } catch (error) {
        console.error("Analysis error:", error);
        return {
          ...media,
          status: "error",
          error: "Falha na análise",
        };
      }
    },
    [analyzeMedia]
  );

  const processQueue = useCallback(
    async (queue: QueuedMedia[]): Promise<QueuedMedia[]> => {
      setIsProcessing(true);
      abortRef.current = false;

      const results: QueuedMedia[] = [...queue];
      let processedCount = 0;

      // Process in chunks of PARALLEL_PROCESSING_LIMIT
      for (let i = 0; i < queue.length; i += PARALLEL_PROCESSING_LIMIT) {
        if (abortRef.current) break;

        const chunk = queue.slice(i, i + PARALLEL_PROCESSING_LIMIT);
        const chunkIndices = chunk.map((_, idx) => i + idx);

        // Mark chunk as analyzing
        chunkIndices.forEach((idx) => {
          results[idx] = { ...results[idx], status: "analyzing" };
          onMediaUpdate(results[idx]);
        });

        // Process chunk in parallel
        const chunkResults = await Promise.all(
          chunk.map((media) => processMediaItem(media))
        );

        // Update results
        chunkResults.forEach((result, chunkIdx) => {
          const globalIdx = i + chunkIdx;
          results[globalIdx] = result;
          onMediaUpdate(result);
          processedCount++;
          onProgress(processedCount, queue.length);
        });
      }

      setIsProcessing(false);
      return results;
    },
    [processMediaItem, onProgress, onMediaUpdate]
  );

  const cancelProcessing = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    isProcessing,
    isCounting,
    processQueue,
    quickCountQueue,
    cancelProcessing,
  };
}
