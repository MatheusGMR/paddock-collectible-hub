import { useState, useCallback } from "react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car, Package, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBadge } from "@/components/index/IndexBadge";
import { cn } from "@/lib/utils";
import { ConsolidatedResult } from "./types";
import { MusicPlayer } from "@/components/scanner/MusicPlayer";
import { RealCarGallery } from "@/components/scanner/RealCarGallery";

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

// Collapsible section component
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
    setAddingIndex(originalIndex);
    try {
      await onAddToCollection(originalIndex);
      // Keep selectedIndex in bounds after item is removed
      setTimeout(() => {
        if (selectedIndex >= resultWithOriginalIndices.length - 1) {
          setSelectedIndex(Math.max(0, selectedIndex - 1));
        }
      }, 100);
    } finally {
      setAddingIndex(null);
    }
  };

  const handleSkip = (originalIndex: number) => {
    onSkip(originalIndex);
    // Keep selectedIndex in bounds
    if (selectedIndex >= resultWithOriginalIndices.length - 1) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
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

  // All items processed - show completion screen
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
          <Button onClick={onSkipAll} variant="outline" className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Novo upload
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

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {result.realCar.brand} {result.realCar.model}
          </h3>
          <span className="text-xs text-muted-foreground">
            Foto {result.mediaIndex + 1}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {result.collectible.manufacturer} • {result.collectible.scale} • {result.realCar.year}
        </p>
        
        {/* Multi-item indicator */}
        {remainingResults.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-foreground-secondary">
            <span>{selectedIndex + 1} de {remainingResults.length} restantes • {results.length} total</span>
          </div>
        )}
      </div>

      {/* Card content - scrollable */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Navigation arrows for multiple items */}
        {remainingResults.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-32 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className={cn("h-5 w-5", selectedIndex === 0 ? "text-muted-foreground" : "text-foreground")} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-32 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
              disabled={selectedIndex === remainingResults.length - 1}
            >
              <ChevronRight className={cn("h-5 w-5", selectedIndex === remainingResults.length - 1 ? "text-muted-foreground" : "text-foreground")} />
            </button>
          </>
        )}

        <div className="p-4 space-y-4">
          {/* Hero image - ALWAYS use cropped image with object-contain for consistent display */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
            <img
              src={result.croppedImage}
              alt={`${result.realCar.brand} ${result.realCar.model}`}
              className="w-full h-full object-contain"
            />
            {/* Car badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
              <Car className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-white">{result.realCar.year}</span>
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

          {/* Price Index Badge */}
          {result.priceIndex && (
            <div className="flex justify-center">
              <IndexBadge
                score={result.priceIndex.score}
                tier={result.priceIndex.tier}
              />
            </div>
          )}

          {/* Collapsible Sections */}
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
            
            {/* Music Player - same as scanner */}
            {result.musicSuggestion && (
              <MusicPlayer 
                suggestion={result.musicSuggestion} 
                selectionReason={result.musicSelectionReason}
                listeningTip={result.musicListeningTip}
                carBrand={result.realCar.brand}
              />
            )}
            
            {/* Real Car Photos Gallery - same as scanner */}
            {result.realCarPhotos && result.realCarPhotos.length > 0 && (
              <RealCarGallery 
                photos={result.realCarPhotos} 
                carName={`${result.realCar.brand} ${result.realCar.model}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action buttons - fixed at bottom */}
      <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
        <div className="flex gap-3">
          {result.isDuplicate ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSkip(originalIndex)}
                className="flex-1"
                disabled={isAdding}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Descartar
              </Button>
              <Button
                onClick={() => handleAdd(originalIndex)}
                className="flex-1"
                disabled={isAdding || addingIndex === originalIndex}
              >
                {addingIndex === originalIndex ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar mesmo assim
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleSkip(originalIndex)}
                className="flex-1"
                disabled={isAdding}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular
              </Button>
              <Button
                onClick={() => handleAdd(originalIndex)}
                className="flex-1"
                disabled={isAdding || addingIndex === originalIndex}
              >
                {addingIndex === originalIndex ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t.scanner.addToCollection}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
