import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car, Package, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { IndexBadge } from "@/components/index/IndexBadge";
import { PriceIndex, getRarityTier } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { MusicPlayer } from "./MusicPlayer";
import { RealCarGallery } from "./RealCarGallery";
import { ScanFeedback } from "./ScanFeedback";

import { BoundingBox } from "@/lib/imageCrop";

interface AnalysisResult {
  boundingBox?: BoundingBox;
  realCar: {
    brand: string;
    model: string;
    year: string;
    historicalFact: string;
  };
  collectible: {
    manufacturer: string;
    scale: string;
    estimatedYear: string;
    origin: string;
    series: string;
    condition: string;
    color: string;
    notes: string;
  };
  priceIndex?: PriceIndex;
  musicSuggestion?: string;
  musicSelectionReason?: string;
  realCarPhotos?: string[];
  croppedImage?: string;
  isDuplicate?: boolean;
  existingItemImage?: string;
}

interface ResultCarouselProps {
  results: AnalysisResult[];
  onAddToCollection: (index: number) => Promise<void>;
  onSkip: (index: number) => void;
  onComplete: () => void;
  onScanAgain: () => void;
  addedIndices: Set<number>;
  skippedIndices: Set<number>;
  warning?: string;
}

// Collapsible section component - same pattern as profile
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
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

// Detail row component - same pattern as profile
const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-foreground-secondary text-sm">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
};

export const ResultCarousel = ({
  results,
  onAddToCollection,
  onSkip,
  onComplete,
  onScanAgain,
  addedIndices,
  skippedIndices,
}: ResultCarouselProps) => {
  const { t } = useLanguage();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<AnalysisResult | null>(null);

  // Get remaining items (not added)
  const remainingResults = results.filter((_, idx) => !addedIndices.has(idx));
  const allProcessed = remainingResults.length === 0;
  const addedCount = addedIndices.size;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleAdd = async (originalIndex: number) => {
    setAddingIndex(originalIndex);
    try {
      await onAddToCollection(originalIndex);
      setJustAddedIndex(originalIndex);
      
      // After animation, move to next
      setTimeout(() => {
        setJustAddedIndex(null);
        if (emblaApi) {
          // If there are remaining items after this one, scroll to the current position
          // (which will now show the next item)
          emblaApi.reInit();
        }
      }, 600);
    } finally {
      setAddingIndex(null);
    }
  };

  const handleSkip = (originalIndex: number) => {
    onSkip(originalIndex);
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  };

  const openBreakdown = (result: AnalysisResult) => {
    setBreakdownResult(result);
    setBreakdownOpen(true);
  };

  // All items processed - show completion screen
  if (allProcessed) {
    return (
      <div className="bg-card rounded-t-3xl p-6 safe-bottom animate-slide-up-card -mt-6 relative z-10">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {t.scanner.allItemsProcessed}
            </h3>
            <p className="text-sm text-foreground-secondary mt-1">
              {addedCount} {t.scanner.itemsAdded}
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Button
              onClick={onScanAgain}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t.scanner.scanAgain}
            </Button>
            <Button
              variant="outline"
              onClick={onComplete}
              className="flex-1 border-border text-foreground hover:bg-muted"
            >
              {t.scanner.viewCollection}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Map remaining results to their original indices
  const resultWithOriginalIndices = results
    .map((result, originalIndex) => ({ result, originalIndex }))
    .filter(({ originalIndex }) => !addedIndices.has(originalIndex));

  return (
    <div className="bg-card rounded-t-3xl safe-bottom animate-slide-up-card -mt-6 relative z-10">
      {/* Header with count */}
      {results.length > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <p className="text-sm text-foreground-secondary">
            {results.length} {t.scanner.multipleCarsDetected}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-foreground">
              {selectedIndex + 1} {t.scanner.addingProgress} {remainingResults.length}
            </span>
          </div>
        </div>
      )}

      {/* Carousel */}
      <div className="relative">
        {/* Navigation arrows */}
        {remainingResults.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
              disabled={selectedIndex === 0}
            >
              <ChevronLeft className={cn("h-5 w-5", selectedIndex === 0 ? "text-muted-foreground" : "text-foreground")} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg"
              disabled={selectedIndex === remainingResults.length - 1}
            >
              <ChevronRight className={cn("h-5 w-5", selectedIndex === remainingResults.length - 1 ? "text-muted-foreground" : "text-foreground")} />
            </button>
          </>
        )}

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {resultWithOriginalIndices.map(({ result, originalIndex }) => (
              <div
                key={originalIndex}
                className={cn(
                  "flex-[0_0_100%] min-w-0 p-6 transition-all duration-300",
                  justAddedIndex === originalIndex && "opacity-0 scale-95 -translate-x-10"
                )}
              >
                <div className="space-y-4 max-h-[65vh] overflow-y-auto pb-2">
                  {/* Hero image with gradient overlay - always show car image */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-muted to-muted/50">
                    {result.croppedImage ? (
                      <img
                        src={result.croppedImage}
                        alt={`${result.realCar.brand} ${result.realCar.model}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    )}
                    {/* Car badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                      <Car className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-white">{result.realCar.year}</span>
                    </div>
                  </div>

                  {/* Car title */}
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-foreground">
                      {result.realCar.brand} {result.realCar.model}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {result.collectible.manufacturer} • {result.collectible.scale} • {result.collectible.color || "Original"}
                    </p>
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

                  {/* Price Index Badge - same as profile */}
                  {result.priceIndex && (
                    <div className="flex justify-center">
                      <IndexBadge
                        score={result.priceIndex.score}
                        tier={result.priceIndex.tier}
                        onClick={() => openBreakdown(result)}
                      />
                    </div>
                  )}

                  {/* Collapsible Sections - same structure as profile */}
                  <div className="space-y-3">
                    {/* Real Car Data */}
                    <CollapsibleSection 
                      title="Dados do Carro Real" 
                      icon={<Car className="h-4 w-4 text-primary" />}
                      defaultOpen
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
                      defaultOpen
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

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2 sticky bottom-0 bg-card">
                    {result.isDuplicate ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleSkip(originalIndex)}
                          className="flex-1 border-border text-foreground hover:bg-muted"
                        >
                          {t.scanner.discard}
                        </Button>
                        <Button
                          onClick={() => handleAdd(originalIndex)}
                          disabled={addingIndex === originalIndex}
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
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleAdd(originalIndex)}
                          disabled={addingIndex === originalIndex}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
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
                            variant="outline"
                            onClick={() => handleSkip(originalIndex)}
                            className="border-border text-foreground hover:bg-muted"
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Feedback buttons */}
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
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        {remainingResults.length > 1 && (
          <div className="flex justify-center gap-2 py-3">
            {remainingResults.map((_, idx) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === selectedIndex ? "bg-primary w-4" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Breakdown sheet */}
      {breakdownResult?.priceIndex && (
        <IndexBreakdown
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          score={breakdownResult.priceIndex.score}
          tier={breakdownResult.priceIndex.tier}
          breakdown={breakdownResult.priceIndex.breakdown}
        />
      )}
    </div>
  );
};
