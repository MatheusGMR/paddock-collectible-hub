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

      // Wrap in timeout to prevent hanging requests
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000); // 90s timeout

      try {
        const { data, error } = await supabase.functions.invoke("analyze-collectible", {
          body: {
            imageBase64: optimizedBase64,
            skipML: true,
            vehicleCount: confirmedVehicleCount,
            skipVehicleDetectionValidation: Boolean(confirmedVehicleCount && confirmedVehicleCount > 0),
          },
        });

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = data as any;
        const rawItems: any[] = Array.isArray(raw?.items) ? raw.items : [];
        const responseType = raw?.detectedType || "collectible";

        console.log("[BatchProcessing] Response:", { identified: raw?.identified, count: raw?.count, itemsLength: rawItems.length, responseType });

        // For real cars, return empty (handled separately in dedicated flow)
        if (responseType === "real_car") {
          console.log("[BatchProcessing] Real car detected, skipping");
          return [];
        }

        // Normalize items from various AI response shapes
        const items: AnalysisResult[] = rawItems
          .filter((item: any) => item != null && typeof item === 'object')
          .map((item: any) => {
            const realCar = item.realCar || item.real_car || item.car || {};
            const collectible = item.collectible || {};
            const rawMV = item.marketValue || item.market_value || {};
            const marketValue = (rawMV.min != null && rawMV.max != null) ? {
              min: Number(rawMV.min),
              max: Number(rawMV.max),
              currency: rawMV.currency || 'BRL',
              source: rawMV.source || '',
              confidence: rawMV.confidence || 'low',
            } : undefined;

            return {
              ...item,
              realCar: {
                brand: realCar.brand || item.brand || 'Desconhecido',
                model: realCar.model || item.model || 'Desconhecido',
                year: realCar.year || item.year || '',
                historicalFact: realCar.historicalFact || realCar.historical_fact || '',
              },
              collectible: {
                manufacturer: collectible.manufacturer || '',
                scale: collectible.scale || '',
                estimatedYear: collectible.estimatedYear || collectible.estimated_year || collectible.year || '',
                origin: collectible.origin || '',
                series: collectible.series || '',
                condition: collectible.condition || '',
                color: collectible.color || item.color || '',
                notes: collectible.notes || '',
              },
              marketValue,
            } as AnalysisResult;
          });

        const identified = Boolean(raw?.identified) || items.length > 0;

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
                return { ...item, croppedImage: mediaBase64 };
              }
            }
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
      } finally {
        clearTimeout(timeout);
      }
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
        console.error("[BatchProcessing] Analysis error for media:", media.id, error);
        return {
          ...media,
          status: "error",
          error: error instanceof Error ? error.message : "Falha na análise",
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

        // Process chunk in parallel using allSettled to never lose partial results
        const chunkSettled = await Promise.allSettled(
          chunk.map((media) => processMediaItem(media))
        );

        // Update results - handle both fulfilled and rejected
        chunkSettled.forEach((settled, chunkIdx) => {
          const globalIdx = i + chunkIdx;
          if (settled.status === "fulfilled") {
            results[globalIdx] = settled.value;
            onMediaUpdate(settled.value);
          } else {
            // Even if Promise itself rejected (shouldn't happen, but safety net)
            const errorMedia: QueuedMedia = {
              ...results[globalIdx],
              status: "error",
              error: String(settled.reason ?? "Falha inesperada"),
            };
            results[globalIdx] = errorMedia;
            onMediaUpdate(errorMedia);
          }
          processedCount++;
          onProgress(processedCount, queue.length);
        });

        // Small delay between chunks to avoid rate limiting
        if (i + PARALLEL_PROCESSING_LIMIT < queue.length && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 500));
        }
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
