import { useState, useCallback, useRef, useEffect } from "react";
import { Check, Plus, RotateCcw, ChevronLeft, ChevronRight, Loader2, CheckCircle2, SkipForward, AlertTriangle, Car, Package, History, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { ScoreHero } from "@/components/scanner/ScoreHero";
import { PriceIndex } from "@/lib/priceIndex";
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
  musicListeningTip?: string;
  realCarPhotos?: string[];
  croppedImage?: string;
  isDuplicate?: boolean;
  existingItemImage?: string;
}

interface ResultCarouselProps {
  results: AnalysisResult[];
  originalImage?: string;
  onAddToCollection: (index: number) => Promise<void>;
  onAddAndPost: (index: number) => Promise<void>;
  onSkip: (index: number) => void;
  onComplete: () => void;
  onScanAgain: () => void;
  addedIndices: Set<number>;
  skippedIndices: Set<number>;
  warning?: string;
  mlVariantId?: string; // ML A/B testing variant ID
}

// Component to show car image with bounding box indicator on original photo
interface HighlightedImageProps {
  originalImage: string;
  croppedImage?: string;
  boundingBox?: BoundingBox;
  carName: string;
  carYear: string;
  totalResults?: number;
}

const HighlightedImage = ({ originalImage, croppedImage, boundingBox, carName, carYear, totalResults = 1 }: HighlightedImageProps) => {
  // For multi-car: show original image with bounding box overlay so user knows which car
  // For single car: show cropped image directly
  const showBoundingBoxOverlay = totalResults > 1 && boundingBox && originalImage;
  
  if (showBoundingBoxOverlay) {
    return (
      <div className="space-y-2">
        {/* Original image with bounding box indicator */}
        <div className="relative w-full rounded-2xl overflow-hidden bg-muted p-2">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <img
              src={originalImage}
              alt="Foto original"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute border-2 border-primary rounded-lg shadow-[0_0_12px_rgba(var(--primary),0.4)] pointer-events-none transition-all"
              style={{
                left: `${boundingBox.x}%`,
                top: `${boundingBox.y}%`,
                width: `${boundingBox.width}%`,
                height: `${boundingBox.height}%`,
              }}
            >
              <div className="absolute -top-6 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-semibold whitespace-nowrap">
                <Car className="h-3 w-3" />
                {carName}
              </div>
              <div className="absolute -top-[2px] -left-[2px] w-3 h-3 border-t-2 border-l-2 border-primary rounded-tl-md" />
              <div className="absolute -top-[2px] -right-[2px] w-3 h-3 border-t-2 border-r-2 border-primary rounded-tr-md" />
              <div className="absolute -bottom-[2px] -left-[2px] w-3 h-3 border-b-2 border-l-2 border-primary rounded-bl-md" />
              <div className="absolute -bottom-[2px] -right-[2px] w-3 h-3 border-b-2 border-r-2 border-primary rounded-br-md" />
            </div>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(to bottom, 
                rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) ${boundingBox.y}%, 
                transparent ${boundingBox.y}%, transparent ${boundingBox.y + boundingBox.height}%, 
                rgba(0,0,0,0.4) ${boundingBox.y + boundingBox.height}%, rgba(0,0,0,0.4) 100%)`
            }} />
          </div>
        </div>
        {croppedImage && (
          <div className="relative w-full rounded-2xl overflow-hidden bg-muted p-2">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={croppedImage}
                alt={carName}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                <Car className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-white">{carYear}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single car or no bounding box: show original image directly (no crop needed)
  const displayImage = originalImage || croppedImage;
  
  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-muted p-2">
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted">
        <img
          src={displayImage}
          alt={carName}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <Car className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-white">{carYear}</span>
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
  onAddAndPost,
  onSkip,
  onComplete,
  onScanAgain,
  addedIndices,
  mlVariantId,
}: ResultCarouselProps) => {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownResult, setBreakdownResult] = useState<AnalysisResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const expandedAtDragStart = useRef(true);

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

  // Touch handlers for smooth drag gesture on the image/handle area
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
    expandedAtDragStart.current = isExpanded;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - dragStartYRef.current;
    // Only start tracking drag after a small threshold
    if (Math.abs(deltaY) > 5) {
      isDraggingRef.current = true;
      // Allow dragging down when expanded, or up when collapsed
      if (expandedAtDragStart.current) {
        // When expanded: only allow dragging DOWN (positive deltaY)
        setDragOffset(Math.max(0, deltaY));
      } else {
        // When collapsed: only allow dragging UP (negative deltaY), map to visual offset
        setDragOffset(Math.min(0, deltaY));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - dragStartYRef.current;
    
    if (!isDraggingRef.current && Math.abs(deltaY) < 10) {
      // It was a tap, toggle
      setIsExpanded(prev => !prev);
    } else {
      // Swipe gesture
      if (expandedAtDragStart.current && deltaY > 80) {
        setIsExpanded(false);
      } else if (!expandedAtDragStart.current && deltaY < -80) {
        setIsExpanded(true);
      }
      // Otherwise snap back
    }
    setDragOffset(0);
    isDraggingRef.current = false;
  };

  // Get tier-based card styling - solid backgrounds for readability
  const currentTier = result.priceIndex?.tier || "common";
  const getTierCardGradient = (tier: string) => {
    switch (tier) {
      case "ultra_rare": return "from-amber-950 via-card to-card border-amber-500/40";
      case "super_rare": return "from-purple-950 via-card to-card border-purple-500/40";
      case "rare": return "from-blue-950 via-card to-card border-blue-500/40";
      case "uncommon": return "from-green-950 via-card to-card border-green-500/40";
      default: return "from-card via-card to-card border-border/30";
    }
  };

  return (
    <>
      {/* Fixed card with CSS animation - rarity-tinted background */}
      <div 
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[28px]",
          "bg-gradient-to-b border-t",
          getTierCardGradient(currentTier),
          "overflow-hidden",
          "animate-slide-up-card shadow-[0_-8px_30px_rgba(0,0,0,0.3)]",
          isExpanded ? "max-h-[85vh]" : "max-h-[20vh]",
          dragOffset === 0 && "transition-[max-height,transform] duration-300 ease-out"
        )}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}
      >
        {/* Drag handle with car title */}
        <div 
          className="sticky top-0 z-20 pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
          <div className="space-y-4 max-h-[50vh] overflow-y-auto overflow-x-hidden pb-2">
            {/* Hero image with highlighted bounding box for context */}
            <HighlightedImage
              originalImage={originalImage || result.croppedImage || ""}
              croppedImage={result.croppedImage}
              boundingBox={result.boundingBox}
              carName={`${result.realCar.brand} ${result.realCar.model}`}
              carYear={result.realCar.year}
              totalResults={results.length}
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

            {/* Price Index Badge - opens breakdown with full details */}
            {result.priceIndex && (
              <ScoreHero
                score={result.priceIndex.score}
                tier={result.priceIndex.tier}
                onClick={() => openBreakdown(result)}
              />
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

            {/* Duplicate warning indicator - only shown when item already exists */}
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

            {/* Feedback buttons */}
            <ScanFeedback
              variantId={mlVariantId}
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

        {/* Fixed bottom section - action buttons + pagination + safe area */}
        <div className="border-t border-border/30 px-4 pt-3 pb-1 flex-shrink-0">
          {/* Action buttons */}
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
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAdd(originalIndex)}
                    disabled={addingIndex === originalIndex}
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
                <Button
                  onClick={() => onAddAndPost(originalIndex)}
                  disabled={addingIndex === originalIndex}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Adicionar e Anunciar
                </Button>
              </>
            )}
          </div>

          {/* Pagination dots */}
          {remainingResults.length > 1 && (
            <div className="flex justify-center gap-2 py-2">
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
          <div className="pb-safe" />
        </div>
      </div>
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
    </>
  );
};
