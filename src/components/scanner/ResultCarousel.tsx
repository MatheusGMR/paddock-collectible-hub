import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { PriceIndex } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { ScoreHero } from "./ScoreHero";
import { MusicPlayer } from "./MusicPlayer";
import { RealCarGallery } from "./RealCarGallery";
import { CollectibleSpecs } from "./CollectibleSpecs";
import { HistoricalFact } from "./HistoricalFact";

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
      <div className="bg-card border-t border-border p-6 safe-bottom animate-slide-up">
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
    <div className="bg-card border-t border-border safe-bottom animate-slide-up">
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
                  {/* Hero image with gradient overlay */}
                  {result.croppedImage && (
                    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-muted to-muted/50">
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
                  )}

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

                  {/* Score Hero Section */}
                  {result.priceIndex && (
                    <ScoreHero
                      score={result.priceIndex.score}
                      tier={result.priceIndex.tier}
                      onClick={() => openBreakdown(result)}
                      animated={selectedIndex === resultWithOriginalIndices.findIndex(r => r.originalIndex === originalIndex)}
                    />
                  )}

                  {/* Collectible Specs Grid */}
                  <CollectibleSpecs
                    manufacturer={result.collectible.manufacturer}
                    scale={result.collectible.scale}
                    color={result.collectible.color}
                    origin={result.collectible.origin}
                    series={result.collectible.series}
                    condition={result.collectible.condition}
                    year={result.collectible.estimatedYear}
                  />

                  {/* Historical Fact */}
                  {result.realCar.historicalFact && (
                    <HistoricalFact
                      fact={result.realCar.historicalFact}
                      carName={`${result.realCar.brand} ${result.realCar.model}`}
                    />
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

                  {/* Additional Notes */}
                  {result.collectible.notes && (
                    <div className="p-3 rounded-xl bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Observações da IA</p>
                      <p className="text-sm text-foreground/90">{result.collectible.notes}</p>
                    </div>
                  )}

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
