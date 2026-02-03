import { motion } from "framer-motion";
import { Crown, Check, Camera, Bell, Car, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";

interface PricingSlideProps {
  onStartTrial: () => void;
  isLoading?: boolean;
}

export const PricingSlide = ({ onStartTrial, isLoading }: PricingSlideProps) => {
  const { t } = useLanguage();
  const { requestAllPermissions, isRequesting } = usePermissions();

  const features = [
    t.onboarding.feature1,
    t.onboarding.feature2,
    t.onboarding.feature3,
    t.onboarding.feature4,
  ];

  const permissions = [
    { icon: Camera, label: t.onboarding.cameraPermission || "Câmera" },
    { icon: Bell, label: t.onboarding.notificationPermission || "Notificações" },
  ];

  const handleAcceptAndContinue = async () => {
    await requestAllPermissions();
    onStartTrial();
  };

  return (
    <div className="flex flex-col h-full px-6 py-2">
      {/* Top Section - Challenge Banner */}
      <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
        {/* Challenge Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: -12 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 rounded-full font-bold text-sm mb-4 shadow-lg flex items-center gap-2"
        >
          <Gift className="w-4 h-4" />
          {t.onboarding.challengeBadge}
        </motion.div>

        {/* Crown Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center mb-3 shadow-xl"
        >
          <Crown className="w-7 h-7 text-primary-foreground" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground mb-2"
        >
          {t.onboarding.pricingTitle}
        </motion.h2>

        {/* Challenge Highlight Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-4 mb-4 w-full max-w-xs"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-primary">50</p>
              <p className="text-xs text-muted-foreground">{t.onboarding.carsToScan}</p>
            </div>
            <div className="text-3xl">=</div>
            <div className="text-left">
              <p className="text-lg font-bold text-foreground">{t.onboarding.firstMonthFree}</p>
              <p className="text-xs text-muted-foreground">{t.onboarding.freeMonth}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-accent-foreground" />
            <span className="text-muted-foreground">
              {t.onboarding.thenOnly} <span className="font-bold text-foreground">R$ 19,90</span>{t.onboarding.perMonth}
            </span>
          </div>
        </motion.div>

        {/* Alternative - Standard Trial */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground mb-3 px-4"
        >
          {t.onboarding.orStandardTrial}
        </motion.div>

        {/* Features List - Compact Grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xs"
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-left">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="flex items-center gap-1.5"
              >
                <Check className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-[11px] text-foreground line-clamp-1">{feature}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Section - Price, Permissions & CTAs (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex-shrink-0 w-full max-w-xs mx-auto space-y-3"
      >
        {/* Price Comparison */}
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{t.onboarding.regularPrice}</p>
              <p className="text-sm text-muted-foreground line-through">R$ 39,90/mês</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary font-medium">{t.onboarding.with50Cars}</p>
              <p className="text-lg font-bold text-foreground">R$ 19,90/mês</p>
            </div>
          </div>
        </div>

        {/* Permissions - Inline */}
        <div className="flex items-center justify-center gap-4 py-1">
          {permissions.map((perm, index) => (
            <div key={index} className="flex items-center gap-1">
              <perm.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{perm.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleAcceptAndContinue}
          disabled={isLoading || isRequesting}
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isLoading || isRequesting ? t.common.loading : t.onboarding.acceptAndContinue}
        </Button>

        {/* Trial info */}
        <p className="text-[10px] text-center text-muted-foreground">
          {t.onboarding.trialInfo}
        </p>
      </motion.div>
    </div>
  );
};
