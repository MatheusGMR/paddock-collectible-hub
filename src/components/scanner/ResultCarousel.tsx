import { useState, useCallback, useRef } from "react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car, Package, History, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { IndexBadge } from "@/components/index/IndexBadge";
import { PriceIndex } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";
import { MusicPlayer } from "./MusicPlayer";
import { RealCarGallery } from "./RealCarGallery";
import { ScanFeedback } from "./ScanFeedback";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

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
  originalImage?: string;
  onAddToCollection: (index: number) => Promise<void>;
  onSkip: (index: number) => void;
  onComplete: () => void;
  onScanAgain: () => void;
  addedIndices: Set<number>;
  skippedIndices: Set<number>;
  warning?: string;
}

// Component to show original image with highlighted bounding box
interface HighlightedImageProps {
  originalImage: string;
  croppedImage?: string;
  boundingBox?: BoundingBox;
  carName: string;
  carYear: string;
}

const HighlightedImage = ({ originalImage, croppedImage, boundingBox, carName, carYear }: HighlightedImageProps) => {
  // If no bounding box available, show cropped image or original without highlight
  if (!boundingBox) {
    return (
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-b from-muted to-muted/50">
        <img
          src={croppedImage || originalImage}
          alt={carName}
          className="w-full h-full object-cover"
        />
        {/* Car badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <Car className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-white">{carYear}</span>
        </div>
      </div>
    );
  }

  // With bounding box: show original image with simple highlight border around the car
  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
      {/* Full original image */}
      <img
        src={originalImage}
        alt="Captura original"
        className="w-full h-full object-cover"
      />
      
      {/* Simple highlight border around the detected car - no overlay, just a glowing border */}
      <div 
        className="absolute border-2 border-primary rounded-lg pointer-events-none"
        style={{
          left: `${boundingBox.x}%`,
          top: `${boundingBox.y}%`,
          width: `${boundingBox.width}%`,
          height: `${boundingBox.height}%`,
          boxShadow: '0 0 0 3px hsl(var(--primary) / 0.3), 0 0 20px 4px hsl(var(--primary) / 0.4), inset 0 0 15px hsl(var(--primary) / 0.1)',
        }}
      />
      
      {/* Badge with car name at bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
        <div className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold whitespace-nowrap shadow-lg">
          {carName} • {carYear}
        </div>
      </div>
    </div>
  );
};

// Collapsible section component - same pattern as profile
// defaultOpen is always false for scanner results (closed by default)
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, children }: CollapsibleSectionProps) => {
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
  originalImage,
  onAddToCollection,
  onSkip,
  onComplete,
  onScanAgain,
  addedIndices,
}: ResultCarouselProps) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<AnalysisResult | null>(null);
  const [snapPoint, setSnapPoint] = useState<string | number>("85%");

  // Get remaining items (not added)
  const remainingResults = results.filter((_, idx) => !addedIndices.has(idx));
  const allProcessed = remainingResults.length === 0;
  const addedCount = addedIndices.size;

  // Map remaining results to their original indices
  const resultWithOriginalIndices = results
    .map((result, originalIndex) => ({ result, originalIndex }))
    .filter(({ originalIndex }) => !addedIndices.has(originalIndex));

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
      setJustAddedIndex(originalIndex);
      
      // After animation, reset
      setTimeout(() => {
        setJustAddedIndex(null);
        // Keep selectedIndex in bounds after item is removed
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
    // Keep selectedIndex in bounds
    if (selectedIndex >= resultWithOriginalIndices.length - 1) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
  };

  const openBreakdown = (result: AnalysisResult) => {
    setBreakdownResult(result);
    setBreakdownOpen(true);
  };

  // All items processed - show completion screen
  if (allProcessed) {
    return (
      <div className="bg-card rounded-t-3xl p-6 safe-bottom animate-slide-up-card relative z-10 -mt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
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

  // Current item being displayed
  const currentItem = resultWithOriginalIndices[selectedIndex];
  if (!currentItem) return null;

  const { result, originalIndex } = currentItem;

  return (
    <Drawer 
      open={true}
      snapPoints={["15%", "85%"]}
      activeSnapPoint={snapPoint}
      setActiveSnapPoint={setSnapPoint}
      modal={false}
      dismissible={false}
    >
      <DrawerContent className="h-[92vh] rounded-t-[28px] bg-card border-0 overflow-hidden pb-safe">
        {/* Drag handle with car title */}
        <div 
          className="sticky top-0 z-20 bg-card pt-3 pb-2 cursor-grab active:cursor-grabbing"
        >
          {/* Visual drag indicator */}
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-3" />
          
          {/* Car title as main header */}
          <h2 className="text-xl font-bold text-foreground text-center px-4">
            {result.realCar.brand} {result.realCar.model}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-0.5">
            {result.collectible.manufacturer} • {result.collectible.scale} • {result.realCar.year}
          </p>
          
          {/* Multi-car indicator */}
          {results.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-foreground-secondary">
              <span>{selectedIndex + 1} de {remainingResults.length} • {results.length} detectados</span>
            </div>
          )}
        </div>

      {/* Single item view - vertical scroll only, no horizontal scroll */}
      <div className="relative overflow-hidden overflow-x-hidden">
        {/* Navigation arrows for multiple items */}
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

        {/* Current item - vertical scroll only, locked horizontal */}
        <div
          className={cn(
            "px-4 pt-4 pb-2 transition-all duration-300 overflow-x-hidden",
            justAddedIndex === originalIndex && "opacity-0 scale-95"
          )}
        >
          <div className="space-y-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pb-2">
            {/* Hero image with highlighted bounding box for context */}
            <HighlightedImage
              originalImage={originalImage || result.croppedImage || ""}
              croppedImage={result.croppedImage}
              boundingBox={result.boundingBox}
              carName={`${result.realCar.brand} ${result.realCar.model}`}
              carYear={result.realCar.year}
            />

            {/* Duplicate Warning */}

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

            {/* Collapsible Sections - all closed by default */}
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

        {/* Pagination dots */}
        {remainingResults.length > 1 && (
          <div className="flex justify-center gap-2 py-3 bg-card">
            {remainingResults.map((_, idx) => (
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
        
        {/* Bottom safe area fill */}
        <div className="bg-card pb-safe" />
      </div>
      </DrawerContent>

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
    </Drawer>
  );
};
