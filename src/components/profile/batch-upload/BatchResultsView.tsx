import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, Package, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ConsolidatedResult } from "./types";

interface BatchResultsViewProps {
  results: ConsolidatedResult[];
  onSelectionChange: (results: ConsolidatedResult[]) => void;
  onAddSelected: () => void;
  onSkipAll: () => void;
  isAdding: boolean;
}

type FilterType = "all" | "new" | "duplicates";

export function BatchResultsView({
  results,
  onSelectionChange,
  onAddSelected,
  onSkipAll,
  isAdding,
}: BatchResultsViewProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const total = results.length;
    const duplicates = results.filter((r) => r.isDuplicate).length;
    const newItems = total - duplicates;
    const selected = results.filter((r) => r.isSelected).length;
    return { total, duplicates, newItems, selected };
  }, [results]);

  const filteredResults = useMemo(() => {
    switch (filter) {
      case "new":
        return results.filter((r) => !r.isDuplicate);
      case "duplicates":
        return results.filter((r) => r.isDuplicate);
      default:
        return results;
    }
  }, [results, filter]);

  const handleToggleSelection = (mediaId: string, index: number) => {
    const key = `${mediaId}-${index}`;
    const updated = results.map((r) =>
      `${r.mediaId}-${results.indexOf(r)}` === key
        ? { ...r, isSelected: !r.isSelected }
        : r
    );
    onSelectionChange(updated);
  };

  const handleSelectAll = () => {
    const allSelected = results.every((r) => r.isSelected);
    const updated = results.map((r) => ({ ...r, isSelected: !allSelected }));
    onSelectionChange(updated);
  };

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-foreground-secondary">
          Nenhum carrinho identificado nas fotos
        </p>
        <Button variant="outline" onClick={onSkipAll} className="mt-4">
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-foreground">
            {stats.total} carros encontrados
          </h3>
          <Badge variant="secondary" className="text-xs">
            {stats.selected} selecionados
          </Badge>
        </div>
        
        {stats.duplicates > 0 && (
          <p className="text-xs text-foreground-secondary">
            {stats.duplicates} já na coleção
          </p>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          {(["all", "new", "duplicates"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs h-7"
            >
              {f === "all" && `Todos (${stats.total})`}
              {f === "new" && `Novos (${stats.newItems})`}
              {f === "duplicates" && `Duplicados (${stats.duplicates})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredResults.map((result, idx) => {
            const key = `${result.mediaId}-${idx}`;
            const isExpanded = expandedCards.has(key);

            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border transition-all",
                  result.isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                  result.isDuplicate && "opacity-75"
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={result.isSelected}
                    onCheckedChange={() => handleToggleSelection(result.mediaId, idx)}
                    className="h-5 w-5"
                  />

                  {/* Thumbnail */}
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {result.croppedImage ? (
                      <img
                        src={result.croppedImage}
                        alt={`${result.realCar.brand} ${result.realCar.model}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    {result.isDuplicate && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {result.realCar.brand} {result.realCar.model}
                    </p>
                    <p className="text-xs text-foreground-secondary">
                      {result.collectible.manufacturer} • {result.collectible.scale}
                    </p>
                    {result.isDuplicate && (
                      <Badge variant="outline" className="mt-1 text-xs bg-primary/10 text-primary border-primary/30">
                        Na coleção
                      </Badge>
                    )}
                  </div>

                  {/* Photo indicator */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>{result.mediaIndex + 1}</span>
                  </div>

                  {/* Expand toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleCard(key)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <span className="text-muted-foreground">Ano:</span>{" "}
                        <span className="text-foreground">{result.realCar.year || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cor:</span>{" "}
                        <span className="text-foreground">{result.collectible.color || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Condição:</span>{" "}
                        <span className="text-foreground">{result.collectible.condition || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Série:</span>{" "}
                        <span className="text-foreground">{result.collectible.series || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {results.every((r) => r.isSelected) ? "Desmarcar todos" : "Selecionar todos"}
          </Button>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSkipAll}
            disabled={isAdding}
          >
            Pular
          </Button>
          <Button
            className="flex-1"
            onClick={onAddSelected}
            disabled={stats.selected === 0 || isAdding}
          >
            {isAdding
              ? "Adicionando..."
              : `Adicionar ${stats.selected > 0 ? `(${stats.selected})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
