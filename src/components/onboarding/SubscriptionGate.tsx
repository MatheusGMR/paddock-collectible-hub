import { motion } from "framer-motion";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import paddockLogo from "@/assets/paddock-logo.png";

interface SubscriptionGateProps {
  onSubscribe: () => void;
  isLoading?: boolean;
}

export const SubscriptionGate = ({ onSubscribe, isLoading }: SubscriptionGateProps) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6"
    >
      {/* Logo */}
      <motion.img
        src={paddockLogo}
        alt="Paddock"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-16 h-16 mb-6"
      />

      {/* Lock Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6"
      >
        <Lock className="w-10 h-10 text-muted-foreground" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-foreground mb-3 text-center"
      >
        {t.onboarding.trialExpired}
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center max-w-sm mb-8"
      >
        {t.onboarding.trialExpiredDesc}
      </motion.p>

      {/* Price Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-2xl p-6 mb-8 w-full max-w-xs text-center shadow-lg"
      >
        <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Paddock Premium</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg text-muted-foreground line-through">
            {t.onboarding.originalPrice}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {t.onboarding.discountedPrice}
          </span>
        </div>
      </motion.div>

      {/* Subscribe Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs space-y-3"
      >
        <Button
          onClick={onSubscribe}
          disabled={isLoading}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          {isLoading ? t.common.loading : t.onboarding.subscribeNow}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {t.onboarding.restoreSubscription}
        </p>
      </motion.div>
    </motion.div>
  );
};
