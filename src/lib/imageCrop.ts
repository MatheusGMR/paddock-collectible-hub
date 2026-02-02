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
export const cropImageByBoundingBox = (
  imageBase64: string,
  boundingBox: BoundingBox
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Convert percentage to pixels
        const x = (boundingBox.x / 100) * img.width;
        const y = (boundingBox.y / 100) * img.height;
        const width = (boundingBox.width / 100) * img.width;
        const height = (boundingBox.height / 100) * img.height;

        // Set canvas size to the crop dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw the cropped portion
        ctx.drawImage(
          img,
          x, y, width, height,  // Source rectangle
          0, 0, width, height   // Destination rectangle
        );

        // Convert to base64
        const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        resolve(croppedBase64);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image for cropping"));
    };
    
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
