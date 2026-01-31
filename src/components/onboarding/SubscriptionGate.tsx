import { motion } from "framer-motion";
import { Lock, Crown, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { getCollectionCount } from "@/lib/database";
import paddockLogo from "@/assets/paddock-logo.png";

interface SubscriptionGateProps {
  onSubscribe: () => void;
  isLoading?: boolean;
}

export const SubscriptionGate = ({ onSubscribe, isLoading }: SubscriptionGateProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [collectionCount, setCollectionCount] = useState(0);

  // Fetch user's collection count to show what they might lose
  useEffect(() => {
    const fetchCollection = async () => {
      if (user?.id) {
        try {
          const count = await getCollectionCount(user.id);
          setCollectionCount(count);
        } catch (error) {
          console.error("Error fetching collection count:", error);
        }
      }
    };
    fetchCollection();
  }, [user?.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 overflow-y-auto py-8"
    >
      {/* Logo */}
      <motion.img
        src={paddockLogo}
        alt="Paddock"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-14 h-14 mb-4"
      />

      {/* Lock Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
        className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"
      >
        <Lock className="w-8 h-8 text-destructive" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-foreground mb-2 text-center"
      >
        {t.onboarding.trialExpired}
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-muted-foreground text-center max-w-sm mb-4"
      >
        {t.onboarding.trialExpiredDesc}
      </motion.p>

      {/* Collection Warning Card */}
      {collectionCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 w-full max-w-xs"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {t.onboarding.collectionWarningTitle}
            </span>
          </div>
          <p className="text-xs text-destructive/80 mb-3">
            {t.onboarding.collectionWarningDesc}
          </p>
          <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
            <Package className="w-4 h-4 text-destructive" />
            <span className="text-sm font-bold text-destructive">
              {collectionCount} {t.onboarding.itemsAtRisk}
            </span>
          </div>
        </motion.div>
      )}

      {/* Price Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-2xl p-5 mb-6 w-full max-w-xs text-center shadow-lg"
      >
        <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Paddock Premium</p>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg text-muted-foreground line-through">
            {t.onboarding.originalPrice}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {t.onboarding.discountedPrice}
          </span>
        </div>
        <p className="text-xs text-primary font-medium">
          {t.onboarding.dontLoseCollection}
        </p>
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
