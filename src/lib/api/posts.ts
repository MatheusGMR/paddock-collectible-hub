import { supabase } from "@/integrations/supabase/client";

interface CreatePostParams {
  userId: string;
  imageUrl: string;
  caption?: string;
  collectionItemId?: string;
}

/**
 * Create a new post in the feed
 */
export async function createPost({
  userId,
  imageUrl,
  caption,
  collectionItemId,
}: CreatePostParams): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        image_url: imageUrl,
        caption: caption || null,
        collection_item_id: collectionItemId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating post:", error);
      return { success: false, error: error.message };
    }

    return { success: true, postId: data.id };
  } catch (error) {
    console.error("Error creating post:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}

/**
 * Upload an image to storage and get the public URL
 */
export async function uploadPostImage(
  userId: string,
  imageBase64: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Convert base64 to blob
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/jpeg" });

    // Generate unique filename
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(fileName, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload image",
    };
  }
}

/**
 * Upload a video to storage and get the public URL
 */
export async function uploadPostVideo(
  userId: string,
  videoBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate unique filename
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webm`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(fileName, videoBlob, {
        contentType: "video/webm",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading video:", error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(data.path);

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error("Error uploading video:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload video",
    };
  }
}
