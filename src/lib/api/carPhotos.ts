import { supabase } from "@/integrations/supabase/client";

interface FetchCarPhotosResponse {
  photos: string[];
  source: string;
  count: number;
  error?: string;
}

/**
 * Fetch real car photos from Wikimedia Commons
 * This replaces the AI-generated URLs with actual working image URLs
 */
export async function fetchRealCarPhotos(
  brand: string,
  model: string,
  year?: string
): Promise<string[]> {
  try {
    console.log(`[carPhotos] Fetching photos for: ${brand} ${model} ${year || ""}`);
    
    const { data, error } = await supabase.functions.invoke<FetchCarPhotosResponse>(
      "fetch-car-photos",
      {
        body: { brand, model, year },
      }
    );

    if (error) {
      console.error("[carPhotos] Error fetching photos:", error);
      return [];
    }

    if (data?.photos && data.photos.length > 0) {
      console.log(`[carPhotos] Found ${data.photos.length} photos`);
      return data.photos;
    }

    console.log("[carPhotos] No photos found");
    return [];
  } catch (err) {
    console.error("[carPhotos] Exception:", err);
    return [];
  }
}

/**
 * Enrich analysis results with real car photos
 * This should be called after AI analysis to replace empty/invalid photo URLs
 */
export async function enrichResultsWithPhotos<T extends {
  realCar: { brand: string; model: string; year: string };
  realCarPhotos?: string[];
}>(results: T[]): Promise<T[]> {
  return Promise.all(
    results.map(async (result) => {
      // Skip if photos already exist and are valid
      if (result.realCarPhotos && result.realCarPhotos.length > 0) {
        // Validate first photo URL
        try {
          const testUrl = result.realCarPhotos[0];
          if (testUrl && testUrl.startsWith("http")) {
            // URLs seem valid, keep them
            return result;
          }
        } catch {
          // Invalid URLs, fetch new ones
        }
      }

      // Fetch real photos
      const photos = await fetchRealCarPhotos(
        result.realCar.brand,
        result.realCar.model,
        result.realCar.year
      );

      return {
        ...result,
        realCarPhotos: photos,
      };
    })
  );
}
