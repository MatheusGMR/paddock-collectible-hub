import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a base64 image to Supabase Storage and return the public URL
 * Images are stored in the 'post-images' bucket following the pattern: {userId}/{filename}
 */
export const uploadCollectionImage = async (
  userId: string,
  base64Image: string
): Promise<string | null> => {
  try {
    // Extract the base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    // Generate unique filename
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(filename, blob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[uploadCollectionImage] Upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(data.path);

    console.log("[uploadCollectionImage] Upload successful:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[uploadCollectionImage] Error:", error);
    return null;
  }
};

/**
 * Check if a string is a base64 data URI
 */
export const isBase64DataUri = (str: string | undefined | null): boolean => {
  if (!str) return false;
  return str.startsWith("data:image");
};
