import { TrendingUp } from "lucide-react";
import { getTierLabel, getTierColor, getTierBgColor } from "@/lib/priceIndex";

interface IndexBadgeProps {
  score: number;
  tier: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export const IndexBadge = ({ score, tier, onClick, size = "md" }: IndexBadgeProps) => {
  const sizeClasses = {
    sm: "p-2 gap-1.5",
    md: "p-3 gap-2",
    lg: "p-4 gap-3",
  };

  const scoreClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const iconClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full rounded-xl border border-border
        ${getTierBgColor(tier)}
        ${sizeClasses[size]}
        flex items-center justify-between
        transition-all hover:scale-[1.02] active:scale-[0.98]
        ${onClick ? "cursor-pointer" : "cursor-default"}
      `}
    >
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-1.5">
          <TrendingUp className={`${iconClasses[size]} text-primary`} />
          <span className="text-xs uppercase tracking-wide text-foreground-secondary font-medium">
            Índice de Valor
          </span>
        </div>
        {onClick && (
          <span className="text-[10px] text-foreground-secondary/70 mt-0.5">
            Toque para ver critérios
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`${scoreClasses[size]} font-bold text-foreground`}>
          {score}
        </span>
        <span className={`text-xs font-semibold uppercase ${getTierColor(tier)}`}>
          {getTierLabel(tier)}
        </span>
      </div>
    </button>
  );
};
