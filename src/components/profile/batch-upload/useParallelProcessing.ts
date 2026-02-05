import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cropImageByBoundingBox, BoundingBox } from "@/lib/imageCrop";
import { checkDuplicateInCollection } from "@/lib/database";
import {
  QueuedMedia,
  AnalysisResult,
  MultiCarAnalysisResponse,
  PARALLEL_PROCESSING_LIMIT,
} from "./types";

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
  const abortRef = useRef(false);

  const analyzeMedia = useCallback(
    async (mediaBase64: string, isVideo: boolean): Promise<AnalysisResult[]> => {
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64: mediaBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";

      // For real cars, return empty (handled separately)
      if (responseType === "real_car") {
        return [];
      }

      // Image quality issues
      if (response.imageQuality && !response.imageQuality.isValid) {
        return [];
      }

      if (!response.identified || response.count === 0) {
        return [];
      }

      // Crop individual car images (only for images, not videos)
      const itemsWithCrops = await Promise.all(
        response.items.map(async (item) => {
          if (!isVideo && item.boundingBox && mediaBase64) {
            try {
              const croppedImage = await cropImageByBoundingBox(
                mediaBase64,
                item.boundingBox as BoundingBox
              );
              return { ...item, croppedImage };
            } catch (error) {
              console.error("Failed to crop image:", error);
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
    },
    [userId]
  );

  const processMediaItem = useCallback(
    async (media: QueuedMedia): Promise<QueuedMedia> => {
      try {
        const results = await analyzeMedia(media.base64, media.isVideo);
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
    processQueue,
    cancelProcessing,
  };
}
