import { getTierColor, getTierLabel, getTierBgColor } from "@/lib/priceIndex";

interface IndexCardProps {
  rank: number;
  image: string;
  brand: string;
  model: string;
  manufacturer: string;
  series?: string;
  score: number;
  tier: string;
  onClick?: () => void;
}

export const IndexCard = ({
  rank,
  image,
  brand,
  model,
  manufacturer,
  series,
  score,
  tier,
  onClick,
}: IndexCardProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <span className="text-lg font-bold text-foreground-secondary w-8 text-center">
        #{rank}
      </span>

      <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img
          src={image}
          alt={`${brand} ${model}`}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">
          {brand} {model}
        </h4>
        <p className="text-xs text-foreground-secondary truncate">
          {manufacturer} {series && `• ${series}`}
        </p>
      </div>

      <div className={`flex flex-col items-end ${getTierBgColor(tier)} px-3 py-1.5 rounded-lg`}>
        <span className="text-xl font-bold text-foreground">{score}</span>
        <span className={`text-[10px] font-semibold uppercase ${getTierColor(tier)}`}>
          {getTierLabel(tier)}
        </span>
      </div>
    </button>
  );
};
