import { useState, useCallback, useRef } from "react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car, Package, History, ChevronDown, ChevronUp, Send, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { ScoreHero } from "@/components/scanner/ScoreHero";
import { MarketValueCard } from "@/components/scanner/MarketValueCard";
import { formatBRL } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { ConsolidatedResult } from "./types";
import { MusicPlayer } from "@/components/scanner/MusicPlayer";
import { RealCarGallery } from "@/components/scanner/RealCarGallery";
import { ScanFeedback } from "@/components/scanner/ScanFeedback";

interface BatchCarouselViewProps {
  results: ConsolidatedResult[];
  onAddToCollection: (index: number) => Promise<void>;
  onSkip: (index: number) => void;
  onComplete: () => void;
  onSkipAll: () => void;
  addedIndices: Set<number>;
  skippedIndices: Set<number>;
  isAdding: boolean;
}

// Collapsible section component - same as scanner ResultCarousel
const CollapsibleSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-foreground-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground-secondary" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 px-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-foreground-secondary text-sm">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
};

export function BatchCarouselView({
  results,
  onAddToCollection,
  onSkip,
  onComplete,
  onSkipAll,
  addedIndices,
  skippedIndices,
  isAdding,
}: BatchCarouselViewProps) {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<ConsolidatedResult | null>(null);

  // Get remaining items (not added or skipped)
  const remainingResults = results.filter((_, idx) => !addedIndices.has(idx) && !skippedIndices.has(idx));
  const allProcessed = remainingResults.length === 0;
  const addedCount = addedIndices.size;

  // Map remaining results to their original indices
  const resultWithOriginalIndices = results
    .map((result, originalIndex) => ({ result, originalIndex }))
    .filter(({ originalIndex }) => !addedIndices.has(originalIndex) && !skippedIndices.has(originalIndex));

  const scrollPrev = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);

  const scrollNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(resultWithOriginalIndices.length - 1, prev + 1));
  }, [resultWithOriginalIndices.length]);

  const handleAdd = async (originalIndex: number) => {
    if (addingIndex !== null) return;
    setAddingIndex(originalIndex);
    try {
      await onAddToCollection(originalIndex);
      setJustAddedIndex(originalIndex);
      setTimeout(() => {
        setJustAddedIndex(null);
        if (selectedIndex >= resultWithOriginalIndices.length - 1) {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        }
      }, 400);
    } finally {
      setAddingIndex(null);
    }
  };

  const handleSkip = (originalIndex: number) => {
    onSkip(originalIndex);
    if (selectedIndex >= resultWithOriginalIndices.length - 1) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
  };

  const openBreakdown = (result: ConsolidatedResult) => {
    setBreakdownResult(result);
    setBreakdownOpen(true);
  };

  // Empty state
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

  // All items processed - show completion screen (same as scanner)
  if (allProcessed) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t.scanner.allItemsProcessed}
        </h3>
        <p className="text-sm text-foreground-secondary mb-6">
          {addedCount} {t.scanner.itemsAdded}
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button onClick={onScanAgain} variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t.scanner.scanAgain}
          </Button>
          <Button onClick={onComplete} className="flex-1">
            {t.scanner.viewCollection}
          </Button>
        </div>
      </div>
    );
  }

  // Current item being displayed
  const currentItem = resultWithOriginalIndices[selectedIndex];
  if (!currentItem) return null;

  const { result, originalIndex } = currentItem;

  // Get tier-based card styling - liquid glass with subtle rarity tint (same as scanner)
  const currentTier = result.priceIndex?.tier || "common";
  const getTierAccent = (tier: string) => {
    switch (tier) {
      case "ultra_rare": return { border: "border-amber-400/30", glow: "shadow-[0_-8px_40px_rgba(245,158,11,0.15)]", tint: "rgba(245,158,11,0.06)" };
      case "super_rare": return { border: "border-purple-400/30", glow: "shadow-[0_-8px_40px_rgba(168,85,247,0.15)]", tint: "rgba(168,85,247,0.06)" };
      case "rare": return { border: "border-blue-400/30", glow: "shadow-[0_-8px_40px_rgba(59,130,246,0.15)]", tint: "rgba(59,130,246,0.06)" };
      case "uncommon": return { border: "border-green-400/30", glow: "shadow-[0_-8px_40px_rgba(16,185,129,0.15)]", tint: "rgba(16,185,129,0.06)" };
      default: return { border: "border-white/10", glow: "shadow-[0_-8px_30px_rgba(0,0,0,0.3)]", tint: "rgba(255,255,255,0.02)" };
    }
  };
  const tierAccent = getTierAccent(currentTier);

  // Resolve display image
  const displayImage = result.croppedImage || result.realCarPhotos?.[0] || '';

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header - drag handle style like scanner */}
        <div className="sticky top-0 z-20 pt-3 pb-2 px-4 flex-shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, hsl(var(--card)) 75%, transparent)`,
            backgroundImage: `linear-gradient(to bottom, ${tierAccent.tint}, transparent 40%)`,
          }}
        >
          {/* Visual drag indicator */}
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-3" />
          
          {/* Car title */}
          <h2 className="text-xl font-bold text-foreground text-center">
            {result.realCar.brand} {result.realCar.model}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-0.5">
            {result.collectible.manufacturer} • {result.collectible.scale} • {result.realCar.year}
          </p>
          
          {/* Multi-item indicator */}
          {remainingResults.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-foreground-secondary">
              <span>{selectedIndex + 1} de {remainingResults.length} • {results.length} detectados</span>
            </div>
          )}
        </div>

        {/* Card content - scrollable with navigation arrows */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {/* Navigation arrows */}
          {remainingResults.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-2 top-6 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
                disabled={selectedIndex === 0}
              >
                <ChevronLeft className={cn("h-5 w-5", selectedIndex === 0 ? "text-muted-foreground" : "text-foreground")} />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-2 top-6 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
                disabled={selectedIndex === remainingResults.length - 1}
              >
                <ChevronRight className={cn("h-5 w-5", selectedIndex === remainingResults.length - 1 ? "text-muted-foreground" : "text-foreground")} />
              </button>
            </>
          )}

          <div
            className={cn(
              "px-4 pt-4 pb-2 transition-all duration-300 overflow-x-hidden",
              justAddedIndex === originalIndex && "opacity-0 scale-95"
            )}
          >
            <div className="space-y-4 pb-2">
              {/* Hero image - same aspect ratio and style as scanner */}
              <div className="relative w-full rounded-2xl overflow-hidden">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={displayImage}
                    alt={`${result.realCar.brand} ${result.realCar.model}`}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <Car className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-white">{result.realCar.year}</span>
                  </div>
                </div>
              </div>

              {/* Duplicate Warning */}
              {result.isDuplicate && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {t.scanner.duplicateWarning}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.scanner.duplicateDescription}
                    </p>
                  </div>
                </div>
              )}

              {/* Price Index - ScoreHero with confetti (same as scanner) */}
              {result.priceIndex && (
                <ScoreHero
                  score={result.priceIndex.score}
                  tier={result.priceIndex.tier}
                  onClick={() => openBreakdown(result)}
                />
              )}

              {/* Market Value Card (same as scanner) */}
              {result.marketValue && result.marketValue.min > 0 && (
                <MarketValueCard
                  marketValue={result.marketValue}
                />
              )}

              {/* Collapsible Sections - all closed by default (same as scanner) */}
              <div className="space-y-3">
                {/* Real Car Data */}
                <CollapsibleSection 
                  title="Dados do Carro Real" 
                  icon={<Car className="h-4 w-4 text-primary" />}
                >
                  <div className="space-y-0">
                    <DetailRow label="Marca" value={result.realCar.brand} />
                    <DetailRow label="Modelo" value={result.realCar.model} />
                    <DetailRow label="Ano" value={result.realCar.year} />
                  </div>
                </CollapsibleSection>
                
                {/* Collectible Data */}
                <CollapsibleSection 
                  title="Dados do Colecionável" 
                  icon={<Package className="h-4 w-4 text-primary" />}
                >
                  <div className="space-y-0">
                    <DetailRow label="Fabricante" value={result.collectible.manufacturer} />
                    <DetailRow label="Escala" value={result.collectible.scale} />
                    <DetailRow label="Série" value={result.collectible.series} />
                    <DetailRow label="Estado" value={result.collectible.condition} />
                    <DetailRow label="Origem" value={result.collectible.origin} />
                    <DetailRow label="Cor" value={result.collectible.color} />
                    <DetailRow label="Ano do Modelo" value={result.collectible.estimatedYear} />
                    {result.collectible.notes && (
                      <div className="pt-2">
                        <p className="text-xs text-foreground-secondary mb-1">Notas</p>
                        <p className="text-sm text-foreground/80">{result.collectible.notes}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
                
                {/* Historical Fact */}
                {result.realCar.historicalFact && (
                  <CollapsibleSection 
                    title="Fato Histórico" 
                    icon={<History className="h-4 w-4 text-primary" />}
                  >
                    <p className="text-sm text-foreground/90 leading-relaxed italic">
                      "{result.realCar.historicalFact}"
                    </p>
                  </CollapsibleSection>
                )}
                
                {/* Music Player */}
                {result.musicSuggestion && (
                  <MusicPlayer 
                    suggestion={result.musicSuggestion} 
                    selectionReason={result.musicSelectionReason}
                    listeningTip={result.musicListeningTip}
                    carBrand={result.realCar.brand}
                  />
                )}
                
                {/* Real Car Photos Gallery */}
                {result.realCarPhotos && result.realCarPhotos.length > 0 && (
                  <RealCarGallery 
                    photos={result.realCarPhotos} 
                    carName={`${result.realCar.brand} ${result.realCar.model}`}
                  />
                )}
              </div>

              {/* Duplicate indicator (same as scanner) */}
              {result.isDuplicate && (
                <div className="rounded-xl p-3 flex items-center gap-3 bg-primary/10 border border-primary/30">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      Você já tem este item na coleção
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adicione novamente se possuir mais de uma unidade
                    </p>
                  </div>
                </div>
              )}

              {/* Feedback buttons (same as scanner) */}
              <ScanFeedback
                collectibleData={{
                  manufacturer: result.collectible.manufacturer,
                  scale: result.collectible.scale,
                  year: result.collectible.estimatedYear,
                  origin: result.collectible.origin,
                  series: result.collectible.series,
                  condition: result.collectible.condition,
                  color: result.collectible.color,
                }}
                realCarData={{
                  brand: result.realCar.brand,
                  model: result.realCar.model,
                  year: result.realCar.year,
                }}
              />
            </div>
          </div>
        </div>

        {/* Fixed bottom - action buttons + pagination (same layout as scanner) */}
        <div className="border-t border-border/30 px-4 pt-3 pb-1 flex-shrink-0">
          <div className="flex flex-col gap-2">
            {result.isDuplicate ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSkip(originalIndex)}
                  className="flex-1 border-border text-foreground hover:bg-muted"
                >
                  {t.scanner.discard}
                </Button>
                <Button
                  onClick={() => handleAdd(originalIndex)}
                  disabled={addingIndex !== null}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {addingIndex === originalIndex ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : justAddedIndex === originalIndex ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {t.scanner.addAnyway}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAdd(originalIndex)}
                    disabled={addingIndex !== null}
                    className="flex-1 border-border text-foreground hover:bg-muted"
                    variant="outline"
                  >
                    {addingIndex === originalIndex ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : justAddedIndex === originalIndex ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {t.scanner.addToCollection}
                  </Button>
                  {remainingResults.length > 1 && (
                    <Button
                      variant="ghost"
                      onClick={() => handleSkip(originalIndex)}
                      className="text-foreground hover:bg-muted px-3"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Pagination dots (same as scanner) */}
          {remainingResults.length > 1 && (
            <div className="flex justify-center gap-2 py-2">
              {resultWithOriginalIndices.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === selectedIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          )}

          {/* Bottom safe area */}
          <div className="pb-safe" />
        </div>
      </div>

      {/* Breakdown sheet (same as scanner) */}
      {breakdownResult?.priceIndex && (
        <IndexBreakdown
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          score={breakdownResult.priceIndex.score}
          tier={breakdownResult.priceIndex.tier}
          breakdown={breakdownResult.priceIndex.breakdown}
        />
      )}
    </>
  );
}
