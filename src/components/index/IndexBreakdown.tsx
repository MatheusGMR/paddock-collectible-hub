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
} from "@/lib/priceIndex";

interface IndexBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  tier: string;
  breakdown: PriceIndexBreakdown;
}

export const IndexBreakdown = ({
  open,
  onOpenChange,
  score,
  tier,
  breakdown,
}: IndexBreakdownProps) => {
  // Only show criteria that exist in the breakdown (origin is now deprecated)
  const criteriaOrder: (keyof PriceIndexBreakdown)[] = [
    "rarity",
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
                <p className="text-xs text-foreground-secondary">
                  {item.reason}
                </p>
              </div>
            );
          })}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-xs text-foreground-secondary leading-relaxed">
              <strong className="text-foreground">Como funciona:</strong> O índice reflete a 
              realidade do <strong>mercado brasileiro</strong>: raridade no BR (45%), condição (20%), 
              fabricante (15%), escala (10%) e idade (10%). Modelos difíceis de encontrar no Brasil 
              recebem pontuação maior, independente da disponibilidade em outros países.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
