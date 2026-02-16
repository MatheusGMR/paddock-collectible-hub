import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { savePriceEstimate } from "@/lib/database";

interface UserPriceGuessProps {
  itemId?: string;
  type: "guess" | "paid";
  onSaved?: () => void;
  onCancel?: () => void;
}

export const UserPriceGuess = ({ itemId, type, onSaved, onCancel }: UserPriceGuessProps) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSave = async () => {
    const numValue = parseFloat(value.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(numValue) || numValue <= 0) {
      toast({ title: "Valor inválido", description: "Digite um valor válido em Reais.", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "Faça login", description: "Você precisa estar logado para dar um palpite.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await savePriceEstimate({
        item_id: itemId || null,
        user_id: user.id,
        source: type === "paid" ? "user_paid" : "user_guess",
        price_brl: numValue,
      });
      toast({ title: "Salvo!", description: type === "paid" ? "Valor pago registrado." : "Palpite registrado." });
      onSaved?.();
    } catch (err) {
      console.error("[PriceGuess] Error:", err);
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
        <Input
          type="text"
          inputMode="decimal"
          placeholder={type === "paid" ? "Quanto pagou?" : "Quanto acha que vale?"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-10 h-9 text-sm"
          autoFocus
        />
      </div>
      <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSave} disabled={saving || !value}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
