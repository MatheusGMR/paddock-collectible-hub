import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, PartyPopper, Sparkles, Check, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCollectionChallenge } from "@/hooks/useCollectionChallenge";
import confetti from "canvas-confetti";

export const ChallengeCelebrationModal = () => {
  const { showCelebration, claimReward, dismissCelebration, current, target } = useCollectionChallenge();
  const { t } = useLanguage();
  const [isClaiming, setIsClaiming] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (showCelebration) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)", "hsl(48, 96%, 53%)", "hsl(25, 95%, 53%)"];

      (function frame() {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 70,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 70,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
    }
  }, [showCelebration]);

  const handleClaim = async () => {
    setIsClaiming(true);
    const success = await claimReward();
    setIsClaiming(false);
    
    if (!success) {
      // Still dismiss if claim fails - user can try again later
      dismissCelebration();
    }
  };

  if (!showCelebration) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`transform transition-all duration-500 text-center max-w-sm ${
            showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Celebration Icon */}
          <div className="relative mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center shadow-xl"
            >
              <Gift className="w-12 h-12 text-primary-foreground" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-accent flex items-center justify-center"
            >
              <PartyPopper className="w-5 h-5 text-accent-foreground" />
            </motion.div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            {t.challenge?.congratulations || "Parabéns! 🎉"}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg text-primary font-semibold mb-4"
          >
            {t.challenge?.challengeCompleted || "Você completou o desafio!"}
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-3xl font-bold text-primary">{current}</p>
                <p className="text-xs text-muted-foreground">{t.challenge?.carsScanned || "carrinhos escaneados"}</p>
              </div>
            </div>
            
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-foreground">{t.challenge?.reward1 || "+30 dias grátis (além do trial)"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-foreground">{t.challenge?.reward2 || "50% de desconto permanente"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
                <span className="text-muted-foreground">
                  {t.challenge?.newPrice || "De R$ 39,90 por apenas R$ 19,90/mês"}
                </span>
              </div>
            </div>
            
            {/* Bonus explainer */}
            <p className="text-xs text-muted-foreground/80 mt-3 text-center">
              ✨ {t.challenge?.bonusExplainer || "Adicional aos 7 dias de teste grátis"}
            </p>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              {isClaiming 
                ? (t.common?.loading || "Carregando...")
                : (t.challenge?.claimReward || "Resgatar Recompensa")}
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
