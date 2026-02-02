import { useState, useEffect } from "react";
import { Loader2, Lightbulb, Video } from "lucide-react";
import { getRandomFacts, CollectibleFact } from "@/data/collectibleFacts";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoadingFactsProps {
  isVideo?: boolean;
}

export function LoadingFacts({ isVideo = false }: LoadingFactsProps) {
  const [facts, setFacts] = useState<CollectibleFact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { language } = useLanguage();

  // Estimated processing time (photos ~5s, videos ~12s)
  const estimatedTime = isVideo ? 12000 : 5000;

  useEffect(() => {
    // Get 5 random facts when component mounts
    setFacts(getRandomFacts(5));
  }, []);

  // Progress bar animation
  useEffect(() => {
    setProgress(0);
    
    // Animate progress smoothly
    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      // Use easing function to slow down as it approaches 90%
      // Never reaches 100% until actual completion
      const rawProgress = elapsed / estimatedTime;
      const easedProgress = 1 - Math.pow(1 - Math.min(rawProgress, 0.95), 2);
      setProgress(Math.min(easedProgress * 95, 95));
    };

    const interval = setInterval(updateProgress, 100);
    
    return () => clearInterval(interval);
  }, [estimatedTime]);

  useEffect(() => {
    if (facts.length === 0) return;

    // Rotate facts every 4 seconds
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % facts.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [facts.length]);

  const currentFact = facts[currentIndex];
  const factText = currentFact
    ? language === "pt-BR"
      ? currentFact.text
      : currentFact.textEn
    : "";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
      {/* Progress bar at top - subtle */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div 
          className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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

      {/* Fact Card */}
      {currentFact && (
        <div className="mx-6 max-w-sm">
          <div 
            className={`bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 transition-all duration-300 ${
              isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-amber-500/20 rounded-full">
                <Lightbulb className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-amber-400">
                {language === "pt-BR" ? "Você Sabia?" : "Did You Know?"}
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {factText}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {facts.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
