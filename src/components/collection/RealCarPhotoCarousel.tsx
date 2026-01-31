import { useState } from "react";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface RealCarPhotoCarouselProps {
  photos: string[];
  carName: string;
}

export const RealCarPhotoCarousel = ({ photos, carName }: RealCarPhotoCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = () => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  };

  // Subscribe to carousel events
  useState(() => {
    if (!api) return;
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  });

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Images className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Fotos do Veículo Real</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {current + 1} / {photos.length}
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
          {photos.map((photo, idx) => (
            <CarouselItem key={idx} className="pl-2 basis-[85%]">
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-muted">
                <img
                  src={photo}
                  alt={`${carName} - Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5">
        {photos.map((_, idx) => (
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
