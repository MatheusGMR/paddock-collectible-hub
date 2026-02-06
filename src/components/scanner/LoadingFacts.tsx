import { useState, useEffect, useCallback } from "react";
import { Loader2, Lightbulb, Video } from "lucide-react";
import { getRandomFacts, CollectibleFact } from "@/data/collectibleFacts";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface LoadingFactsProps {
  isVideo?: boolean;
}

export function LoadingFacts({ isVideo = false }: LoadingFactsProps) {
  const [facts, setFacts] = useState<CollectibleFact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const { language } = useLanguage();

  useEffect(() => {
    // Get 5 random facts when component mounts
    setFacts(getRandomFacts(5));
  }, []);

  // Sync carousel index with state
  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrentIndex(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-rotate every 9 seconds
  useEffect(() => {
    if (!api || facts.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % facts.length;
      api.scrollTo(nextIndex);
    }, 9000);

    return () => clearInterval(interval);
  }, [api, currentIndex, facts.length]);

  const getFactText = useCallback((fact: CollectibleFact) => {
    return language === "pt-BR" ? fact.text : fact.textEn;
  }, [language]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
      {/* Spinner */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        {isVideo && <Video className="h-5 w-5 text-primary" />}
        <p className="text-lg font-medium text-white/90">
          {language === "pt-BR" 
            ? "Enquanto a mágica acontece..." 
            : "While the magic happens..."}
        </p>
      </div>

      {isVideo && (
        <p className="text-sm text-white/50 mb-6">
          {language === "pt-BR"
            ? "Vídeos podem levar até 15 segundos"
            : "Videos may take up to 15 seconds"}
        </p>
      )}

      {/* Swipeable Fact Carousel */}
      {facts.length > 0 && (
        <div className="w-full max-w-sm px-6">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {facts.map((fact, idx) => (
                <CarouselItem key={idx}>
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-amber-500/20 rounded-full">
                        <Lightbulb className="h-4 w-4 text-amber-400" />
                      </div>
                      <span className="text-sm font-semibold text-amber-400">
                        {language === "pt-BR" ? "Você Sabia?" : "Did You Know?"}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {getFactText(fact)}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {facts.map((_, idx) => (
              <button
                key={idx}
                onClick={() => api?.scrollTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to fact ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
