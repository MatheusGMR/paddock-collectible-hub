import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import {
  PriceIndexBreakdown,
  getTierLabel,
  getTierColor,
  getCriteriaLabel,
  getScorePercentage,
  normalizeBreakdown,
} from "@/lib/priceIndex";

interface IndexBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  tier: string;
  breakdown: PriceIndexBreakdown | unknown;
}

export const IndexBreakdown = ({
  open,
  onOpenChange,
  score,
  tier,
  breakdown: rawBreakdown,
}: IndexBreakdownProps) => {
  const breakdown = (normalizeBreakdown(rawBreakdown) ?? {}) as Partial<PriceIndexBreakdown>;
  // Only show criteria that exist in the breakdown (origin is now deprecated)
  const criteriaOrder: (keyof PriceIndexBreakdown)[] = [
    "rarity",
    "exclusivity",
    "condition",
    "manufacturer",
    "scale",
    "age",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Índice de Valor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{score}</span>
              <span className={`text-sm font-semibold uppercase ${getTierColor(tier)}`}>
                {getTierLabel(tier)}
              </span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)] pb-8">
          {criteriaOrder.map((key) => {
            const item = breakdown[key];
            // Skip if the item doesn't exist (for backwards compatibility)
            if (!item) return null;
            const percentage = getScorePercentage(item.score, item.max);

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {getCriteriaLabel(key)}
                  </span>
                  <span className="text-sm text-foreground-secondary">
                    {item.score}/{item.max} pts
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
                {item.reason && (
                  <p className="text-xs text-foreground-secondary">
                    {item.reason}
                  </p>
                )}
              </div>
            );
          })}

          {!criteriaOrder.some((k) => breakdown[k]) && (
            <p className="text-sm text-foreground-secondary">Critérios ainda não calculados para este item. Use "Recalcular" no detalhe do colecionável.</p>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-foreground-secondary leading-relaxed">
              <strong className="text-foreground">Como funciona:</strong> raridade/tiragem (35), exclusividade/licença (15), condição (15), fabricante (15), idade (10) e escala (10). Peças únicas ou numeradas ficam no mínimo em Super Raro; edições especiais e importadas sem venda no Brasil pontuam mais.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
