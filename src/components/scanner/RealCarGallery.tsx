import { useState, useRef, useEffect } from "react";
import { Camera, ChevronLeft, ChevronRight, X, ZoomIn, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface RealCarGalleryProps {
  photos: string[];
  carName: string;
}

export const RealCarGallery = ({ photos, carName }: RealCarGalleryProps) => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!photos || photos.length === 0) return null;

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => new Set(prev).add(index));
  };

  const validPhotos = photos.filter((_, index) => !failedImages.has(index));

  if (validPhotos.length === 0) return null;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const openFullscreen = (index: number) => {
    // Map the visual index to the actual photo index (accounting for failed images)
    const actualIndex = photos.findIndex((_, i) => !failedImages.has(i) && 
      photos.slice(0, i + 1).filter((_, j) => !failedImages.has(j)).length === index + 1
    );
    setSelectedIndex(actualIndex >= 0 ? actualIndex : index);
  };

  const navigateFullscreen = (direction: 'prev' | 'next') => {
    if (selectedIndex === null) return;
    
    const validIndices = photos.map((_, i) => i).filter(i => !failedImages.has(i));
    const currentPos = validIndices.indexOf(selectedIndex);
    
    if (direction === 'prev' && currentPos > 0) {
      setSelectedIndex(validIndices[currentPos - 1]);
    } else if (direction === 'next' && currentPos < validIndices.length - 1) {
      setSelectedIndex(validIndices[currentPos + 1]);
    }
  };

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-muted/50 to-background border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
              <Camera className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">O Carro Real</p>
              <p className="text-[10px] text-muted-foreground">{validPhotos.length} fotos encontradas</p>
            </div>
          </div>
          
          {/* Navigation arrows for desktop */}
          {validPhotos.length > 2 && (
            <div className="hidden sm:flex gap-1">
              <button
                onClick={scrollLeft}
                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={scrollRight}
                className="p-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Gallery scroll */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-2 p-3 overflow-x-auto scrollbar-hide"
        >
          {photos.map((url, index) => {
            if (failedImages.has(index)) return null;
            
            const visualIndex = photos.slice(0, index + 1).filter((_, i) => !failedImages.has(i)).length - 1;
            
            return (
              <button
                key={index}
                onClick={() => openFullscreen(visualIndex)}
                className={cn(
                  "group relative flex-shrink-0 rounded-lg overflow-hidden bg-muted transition-all hover:scale-[1.02]",
                  validPhotos.length === 1 ? "w-full aspect-video" : "w-36 h-24"
                )}
              >
                <img
                  src={url}
                  alt={`${carName} - ${visualIndex + 1}`}
                  className={cn(
                    "w-full h-full object-cover transition-all",
                    loadedImages.has(index) ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => handleImageLoad(index)}
                  onError={() => handleImageError(index)}
                />
                
                {/* Loading skeleton */}
                {!loadedImages.has(index) && !failedImages.has(index) && (
                  <div className="absolute inset-0 bg-muted animate-pulse" />
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Image number badge */}
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                  {visualIndex + 1}/{validPhotos.length}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Navigation */}
            {validPhotos.length > 1 && (
              <>
                <button
                  onClick={() => navigateFullscreen('prev')}
                  className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
                  disabled={selectedIndex === photos.findIndex((_, i) => !failedImages.has(i))}
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={() => navigateFullscreen('next')}
                  className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
                  disabled={selectedIndex === photos.map((_, i) => i).filter(i => !failedImages.has(i)).pop()}
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && photos[selectedIndex] && (
              <img
                src={photos[selectedIndex]}
                alt={`${carName} - fullscreen`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{carName}</p>
                  <p className="text-white/60 text-sm">
                    {selectedIndex !== null && `Foto ${photos.slice(0, selectedIndex + 1).filter((_, i) => !failedImages.has(i)).length} de ${validPhotos.length}`}
                  </p>
                </div>
                {selectedIndex !== null && photos[selectedIndex] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => window.open(photos[selectedIndex], '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Abrir
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
