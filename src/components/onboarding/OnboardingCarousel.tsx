import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
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
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    onSelect();
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header with Logo */}
      <div className="flex items-center justify-between p-4">
        <img src={paddockLogo} alt="Paddock" className="w-10 h-10" />
        
        {!isPricingSlide && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            {t.onboarding.skip}
          </Button>
        )}
      </div>

      {/* Swipeable Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
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
              onSkip={onSkip}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="p-6 pb-10">
        <div className="flex justify-center gap-2">
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
