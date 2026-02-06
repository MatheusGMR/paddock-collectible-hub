import { useState } from "react";
import { ThumbsUp, AlertCircle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ScanFeedbackProps {
  itemId?: string;
  variantId?: string; // ML A/B testing variant ID
  collectibleData: {
    manufacturer: string;
    scale: string;
    year: string;
    origin: string;
    series: string;
    condition: string;
    color: string;
  };
  realCarData: {
    brand: string;
    model: string;
    year: string;
  };
}

type FieldKey = "manufacturer" | "scale" | "year" | "origin" | "series" | "condition" | "color" | "brand" | "model" | "car_year";

const fieldLabels: Record<FieldKey, string> = {
  manufacturer: "Fabricante",
  scale: "Escala",
  year: "Ano do colecionável",
  origin: "Origem",
  series: "Série",
  condition: "Condição",
  color: "Cor",
  brand: "Marca do carro",
  model: "Modelo do carro",
  car_year: "Ano do carro",
};

export const ScanFeedback = ({ itemId, variantId, collectibleData, realCarData }: ScanFeedbackProps) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FieldKey | null>(null);
  const [correction, setCorrection] = useState("");
  const [visualCues, setVisualCues] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Send feedback to ML system via edge function
  const sendMLFeedback = async (payload: Record<string, unknown>) => {
    try {
      const { error } = await supabase.functions.invoke("ml-feedback", {
        body: payload,
      });
      if (error) throw error;
    } catch (e) {
      console.error("[ML] Feedback error:", e);
      // Non-blocking - still show success to user
    }
  };

  const handleLike = async () => {
    if (!user || liked) return;
    
    setLiked(true);
    
    // Send to ML system
    await sendMLFeedback({
      type: "like",
      item_id: itemId,
      variant_id: variantId,
    });
    
    toast.success("Obrigado pelo feedback! 🎉");
  };

  const handleSubmitReport = async () => {
    if (!user || !selectedField || !correction.trim()) return;
    
    setSubmitting(true);
    
    try {
      const originalValue = getOriginalValue(selectedField);
      
      // Send to ML system with full context
      await sendMLFeedback({
        type: "error",
        item_id: itemId,
        variant_id: variantId,
        error_field: selectedField,
        original_value: originalValue,
        corrected_value: correction.trim(),
        visual_cues: visualCues.trim() || null,
        original_brand: realCarData.brand,
        original_model: realCarData.model,
        original_manufacturer: collectibleData.manufacturer,
        original_scale: collectibleData.scale,
        original_year: collectibleData.year,
      });
      
      toast.success("Erro reportado! A IA vai aprender com isso. 🧠");
      setReportOpen(false);
      setSelectedField(null);
      setCorrection("");
      setVisualCues("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const getOriginalValue = (field: FieldKey): string => {
    switch (field) {
      case "manufacturer": return collectibleData.manufacturer;
      case "scale": return collectibleData.scale;
      case "year": return collectibleData.year;
      case "origin": return collectibleData.origin;
      case "series": return collectibleData.series;
      case "condition": return collectibleData.condition;
      case "color": return collectibleData.color;
      case "brand": return realCarData.brand;
      case "model": return realCarData.model;
      case "car_year": return realCarData.year;
      default: return "";
    }
  };

  const feedbackFields: { key: FieldKey; value: string }[] = ([
    { key: "brand" as FieldKey, value: realCarData.brand },
    { key: "model" as FieldKey, value: realCarData.model },
    { key: "car_year" as FieldKey, value: realCarData.year },
    { key: "manufacturer" as FieldKey, value: collectibleData.manufacturer },
    { key: "scale" as FieldKey, value: collectibleData.scale },
    { key: "series" as FieldKey, value: collectibleData.series },
    { key: "color" as FieldKey, value: collectibleData.color },
    { key: "condition" as FieldKey, value: collectibleData.condition },
    { key: "origin" as FieldKey, value: collectibleData.origin },
  ] as { key: FieldKey; value: string }[]).filter(f => f.value);

  return (
    <>
      {/* Feedback buttons */}
      <div className="flex items-center justify-center gap-4 py-3 border-t border-border mt-2">
        <span className="text-xs text-muted-foreground">A IA acertou?</span>
        
        <button
          onClick={handleLike}
          disabled={liked}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            liked
              ? "bg-green-500/20 text-green-500"
              : "bg-muted hover:bg-muted/80 text-foreground"
          }`}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
          {liked ? "Obrigado!" : "Sim"}
        </button>

        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-all"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Reportar erro
        </button>
      </div>

      {/* Error report sheet */}
      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Reportar erro da IA
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(80vh-180px)]">
            {/* Field selection */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                Qual informação está errada?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {feedbackFields.map(({ key, value }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedField(key);
                      setCorrection("");
                    }}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedField === key
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-muted border-2 border-transparent hover:bg-muted/80"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">{fieldLabels[key]}</p>
                    <p className="text-sm font-medium text-foreground truncate">{value}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Correction input */}
            {selectedField && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Qual é o valor correto para "{fieldLabels[selectedField]}"?
                  </label>
                  <input
                    type="text"
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    placeholder={`Digite o ${fieldLabels[selectedField].toLowerCase()} correto...`}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor atual: <span className="font-medium">{getOriginalValue(selectedField)}</span>
                  </p>
                </div>

                {/* Visual cues for ML learning */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">ML</span>
                    Como você identificou? (opcional)
                  </label>
                  <input
                    type="text"
                    value={visualCues}
                    onChange={(e) => setVisualCues(e.target.value)}
                    placeholder="Ex: base preta com logo verde, pneus de borracha..."
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground/80">
                    🧠 Isso ajuda a IA a aprender padrões visuais para identificações futuras
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border safe-bottom">
            <Button
              onClick={handleSubmitReport}
              disabled={!selectedField || !correction.trim() || submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enviar correção
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
