import { useState, useRef } from "react";
import { Camera, ChevronLeft, ChevronRight, X, ZoomIn, ExternalLink, Sparkles } from "lucide-react";
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

// Photo type labels for display (all in Portuguese)
const photoLabels = [
  "Destaque",
  "Em Movimento",
  "Clássica",
  "Detalhes",
  "Ambiente"
];

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
      scrollContainerRef.current.scrollBy({ left: -180, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 180, behavior: 'smooth' });
    }
  };

  const openFullscreen = (index: number) => {
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

  // Get visual index for a photo (accounting for failed images)
  const getVisualIndex = (index: number) => {
    return photos.slice(0, index + 1).filter((_, i) => !failedImages.has(i)).length - 1;
  };

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">O Carro Real</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {validPhotos.length} fotos
          </span>
        </div>

        {/* Horizontal scroll gallery */}
        <div className="relative -mx-6">
          {/* Navigation arrows for desktop */}
          {validPhotos.length > 2 && (
            <>
              <button
                onClick={scrollLeft}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hidden sm:flex"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={scrollRight}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hidden sm:flex"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </>
          )}

          {/* Photos container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-3 px-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          >
            {photos.map((url, index) => {
              if (failedImages.has(index)) return null;
              
              const visualIndex = getVisualIndex(index);
              const label = photoLabels[visualIndex] || `Foto ${visualIndex + 1}`;
              
              return (
                <button
                  key={index}
                  onClick={() => openFullscreen(visualIndex)}
                  className="group relative flex-shrink-0 snap-start first:pl-0"
                >
                  {/* Image container with elegant aspect ratio */}
                  <div className="relative w-44 aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`${carName} - ${label}`}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
                        loadedImages.has(index) ? "opacity-100" : "opacity-0"
                      )}
                      onLoad={() => handleImageLoad(index)}
                      onError={() => handleImageError(index)}
                    />
                    
                    {/* Loading skeleton */}
                    {!loadedImages.has(index) && !failedImages.has(index) && (
                      <div className="absolute inset-0 bg-muted animate-pulse" />
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Zoom icon on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Label badge at bottom */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-xs font-medium text-white/90 drop-shadow-lg">
                        {label}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
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
                    {selectedIndex !== null && (
                      <>
                        {photoLabels[getVisualIndex(selectedIndex)] || `Foto ${getVisualIndex(selectedIndex) + 1}`}
                        {" • "}
                        {getVisualIndex(selectedIndex) + 1} de {validPhotos.length}
                      </>
                    )}
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
