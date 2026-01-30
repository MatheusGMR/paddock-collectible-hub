import { useState } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealCarPhotosProps {
  photos: string[];
  carName: string;
}

export const RealCarPhotos = ({ photos, carName }: RealCarPhotosProps) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  if (!photos || photos.length === 0) return null;

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  const validPhotos = photos.filter((_, index) => !failedImages.has(index));

  if (validPhotos.length === 0) return null;

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs text-primary font-semibold">Fotos do Veículo Real</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {photos.map((url, index) => (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-muted",
              failedImages.has(index) && "hidden"
            )}
          >
            <img
              src={url}
              alt={`${carName} - ${index + 1}`}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                loadedImages.has(index) ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
            />
            {!loadedImages.has(index) && !failedImages.has(index) && (
              <div className="w-full h-full bg-muted animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
