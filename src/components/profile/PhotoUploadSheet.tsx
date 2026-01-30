import { useState, useRef } from "react";
import { Upload, Loader2, Camera, X } from "lucide-react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageBase64 = event.target?.result as string;
      setCapturedImage(imageBase64);
      await analyzeImage(imageBase64);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setImageQualityError(null);
    setAnalysisResults([]);
    setRealCarResult(null);
    setDetectedType(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      if (responseType === "real_car") {
        if (!response.identified || !response.car) {
          toast({
            title: t.scanner.couldNotIdentify,
            description: response.error || t.scanner.tryDifferentAngle,
            variant: "destructive",
          });
          setRealCarResult(null);
        } else {
          setRealCarResult({
            identified: response.identified,
            car: response.car,
            searchTerms: response.searchTerms || [],
            confidence: response.confidence || "medium",
          });
        }
      } else {
        if (response.imageQuality && !response.imageQuality.isValid) {
          setImageQualityError(response.imageQuality);
          setAnalysisResults([]);
          return;
        }

        setImageQualityError(null);

        if (!response.identified || response.count === 0) {
          toast({
            title: t.scanner.itemNotIdentified,
            description: t.scanner.itemNotIdentifiedDesc,
            variant: "destructive",
          });
          setAnalysisResults([]);
        } else {
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

          setAnalysisResults(itemsWithDuplicateCheck);
          setAddedIndices(new Set());
          setSkippedIndices(new Set());

          if (response.warning) {
            setWarningMessage(response.warning);
            toast({
              title: t.scanner.maxCarsWarning,
              description: response.warning,
            });
          }
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: t.scanner.analysisFailed,
        description: t.scanner.analysisFailedDesc,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
    resetState();
    onOpenChange(false);
    onCollectionUpdated?.();
  };

  const handleTryAgain = () => {
    resetState();
    fileInputRef.current?.click();
  };

  const handleScanWithCamera = () => {
    onOpenChange(false);
    navigate("/scanner");
  };

  const resetState = () => {
    setCapturedImage(null);
    setAnalysisResults([]);
    setDetectedType(null);
    setRealCarResult(null);
    setImageQualityError(null);
    setAddedIndices(new Set());
    setSkippedIndices(new Set());
    setWarningMessage(null);
  };

  const hasResults = analysisResults.length > 0 || realCarResult !== null || imageQualityError !== null;

  return (
    <Sheet open={open} onOpenChange={(val) => {
      if (!val) resetState();
      onOpenChange(val);
    }}>
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {t.profile.uploadPhotos || "Carregar Fotos"}
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
          {!hasResults && !isAnalyzing && !capturedImage && (
            <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {t.profile.selectPhotos || "Selecione suas fotos"}
                </h3>
                <p className="text-sm text-foreground-secondary max-w-xs">
                  {t.profile.uploadDescription || "Carregue fotos dos seus carrinhos para análise automática e adicionar à coleção"}
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t.profile.chooseFile || "Escolher arquivo"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleScanWithCamera}
                  className="w-full border-border text-foreground hover:bg-muted"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {t.profile.useCamera || "Usar câmera"}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
              {capturedImage && (
                <div className="w-48 h-48 rounded-xl overflow-hidden mb-4">
                  <img
                    src={capturedImage}
                    alt="Analyzing"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-foreground-secondary">
                {t.scanner.analyzing || "Analisando..."}
              </p>
            </div>
          )}

          {/* Image Quality Error */}
          {imageQualityError && capturedImage && (
            <div className="p-4">
              <ImageQualityError
                issues={imageQualityError.issues}
                suggestion={imageQualityError.suggestion}
                capturedImage={capturedImage}
                onRetry={handleTryAgain}
              />
            </div>
          )}

          {/* Real Car Results */}
          {realCarResult && realCarResult.car && capturedImage && (
            <RealCarResults
              car={realCarResult.car}
              searchTerms={realCarResult.searchTerms}
              confidence={realCarResult.confidence}
              capturedImage={capturedImage}
              onScanAgain={handleTryAgain}
            />
          )}

          {/* Collectible Results Carousel */}
          {analysisResults.length > 0 && (
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
