import { motion } from "framer-motion";
import { Crown, Check, Sparkles, Camera, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/usePermissions";

interface PricingSlideProps {
  onStartTrial: () => void;
  onSkip: () => void;
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

  const permissions = [
    { icon: Camera, label: t.onboarding.cameraPermission || "Câmera" },
    { icon: Bell, label: t.onboarding.notificationPermission || "Notificações" },
  ];

  const handleAcceptAndContinue = async () => {
    await requestAllPermissions();
    onStartTrial();
  };

  const handleSkipWithPermissions = async () => {
    await requestAllPermissions();
    onSkip();
  };

  return (
    <div className="flex flex-col h-full px-6 py-4">
      {/* Top Section - Title & Features */}
      <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0">
        {/* Discount Badge */}
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: -12 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full font-bold text-xs mb-3 shadow-lg"
        >
          <Sparkles className="w-3 h-3 inline mr-1" />
          {t.onboarding.discountBadge}
        </motion.div>

        {/* Crown Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center mb-3 shadow-xl"
        >
          <Crown className="w-7 h-7 text-white" />
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-foreground mb-1"
        >
          {t.onboarding.pricingTitle}
        </motion.h2>

        {/* Free Trial Text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-primary font-medium mb-4"
        >
          {t.onboarding.freeTrial}
        </motion.p>

        {/* Features List - Compact Grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-xs"
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-left">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
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
        transition={{ delay: 0.6 }}
        className="flex-shrink-0 w-full max-w-xs mx-auto space-y-2"
      >
        {/* Price Card - Compact */}
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground line-through">
              {t.onboarding.originalPrice}
            </span>
            <span className="text-xl font-bold text-foreground">
              {t.onboarding.discountedPrice}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {t.onboarding.limitedTime}
          </p>
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

        {/* CTA Buttons */}
        <Button
          onClick={handleAcceptAndContinue}
          disabled={isLoading || isRequesting}
          className="w-full h-11 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isLoading || isRequesting ? t.common.loading : t.onboarding.acceptAndContinue}
        </Button>

        <Button
          onClick={handleSkipWithPermissions}
          disabled={isLoading || isRequesting}
          variant="ghost"
          className="w-full text-sm text-muted-foreground hover:text-foreground py-1"
        >
          {t.onboarding.skipForNow}
        </Button>
      </motion.div>
    </div>
  );
};
