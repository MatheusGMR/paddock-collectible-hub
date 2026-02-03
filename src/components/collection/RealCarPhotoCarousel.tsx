import { useState, useEffect } from "react";
import { Images, Car, Loader2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface RealCarPhotoCarouselProps {
  photos: string[];
  carName: string;
  carBrand?: string;
  carModel?: string;
}

// Only use photos that are provided - no fallback to random images
// The AI analysis should provide real car photos, if not available we simply don't show this section

export const RealCarPhotoCarousel = ({ 
  photos, 
  carName,
  carBrand,
  carModel 
}: RealCarPhotoCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [displayPhotos, setDisplayPhotos] = useState<string[]>([]);

  // Only use valid provided photos - no fallbacks to random images
  useEffect(() => {
    if (photos && photos.length > 0) {
      // Filter out obviously invalid URLs
      const validPhotos = photos.filter(url => 
        url && 
        (url.startsWith('http://') || url.startsWith('https://')) &&
        !url.includes('example.com') &&
        !url.includes('placeholder') &&
        !url.includes('picsum.photos') // No random placeholder images
      );
      
      setDisplayPhotos(validPhotos);
    } else {
      setDisplayPhotos([]);
    }
  }, [photos]);

  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    // Simply mark as failed - no fallback to random images
    setFailedImages(prev => new Set(prev).add(index));
  };

  if (displayPhotos.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Images className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Fotos do Veículo Real</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {current + 1} / {displayPhotos.length}
        </span>
      </div>

      {/* Carousel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {displayPhotos.map((photo, idx) => (
            <CarouselItem key={idx} className="pl-2 basis-[85%]">
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 relative">
                {/* Loading state */}
                {!loadedImages.has(idx) && !failedImages.has(idx) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  </div>
                )}
                
                {/* Failed state */}
                {failedImages.has(idx) && !loadedImages.has(idx) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
                    <Car className="h-10 w-10 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">Imagem indisponível</span>
                  </div>
                )}
                
                <img
                  src={photo}
                  alt={`${carName} - Foto ${idx + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    loadedImages.has(idx) ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={() => handleImageLoad(idx)}
                  onError={() => handleImageError(idx)}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5">
        {displayPhotos.map((_, idx) => (
          <button
            key={idx}
            onClick={() => api?.scrollTo(idx)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-200",
              idx === current
                ? "bg-primary w-4"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Ir para foto ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};