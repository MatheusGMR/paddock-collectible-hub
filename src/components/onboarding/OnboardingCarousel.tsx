import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { OnboardingSlide } from "./OnboardingSlide";
import { PricingSlide } from "./PricingSlide";
import paddockLogo from "@/assets/paddock-logo.png";

interface OnboardingCarouselProps {
  onStartTrial: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export const OnboardingCarousel = ({ onStartTrial, onSkip, isLoading }: OnboardingCarouselProps) => {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    dragFree: false,
  });

  const slides = [
    {
      title: t.onboarding.slide1Title,
      description: t.onboarding.slide1Text,
    },
    {
      title: t.onboarding.slide3Title,
      description: t.onboarding.slide3Text,
    },
    {
      title: t.onboarding.slide2Title,
      description: t.onboarding.slide2Text,
    },
    {
      title: t.onboarding.slide4Title,
      description: t.onboarding.slide4Text,
    },
  ];

  const totalSlides = slides.length + 1; // +1 for pricing slide
  const isPricingSlide = currentSlide === slides.length;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setCurrentSlide(index);
    
    // Hide swipe hint after first interaction
    if (index > 0) {
      setShowSwipeHint(false);
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-hide swipe hint after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeHint(false);
    }, 4000);
    
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col pt-safe"
    >
      {/* Header with Logo - with extra top padding for notch */}
      <div className="flex items-center justify-center p-4 pt-2">
        <img src={paddockLogo} alt="Paddock" className="w-10 h-10" />
      </div>

      {/* Swipeable Carousel */}
      <div className="flex-1 overflow-hidden relative" ref={emblaRef}>
        <div className="flex h-full">
          {slides.map((slide, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
              <OnboardingSlide {...slide} slideIndex={index} />
            </div>
          ))}
          {/* Pricing Slide */}
          <div className="flex-[0_0_100%] min-w-0 h-full">
            <PricingSlide
              onStartTrial={onStartTrial}
              isLoading={isLoading}
            />
          </div>
        </div>
        
        {/* Swipe Hint Indicator */}
        <AnimatePresence>
          {showSwipeHint && currentSlide === 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground pointer-events-none"
            >
              <motion.div
                animate={{ x: [-8, 0, -8] }}
                transition={{ 
                  duration: 1.2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center"
              >
                <ChevronLeft className="w-6 h-6" />
                <ChevronLeft className="w-6 h-6 -ml-4 opacity-60" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      <div className="p-6 pb-safe">
        <div className="flex justify-center gap-2 pb-4">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
