import { useState } from "react";
import { TrendingUp, MessageSquare, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketValue, formatBRL, getConfidenceLabel, getConfidenceColor } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { UserPriceGuess } from "./UserPriceGuess";

interface MarketValueCardProps {
  marketValue: MarketValue;
  itemId?: string;
  onGuessSaved?: () => void;
}

export const MarketValueCard = ({ marketValue, itemId, onGuessSaved }: MarketValueCardProps) => {
  const [showGuess, setShowGuess] = useState(false);
  const [guessType, setGuessType] = useState<"guess" | "paid">("guess");

  // Only allow price guess/paid if we have a valid itemId
  const canSubmitPrice = !!itemId;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Valor de Mercado</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-2 py-0.5", getConfidenceColor(marketValue.confidence))}
        >
          Confiança: {getConfidenceLabel(marketValue.confidence)}
        </Badge>
      </div>

      {/* Price Range */}
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">
          {formatBRL(marketValue.min)} – {formatBRL(marketValue.max)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {marketValue.source}
        </p>
      </div>

      {/* User Guess Section - only show if itemId exists */}
      {showGuess && itemId ? (
        <UserPriceGuess
          itemId={itemId}
          type={guessType}
          onSaved={() => {
            setShowGuess(false);
            onGuessSaved?.();
          }}
          onCancel={() => setShowGuess(false)}
        />
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => { setGuessType("guess"); setShowGuess(true); }}
            disabled={!canSubmitPrice}
            title={!canSubmitPrice ? "Adicione à coleção primeiro" : undefined}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Meu palpite
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => { setGuessType("paid"); setShowGuess(true); }}
            disabled={!canSubmitPrice}
            title={!canSubmitPrice ? "Adicione à coleção primeiro" : undefined}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Quanto paguei
          </Button>
        </div>
      )}
      
      {/* Hint when no itemId */}
      {!canSubmitPrice && (
        <p className="text-[10px] text-muted-foreground text-center">
          Adicione à coleção para registrar seu palpite ou valor pago
        </p>
      )}
    </div>
  );
};
