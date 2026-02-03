import { motion } from "framer-motion";
import { Car, Gift, Sparkles } from "lucide-react";
import { useCollectionChallenge } from "@/hooks/useCollectionChallenge";
import { useLanguage } from "@/contexts/LanguageContext";

export const ChallengeProgressBar = () => {
  const { isActive, current, target, progress, isLoading, isCompleted, isRewarded } = useCollectionChallenge();
  const { t } = useLanguage();

  // Don't show if not active, rewarded, or loading
  if (isLoading || isRewarded || !isActive) return null;

  const remaining = Math.max(target - current, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Car className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">
              {t.challenge?.title || "Desafio dos 50 Carrinhos"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isCompleted 
                ? (t.challenge?.completed || "Desafio concluído! 🎉")
                : `${remaining} ${t.challenge?.remaining || "restantes para +30 dias grátis"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">{current}/{target}</span>
        </div>
      </div>
      
      {/* Bonus explainer */}
      <p className="text-[9px] text-muted-foreground/70 mb-1.5 text-center">
        ✨ {t.challenge?.bonusExplainer || "Adicional aos 7 dias de teste grátis"}
      </p>
      
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full relative"
        >
          {progress >= 10 && (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
