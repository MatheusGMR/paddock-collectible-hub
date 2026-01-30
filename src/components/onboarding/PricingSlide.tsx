import { motion } from "framer-motion";
import { Crown, Check, Sparkles, Camera, Bell, Shield } from "lucide-react";
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
    { icon: Camera, label: t.onboarding.cameraPermission || "Câmera para scanner" },
    { icon: Bell, label: t.onboarding.notificationPermission || "Notificações de alertas" },
  ];

  const handleAcceptAndContinue = async () => {
    // Request all permissions first
    await requestAllPermissions();
    // Then proceed with trial/subscription
    onStartTrial();
  };

  const handleSkipWithPermissions = async () => {
    // Still request permissions even on skip
    await requestAllPermissions();
    onSkip();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      {/* Discount Badge */}
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: -12 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-sm mb-6 shadow-lg"
      >
        <Sparkles className="w-4 h-4 inline mr-1" />
        {t.onboarding.discountBadge}
      </motion.div>

      {/* Crown Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center mb-6 shadow-2xl"
      >
        <Crown className="w-12 h-12 text-white" />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        {t.onboarding.pricingTitle}
      </motion.h2>

      {/* Free Trial Text */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg text-primary font-medium mb-6"
      >
        {t.onboarding.freeTrial}
      </motion.p>

      {/* Price Comparison */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-2xl p-5 mb-4 w-full max-w-xs shadow-lg"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-lg text-muted-foreground line-through">
            {t.onboarding.originalPrice}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {t.onboarding.discountedPrice}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {t.onboarding.limitedTime}
        </p>

        {/* Features */}
        <div className="space-y-1.5 text-left">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-foreground">{feature}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Permissions Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-muted/50 border border-border rounded-xl p-4 mb-4 w-full max-w-xs"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {t.onboarding.permissionsTitle}
          </span>
        </div>
        <div className="space-y-2">
          {permissions.map((perm, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-center gap-2"
            >
              <perm.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{perm.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={handleAcceptAndContinue}
          disabled={isLoading || isRequesting}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isLoading || isRequesting ? t.common.loading : t.onboarding.acceptAndContinue}
        </Button>

        <Button
          onClick={handleSkipWithPermissions}
          disabled={isLoading || isRequesting}
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {t.onboarding.skipForNow}
        </Button>
      </motion.div>
    </div>
  );
};
