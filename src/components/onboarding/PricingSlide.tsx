import { motion } from "framer-motion";
import { Crown, Check, Car, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";

interface PricingSlideProps {
  onStartTrial: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

export const PricingSlide = ({ onStartTrial, onSkip, isLoading }: PricingSlideProps) => {
  const { t } = useLanguage();
  const { requestAllPermissions, isRequesting } = usePermissions();

  const features = [
    t.onboarding.feature1,
    t.onboarding.feature2,
    t.onboarding.feature3,
    t.onboarding.feature4,
  ];

  const handleAcceptAndContinue = async () => {
    await requestAllPermissions();
    onStartTrial();
  };

  return (
    <div className="flex flex-col h-full px-6 py-2 text-center">
      {/* Top Section - Premium */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {/* Crown Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center mb-3 shadow-xl"
        >
          <Crown className="w-7 h-7 text-primary-foreground" />
        </motion.div>

        {/* Title - Paddock Premium */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-foreground mb-1"
        >
          {t.onboarding.pricingTitle}
        </motion.h2>

        {/* Free trial subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-muted-foreground mb-3"
        >
          {t.onboarding.freeTrial}
        </motion.p>

        {/* Price Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-4 mb-3 w-full max-w-xs shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-base text-muted-foreground line-through">
              {t.onboarding.originalPrice}
            </span>
            <span className="text-2xl font-bold text-foreground">
              {t.onboarding.discountedPrice}
            </span>
          </div>
        </motion.div>

        {/* Features List - Compact Grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-xs mb-3"
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-left">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.05 }}
                className="flex items-center gap-1.5"
              >
                <Check className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-[11px] text-foreground line-clamp-1">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bonus Challenge Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3 w-full max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">{t.onboarding.challengeBadge}</span>
          </div>
          <p className="text-xs font-semibold text-foreground mb-1">{t.onboarding.challengeSubtitle}</p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-primary" />
              <span>50 {t.onboarding.carsToScan}</span>
            </div>
            <span>=</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground">{t.onboarding.firstMonthFree} {t.onboarding.freeMonth}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Section - CTA + Skip (consistent with other slides) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex-shrink-0 py-4 w-full max-w-xs mx-auto space-y-3"
      >
        <Button
          onClick={handleAcceptAndContinue}
          disabled={isLoading || isRequesting}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isLoading || isRequesting ? t.common.loading : t.onboarding.acceptAndContinue}
        </Button>
        
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isLoading || isRequesting}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            {t.onboarding.skip}
          </Button>
        )}
      </motion.div>
    </div>
  );
};
