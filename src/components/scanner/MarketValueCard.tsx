import { useState, useEffect, useCallback } from "react";
import { TrendingUp, MessageSquare, ShoppingCart, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarketValue, formatBRL, getConfidenceLabel, getConfidenceColor } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { UserPriceGuess } from "./UserPriceGuess";
import { supabase } from "@/integrations/supabase/client";

interface RefinedValue {
  refined_min: number | null;
  refined_max: number | null;
  ai_min: number | null;
  ai_max: number | null;
  user_paid_avg: number | null;
  user_paid_count: number;
  user_guess_avg: number | null;
  user_guess_count: number;
  total_contributors: number;
  confidence: "high" | "medium" | "low";
}

interface MarketValueCardProps {
  marketValue: MarketValue;
  itemId?: string;
  onGuessSaved?: () => void;
}

export const MarketValueCard = ({ marketValue, itemId, onGuessSaved }: MarketValueCardProps) => {
  const [showGuess, setShowGuess] = useState(false);
  const [guessType, setGuessType] = useState<"guess" | "paid">("guess");
  const [refined, setRefined] = useState<RefinedValue | null>(null);

  const canSubmitPrice = !!itemId;

  const fetchRefined = useCallback(async () => {
    if (!itemId) return;
    const { data, error } = await supabase.rpc("get_refined_market_value", { p_item_id: itemId });
    if (!error && data) {
      setRefined(data as unknown as RefinedValue);
    }
  }, [itemId]);

  useEffect(() => {
    fetchRefined();
  }, [fetchRefined]);

  // Display refined values if available, otherwise fall back to AI-only
  const displayMin = refined?.refined_min ?? marketValue.min;
  const displayMax = refined?.refined_max ?? marketValue.max;
  const displayConfidence = refined?.confidence ?? marketValue.confidence;
  const contributors = refined?.total_contributors ?? 0;

  const handleGuessSaved = () => {
    setShowGuess(false);
    fetchRefined(); // Refresh refined price
    onGuessSaved?.();
  };

  // Build source label
  const sourceLabel = contributors > 0
    ? `IA + ${contributors} ${contributors === 1 ? "usuário" : "usuários"}`
    : marketValue.source;

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
          className={cn("text-[10px] px-2 py-0.5", getConfidenceColor(displayConfidence))}
        >
          Confiança: {getConfidenceLabel(displayConfidence)}
        </Badge>
      </div>

      {/* Price Range */}
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">
          {formatBRL(displayMin)} – {formatBRL(displayMax)}
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {contributors > 0 && <Users className="h-3 w-3 text-muted-foreground" />}
          <p className="text-xs text-muted-foreground">{sourceLabel}</p>
        </div>
      </div>

      {/* User Guess Section */}
      {showGuess && itemId ? (
        <UserPriceGuess
          itemId={itemId}
          type={guessType}
          onSaved={handleGuessSaved}
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
