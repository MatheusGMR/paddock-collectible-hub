import { useEffect } from "react";
import confetti from "canvas-confetti";
import { getTierLabel, getTierColor, getTierBgColor } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";

interface ScoreHeroProps {
  score: number;
  tier: string;
  onClick?: () => void;
  animated?: boolean;
}

export const ScoreHero = ({ score, tier, onClick, animated = true }: ScoreHeroProps) => {
  // Trigger confetti for rare items
  useEffect(() => {
    if (animated && (tier === "ultra_rare" || tier === "super_rare" || tier === "rare")) {
      const intensity = tier === "ultra_rare" ? 150 : tier === "super_rare" ? 100 : 50;
      const colors = tier === "ultra_rare" 
        ? ["#f59e0b", "#fbbf24", "#fcd34d"]
        : tier === "super_rare"
        ? ["#a855f7", "#c084fc", "#d8b4fe"]
        : ["#3b82f6", "#60a5fa", "#93c5fd"];
      
      confetti({
        particleCount: intensity,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });
    }
  }, [tier, animated]);

  const tierColorClass = getTierColor(tier);
  const tierBgClass = getTierBgColor(tier);
  
  // Get the accent color for the progress bar
  const getProgressBarColor = (tier: string) => {
    switch (tier) {
      case "ultra_rare": return "bg-amber-500";
      case "super_rare": return "bg-purple-500";
      case "rare": return "bg-blue-500";
      case "uncommon": return "bg-green-500";
      default: return "bg-muted-foreground";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl text-center cursor-pointer transition-all active:scale-[0.98]",
        tierBgClass,
        animated && "animate-in fade-in zoom-in duration-500"
      )}
    >
      <span className={cn("text-xs uppercase tracking-widest font-bold", tierColorClass)}>
        {getTierLabel(tier)}
      </span>
      
      <div className={cn(
        "text-5xl font-black my-2",
        tier === "ultra_rare" && "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent",
        tier === "super_rare" && "bg-gradient-to-r from-purple-400 via-fuchsia-300 to-purple-500 bg-clip-text text-transparent",
        tier === "rare" && "bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent",
        tier !== "ultra_rare" && tier !== "super_rare" && tier !== "rare" && "text-foreground"
      )}>
        {score}
      </div>
      
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-1000 ease-out rounded-full",
            getProgressBarColor(tier)
          )}
          style={{ 
            width: animated ? `${score}%` : '0%',
            animation: animated ? `grow-width 1s ease-out forwards` : 'none'
          }}
        />
      </div>
      
      <p className="text-xs text-foreground-secondary mt-2">
        Toque para ver detalhes do índice
      </p>
      
      <style>{`
        @keyframes grow-width {
          from { width: 0%; }
          to { width: ${score}%; }
        }
      `}</style>
    </div>
  );
};
