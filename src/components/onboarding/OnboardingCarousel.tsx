import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, FolderHeart, TrendingUp, ShoppingBag, ChevronRight } from "lucide-react";
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

  const slides = [
    {
      icon: ScanLine,
      title: t.onboarding.slide1Title,
      description: t.onboarding.slide1Text,
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      icon: FolderHeart,
      title: t.onboarding.slide2Title,
      description: t.onboarding.slide2Text,
      gradient: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      title: t.onboarding.slide3Title,
      description: t.onboarding.slide3Text,
      gradient: "bg-gradient-to-br from-green-500 to-emerald-500",
    },
    {
      icon: ShoppingBag,
      title: t.onboarding.slide4Title,
      description: t.onboarding.slide4Text,
      gradient: "bg-gradient-to-br from-orange-500 to-red-500",
    },
  ];

  const totalSlides = slides.length + 1; // +1 for pricing slide
  const isPricingSlide = currentSlide === slides.length;

  const goToNext = useCallback(() => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  }, [currentSlide, totalSlides]);

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

      {/* Slide Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {isPricingSlide ? (
              <PricingSlide
                onStartTrial={onStartTrial}
                onSkip={onSkip}
                isLoading={isLoading}
              />
            ) : (
              <OnboardingSlide {...slides[currentSlide]} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots & Button */}
      <div className="p-6 pb-10">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* Next Button (only on feature slides) */}
        {!isPricingSlide && (
          <Button
            onClick={goToNext}
            className="w-full h-14 text-lg font-semibold"
          >
            {t.common.next}
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};
