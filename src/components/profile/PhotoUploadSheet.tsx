import { useState, useRef } from "react";
import { Upload, Loader2, Camera, X, ImagePlus, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { addToCollection, checkDuplicateInCollection } from "@/lib/database";
import { ResultCarousel } from "@/components/scanner/ResultCarousel";
import { ImageQualityError, ImageQualityIssue } from "@/components/scanner/ImageQualityError";
import { RealCarResults } from "@/components/scanner/RealCarResults";
import { cropImageByBoundingBox, BoundingBox } from "@/lib/imageCrop";
import { PriceIndex } from "@/lib/priceIndex";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  realCarPhotos?: string[];
  croppedImage?: string;
  isDuplicate?: boolean;
  existingItemImage?: string;
}

interface ImageQualityResponse {
  isValid: boolean;
  issues: ImageQualityIssue[];
  suggestion: string;
}

interface MultiCarAnalysisResponse {
  detectedType?: "collectible" | "real_car";
  imageQuality?: ImageQualityResponse;
  identified: boolean;
  count: number;
  items: AnalysisResult[];
  warning?: string;
  car?: {
    brand: string;
    model: string;
    year: string;
    variant: string;
    bodyStyle: string;
    color: string;
  };
  searchTerms?: string[];
  confidence?: "high" | "medium" | "low";
  error?: string;
}

interface RealCarAnalysisResponse {
  identified: boolean;
  car: {
    brand: string;
    model: string;
    year: string;
    variant: string;
    bodyStyle: string;
    color: string;
  } | null;
  searchTerms: string[];
  confidence: "high" | "medium" | "low";
  error?: string;
}

interface QueuedImage {
  id: string;
  base64: string;
  status: "pending" | "analyzing" | "success" | "error";
  results?: AnalysisResult[];
  error?: string;
}

interface PhotoUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionUpdated?: () => void;
}

export const PhotoUploadSheet = ({
  open,
  onOpenChange,
  onCollectionUpdated,
}: PhotoUploadSheetProps) => {
  // Multi-image queue state
  const [imageQueue, setImageQueue] = useState<QueuedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Current image analysis state
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [detectedType, setDetectedType] = useState<"collectible" | "real_car" | null>(null);
  const [realCarResult, setRealCarResult] = useState<RealCarAnalysisResponse | null>(null);
  const [imageQualityError, setImageQualityError] = useState<ImageQualityResponse | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: QueuedImage[] = [];
    
    // Convert all files to base64
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const base64 = await fileToBase64(file);
      newImages.push({
        id: `${Date.now()}-${i}`,
        base64,
        status: "pending",
      });
    }

    setImageQueue(newImages);
    setCurrentImageIndex(0);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Start processing queue
    processQueue(newImages, 0);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processQueue = async (queue: QueuedImage[], startIndex: number) => {
    setIsProcessingQueue(true);
    
    const updatedQueue = [...queue];
    
    for (let i = startIndex; i < updatedQueue.length; i++) {
      setCurrentImageIndex(i);
      updatedQueue[i].status = "analyzing";
      setImageQueue([...updatedQueue]);

      try {
        const results = await analyzeImage(updatedQueue[i].base64);
        updatedQueue[i].status = "success";
        updatedQueue[i].results = results;
      } catch (error) {
        console.error("Analysis error:", error);
        updatedQueue[i].status = "error";
        updatedQueue[i].error = "Falha na análise";
      }
      
      setImageQueue([...updatedQueue]);
    }

    setIsProcessingQueue(false);
    
    // Show results for first successful image
    const firstSuccess = updatedQueue.find(img => img.status === "success" && img.results && img.results.length > 0);
    if (firstSuccess) {
      setAnalysisResults(firstSuccess.results || []);
      setCurrentImageIndex(updatedQueue.indexOf(firstSuccess));
    }
  };

  const analyzeImage = async (imageBase64: string): Promise<AnalysisResult[]> => {
    const { data, error } = await supabase.functions.invoke("analyze-collectible", {
      body: { imageBase64 },
    });

    if (error) throw error;

    const response = data as MultiCarAnalysisResponse;
    const responseType = response.detectedType || "collectible";
    
    if (responseType === "real_car") {
      if (response.identified && response.car) {
        setDetectedType("real_car");
        setRealCarResult({
          identified: response.identified,
          car: response.car,
          searchTerms: response.searchTerms || [],
          confidence: response.confidence || "medium",
        });
      }
      return [];
    }

    if (response.imageQuality && !response.imageQuality.isValid) {
      setImageQualityError(response.imageQuality);
      return [];
    }

    if (!response.identified || response.count === 0) {
      return [];
    }

    // Crop individual car images
    const itemsWithCrops = await Promise.all(
      response.items.map(async (item) => {
        if (item.boundingBox && imageBase64) {
          try {
            const croppedImage = await cropImageByBoundingBox(imageBase64, item.boundingBox as BoundingBox);
            return { ...item, croppedImage };
          } catch (error) {
            console.error("Failed to crop image:", error);
            return { ...item, croppedImage: imageBase64 };
          }
        }
        return { ...item, croppedImage: imageBase64 };
      })
    );

    // Check for duplicates
    const itemsWithDuplicateCheck = await Promise.all(
      itemsWithCrops.map(async (item) => {
        if (user) {
          try {
            const duplicate = await checkDuplicateInCollection(
              user.id,
              item.realCar.brand,
              item.realCar.model,
              item.collectible?.color
            );
            return {
              ...item,
              isDuplicate: duplicate.isDuplicate,
              existingItemImage: duplicate.existingItemImage,
            };
          } catch (error) {
            console.error("Failed to check duplicate:", error);
            return item;
          }
        }
        return item;
      })
    );

    return itemsWithDuplicateCheck;
  };

  const handleAddToCollection = async (index: number) => {
    if (!user) return;
    
    const result = analysisResults[index];
    
    try {
      await addToCollection(
        user.id,
        {
          real_car_brand: result.realCar.brand,
          real_car_model: result.realCar.model,
          real_car_year: result.realCar.year,
          historical_fact: result.realCar.historicalFact,
          collectible_manufacturer: result.collectible.manufacturer,
          collectible_scale: result.collectible.scale,
          collectible_year: result.collectible.estimatedYear,
          collectible_origin: result.collectible.origin,
          collectible_series: result.collectible.series,
          collectible_condition: result.collectible.condition,
          collectible_notes: result.collectible.notes,
          collectible_color: result.collectible.color,
          price_index: result.priceIndex?.score || null,
          rarity_tier: result.priceIndex?.tier || null,
          index_breakdown: result.priceIndex?.breakdown || null,
          music_suggestion: result.musicSuggestion || null,
          real_car_photos: result.realCarPhotos || null,
        },
        result.croppedImage
      );

      setAddedIndices((prev) => new Set(prev).add(index));
      toast({
        title: t.scanner.addedToCollection,
        description: `${result.realCar.brand} ${result.realCar.model}`,
      });
      
      onCollectionUpdated?.();
    } catch (error) {
      console.error("Failed to add to collection:", error);
      toast({
        title: t.common.error,
        description: t.scanner.failedToAdd,
        variant: "destructive",
      });
    }
  };

  const handleSkip = (index: number) => {
    setSkippedIndices((prev) => new Set(prev).add(index));
  };

  const handleComplete = () => {
    // Check if there are more images to process
    const nextImageIndex = imageQueue.findIndex(
      (img, idx) => idx > currentImageIndex && img.status === "success" && img.results && img.results.length > 0
    );
    
    if (nextImageIndex !== -1) {
      // Move to next image with results
      setCurrentImageIndex(nextImageIndex);
      setAnalysisResults(imageQueue[nextImageIndex].results || []);
      setAddedIndices(new Set());
      setSkippedIndices(new Set());
    } else {
      // All images processed
      resetState();
      onOpenChange(false);
      onCollectionUpdated?.();
    }
  };

  const handleTryAgain = () => {
    resetState();
    fileInputRef.current?.click();
  };

  const handleScanWithCamera = () => {
    onOpenChange(false);
    navigate("/scanner");
  };

  const navigateToImage = (index: number) => {
    const img = imageQueue[index];
    if (img && img.status === "success" && img.results) {
      setCurrentImageIndex(index);
      setAnalysisResults(img.results);
      setAddedIndices(new Set());
      setSkippedIndices(new Set());
    }
  };

  const resetState = () => {
    setImageQueue([]);
    setCurrentImageIndex(0);
    setIsProcessingQueue(false);
    setAnalysisResults([]);
    setDetectedType(null);
    setRealCarResult(null);
    setImageQualityError(null);
    setAddedIndices(new Set());
    setSkippedIndices(new Set());
    setWarningMessage(null);
  };

  const currentImage = imageQueue[currentImageIndex];
  const hasResults = analysisResults.length > 0 || realCarResult !== null || imageQualityError !== null;
  const isAnalyzing = isProcessingQueue || currentImage?.status === "analyzing";
  const successfulImages = imageQueue.filter(img => img.status === "success" && img.results && img.results.length > 0);

  return (
    <Sheet open={open} onOpenChange={(val) => {
      if (!val) resetState();
      onOpenChange(val);
    }}>
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {t.profile.uploadPhotos}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Initial State - Upload Prompt */}
          {imageQueue.length === 0 && !hasResults && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <ImagePlus className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.profile.selectPhotos}
                </h3>
                <p className="text-sm text-foreground-secondary max-w-xs">
                  {t.profile.uploadDescription}
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t.profile.chooseFiles || "Escolher arquivos"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleScanWithCamera}
                  className="w-full border-border text-foreground hover:bg-muted"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {t.profile.useCamera}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Multi-image Queue Progress */}
          {imageQueue.length > 1 && (
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {imageQueue.length} fotos selecionadas
                </span>
                <span className="text-xs text-foreground-secondary">
                  {currentImageIndex + 1} de {imageQueue.length}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {imageQueue.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => img.status === "success" && navigateToImage(idx)}
                    className={cn(
                      "relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentImageIndex
                        ? "border-primary ring-2 ring-primary/30"
                        : img.status === "success"
                        ? "border-green-500/50 cursor-pointer hover:border-green-500"
                        : img.status === "error"
                        ? "border-red-500/50"
                        : "border-border"
                    )}
                    disabled={img.status !== "success"}
                  >
                    <img
                      src={img.base64}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Status overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {img.status === "analyzing" && (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      )}
                      {img.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      )}
                      {img.status === "error" && (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      {img.status === "pending" && (
                        <span className="text-xs text-white/70">{idx + 1}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {/* Navigation arrows for multiple successful images */}
              {successfulImages.length > 1 && (
                <div className="flex justify-center gap-4 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const prevIdx = successfulImages.findIndex((_, i) => 
                        imageQueue.indexOf(successfulImages[i]) === currentImageIndex
                      );
                      if (prevIdx > 0) {
                        navigateToImage(imageQueue.indexOf(successfulImages[prevIdx - 1]));
                      }
                    }}
                    disabled={currentImageIndex === imageQueue.indexOf(successfulImages[0])}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const currIdx = successfulImages.findIndex((_, i) => 
                        imageQueue.indexOf(successfulImages[i]) === currentImageIndex
                      );
                      if (currIdx < successfulImages.length - 1) {
                        navigateToImage(imageQueue.indexOf(successfulImages[currIdx + 1]));
                      }
                    }}
                    disabled={currentImageIndex === imageQueue.indexOf(successfulImages[successfulImages.length - 1])}
                    className="h-8"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && currentImage && (
            <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
              <div className="w-48 h-48 rounded-xl overflow-hidden mb-4">
                <img
                  src={currentImage.base64}
                  alt="Analyzing"
                  className="w-full h-full object-cover"
                />
              </div>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-foreground-secondary">
                {t.scanner.analyzing}
              </p>
              {imageQueue.length > 1 && (
                <p className="text-xs text-foreground-secondary">
                  Analisando foto {currentImageIndex + 1} de {imageQueue.length}
                </p>
              )}
            </div>
          )}

          {/* Image Quality Error */}
          {imageQualityError && currentImage && (
            <div className="p-4">
              <ImageQualityError
                issues={imageQualityError.issues}
                suggestion={imageQualityError.suggestion}
                capturedImage={currentImage.base64}
                onRetry={handleTryAgain}
              />
            </div>
          )}

          {/* Real Car Results */}
          {realCarResult && realCarResult.car && currentImage && (
            <RealCarResults
              car={realCarResult.car}
              searchTerms={realCarResult.searchTerms}
              confidence={realCarResult.confidence}
              capturedImage={currentImage.base64}
              onScanAgain={handleTryAgain}
            />
          )}

          {/* Collectible Results Carousel */}
          {analysisResults.length > 0 && !isAnalyzing && (
            <ResultCarousel
              results={analysisResults}
              onAddToCollection={handleAddToCollection}
              onSkip={handleSkip}
              onComplete={handleComplete}
              onScanAgain={handleTryAgain}
              addedIndices={addedIndices}
              skippedIndices={skippedIndices}
              warning={warningMessage || undefined}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
