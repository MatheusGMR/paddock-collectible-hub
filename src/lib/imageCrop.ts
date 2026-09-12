export interface BoundingBox {
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage of image width
  height: number; // percentage of image height
}

/**
 * Crop an image based on a bounding box (percentage coordinates)
 * Returns a base64 data URL of the cropped image
 */
const sanitizeBox = (box: BoundingBox): BoundingBox | null => {
  if (!box) return null;
  let { x, y, width, height } = box;
  if (![x, y, width, height].every((v) => typeof v === "number" && Number.isFinite(v))) return null;

  // Some models return normalized 0-1 coordinates instead of percentages
  if (width <= 1 && height <= 1 && x <= 1 && y <= 1) {
    x *= 100; y *= 100; width *= 100; height *= 100;
  }

  x = Math.min(Math.max(x, 0), 100);
  y = Math.min(Math.max(y, 0), 100);
  width = Math.min(Math.max(width, 0), 100 - x);
  height = Math.min(Math.max(height, 0), 100 - y);

  // Degenerate/invisible region -> caller should keep original image
  if (width < 3 || height < 3) return null;

  return { x, y, width, height };
};

/**
 * Crop an image based on a bounding box (percentage coordinates)
 * Returns a base64 data URL of the cropped image.
 * Falls back to the original image whenever the region would be empty/black.
 */
export const cropImageByBoundingBox = (
  imageBase64: string,
  boundingBox: BoundingBox
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const safeBox = sanitizeBox(boundingBox);
    if (!safeBox) {
      resolve(imageBase64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(imageBase64);
          return;
        }

        // Convert percentage to pixels, clamped to the real image bounds
        let x = Math.round((safeBox.x / 100) * img.width);
        let y = Math.round((safeBox.y / 100) * img.height);
        let width = Math.round((safeBox.width / 100) * img.width);
        let height = Math.round((safeBox.height / 100) * img.height);

        x = Math.min(Math.max(x, 0), Math.max(img.width - 1, 0));
        y = Math.min(Math.max(y, 0), Math.max(img.height - 1, 0));
        width = Math.min(width, img.width - x);
        height = Math.min(height, img.height - y);

        // Too small to be a usable photo of the car: keep the original
        if (width < 24 || height < 24) {
          resolve(imageBase64);
          return;
        }

        canvas.width = width;
        canvas.height = height;

        // White base so any transparent/edge area never renders as black
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
        // Guard against empty canvas output
        resolve(croppedBase64 && croppedBase64.length > 1000 ? croppedBase64 : imageBase64);
      } catch (error) {
        console.error("[imageCrop] Crop failed, using original:", error);
        resolve(imageBase64);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for cropping"));
    };

    img.crossOrigin = "anonymous";
    img.src = imageBase64;
  });
};


/**
 * Crop multiple regions from a single image
 */
export const cropMultipleRegions = async (
  imageBase64: string,
  boundingBoxes: BoundingBox[]
): Promise<string[]> => {
  const results: string[] = [];
  
  for (const box of boundingBoxes) {
    try {
      const cropped = await cropImageByBoundingBox(imageBase64, box);
      results.push(cropped);
    } catch (error) {
      console.error("Failed to crop region:", error);
      // Fall back to original image if crop fails
      results.push(imageBase64);
    }
  }
  
  return results;
};

/**
 * Extract a frame from a video blob at a specific time (or first frame)
 * Returns a base64 data URL of the extracted frame
 */
export const extractFrameFromVideo = (
  videoBlob: Blob,
  timeInSeconds: number = 0.5
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoBlob);
    
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // Seek to the specified time (or 0.5s by default to skip any initial black frames)
      const seekTime = Math.min(timeInSeconds, video.duration * 0.5);
      video.currentTime = seekTime;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const frameBase64 = canvas.toDataURL("image/jpeg", 0.85);
        
        URL.revokeObjectURL(url);
        resolve(frameBase64);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video for frame extraction"));
    };
    
    // Start loading the video
    video.load();
  });
};
