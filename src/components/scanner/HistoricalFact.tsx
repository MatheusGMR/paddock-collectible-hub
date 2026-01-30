import { History, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoricalFactProps {
  fact: string;
  carName: string;
}

export const HistoricalFact = ({ fact, carName }: HistoricalFactProps) => {
  if (!fact) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background border border-amber-500/20">
      {/* Decorative sparkle */}
      <div className="absolute top-3 right-3 opacity-30">
        <Sparkles className="h-8 w-8 text-amber-500" />
      </div>
      
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <History className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-500">Você Sabia?</p>
            <p className="text-[10px] text-muted-foreground">Fato histórico sobre o {carName}</p>
          </div>
        </div>
        
        {/* Fact text */}
        <p className="text-sm text-foreground/90 leading-relaxed italic">
          "{fact}"
        </p>
      </div>
    </div>
  );
};
