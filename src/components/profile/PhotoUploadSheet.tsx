import { useState, useRef } from "react";
import { Upload, Loader2, Camera, X, ImagePlus, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Video } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { addToCollection, checkDuplicateInCollection } from "@/lib/database";
import { uploadCollectionImage, isBase64DataUri } from "@/lib/uploadImage";
import { ResultCarousel } from "@/components/scanner/ResultCarousel";
import { ImageQualityError, ImageQualityIssue } from "@/components/scanner/ImageQualityError";
import { RealCarResults } from "@/components/scanner/RealCarResults";
import { LoadingFacts } from "@/components/scanner/LoadingFacts";
import { cropImageByBoundingBox, BoundingBox } from "@/lib/imageCrop";
import { PriceIndex } from "@/lib/priceIndex";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MAX_VIDEO_SIZE_MB = 20;
const MAX_VIDEO_DURATION_SECONDS = 30;

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

interface QueuedMedia {
  id: string;
  base64: string;
  isVideo: boolean;
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
  // Multi-media queue state
  const [mediaQueue, setMediaQueue] = useState<QueuedMedia[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  // Current image analysis state
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [detectedType, setDetectedType] = useState<"collectible" | "real_car" | null>(null);
  const [realCarResult, setRealCarResult] = useState<RealCarAnalysisResponse | null>(null);
  const [imageQualityError, setImageQualityError] = useState<ImageQualityResponse | null>(null);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMedia: QueuedMedia[] = [];
    
    // Convert all files to base64
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      
      // Validate video size
      if (isVideo && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        toast({
          title: t.scanner.videoTooLarge || "Vídeo muito grande",
          description: `${t.scanner.maxVideoSize || "Máximo"} ${MAX_VIDEO_SIZE_MB}MB`,
          variant: "destructive",
        });
        continue;
      }
      
      const base64 = await fileToBase64(file);
      newMedia.push({
        id: `${Date.now()}-${i}`,
        base64,
        isVideo,
        status: "pending",
      });
    }

    if (newMedia.length === 0) return;

    setMediaQueue(newMedia);
    setCurrentMediaIndex(0);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Start processing queue
    processQueue(newMedia, 0);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processQueue = async (queue: QueuedMedia[], startIndex: number) => {
    setIsProcessingQueue(true);
    
    const updatedQueue = [...queue];
    
    for (let i = startIndex; i < updatedQueue.length; i++) {
      setCurrentMediaIndex(i);
      updatedQueue[i].status = "analyzing";
      setMediaQueue([...updatedQueue]);
      setIsAnalyzingVideo(updatedQueue[i].isVideo);

      try {
        const results = await analyzeMedia(updatedQueue[i].base64, updatedQueue[i].isVideo);
        updatedQueue[i].status = "success";
        updatedQueue[i].results = results;
      } catch (error) {
        console.error("Analysis error:", error);
        updatedQueue[i].status = "error";
        updatedQueue[i].error = "Falha na análise";
      }
      
      setMediaQueue([...updatedQueue]);
    }

    setIsProcessingQueue(false);
    setIsAnalyzingVideo(false);
    
    // Show results for first successful media
    const firstSuccess = updatedQueue.find(media => media.status === "success" && media.results && media.results.length > 0);
    if (firstSuccess) {
      setAnalysisResults(firstSuccess.results || []);
      setCurrentMediaIndex(updatedQueue.indexOf(firstSuccess));
    }
  };

  const analyzeMedia = async (mediaBase64: string, isVideo: boolean): Promise<AnalysisResult[]> => {
    const { data, error } = await supabase.functions.invoke("analyze-collectible", {
      body: { imageBase64: mediaBase64 },
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

    // Crop individual car images (only for images, not videos)
    const itemsWithCrops = await Promise.all(
      response.items.map(async (item) => {
        if (!isVideo && item.boundingBox && mediaBase64) {
          try {
            const croppedImage = await cropImageByBoundingBox(mediaBase64, item.boundingBox as BoundingBox);
            return { ...item, croppedImage };
          } catch (error) {
            console.error("Failed to crop image:", error);
            return { ...item, croppedImage: mediaBase64 };
          }
        }
        return { ...item, croppedImage: isVideo ? undefined : mediaBase64 };
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
      // Upload image to storage if it's a base64 data URI
      let imageUrl: string | undefined;
      const imageToSave = result.croppedImage;
      
      if (imageToSave && isBase64DataUri(imageToSave)) {
        console.log("[PhotoUpload] Uploading image to storage...");
        const uploadedUrl = await uploadCollectionImage(user.id, imageToSave);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log("[PhotoUpload] Image uploaded successfully:", imageUrl);
        } else {
          console.warn("[PhotoUpload] Image upload failed, saving without image");
        }
      } else if (imageToSave) {
        // It's already a URL, use it directly
        imageUrl = imageToSave;
      }

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
          music_selection_reason: result.musicSelectionReason || null,
          real_car_photos: result.realCarPhotos || null,
        },
        imageUrl
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
    // Check if there are more media to process
    const nextMediaIndex = mediaQueue.findIndex(
      (media, idx) => idx > currentMediaIndex && media.status === "success" && media.results && media.results.length > 0
    );
    
    if (nextMediaIndex !== -1) {
      // Move to next media with results
      setCurrentMediaIndex(nextMediaIndex);
      setAnalysisResults(mediaQueue[nextMediaIndex].results || []);
      setAddedIndices(new Set());
      setSkippedIndices(new Set());
    } else {
      // All media processed
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

  const navigateToMedia = (index: number) => {
    const media = mediaQueue[index];
    if (media && media.status === "success" && media.results) {
      setCurrentMediaIndex(index);
      setAnalysisResults(media.results);
      setAddedIndices(new Set());
      setSkippedIndices(new Set());
    }
  };

  const resetState = () => {
    setMediaQueue([]);
    setCurrentMediaIndex(0);
    setIsProcessingQueue(false);
    setAnalysisResults([]);
    setDetectedType(null);
    setRealCarResult(null);
    setImageQualityError(null);
    setAddedIndices(new Set());
    setSkippedIndices(new Set());
    setWarningMessage(null);
    setIsAnalyzingVideo(false);
  };

  const currentMedia = mediaQueue[currentMediaIndex];
  const hasResults = analysisResults.length > 0 || realCarResult !== null || imageQualityError !== null;
  const isAnalyzing = isProcessingQueue || currentMedia?.status === "analyzing";
  const successfulMedia = mediaQueue.filter(media => media.status === "success" && media.results && media.results.length > 0);

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
          {mediaQueue.length === 0 && !hasResults && !isAnalyzing && (
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
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, MP4, MOV (máx {MAX_VIDEO_SIZE_MB}MB)
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
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Multi-media Queue Progress */}
          {mediaQueue.length > 1 && (
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {mediaQueue.length} arquivos selecionados
                </span>
                <span className="text-xs text-foreground-secondary">
                  {currentMediaIndex + 1} de {mediaQueue.length}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {mediaQueue.map((media, idx) => (
                  <button
                    key={media.id}
                    onClick={() => media.status === "success" && navigateToMedia(idx)}
                    className={cn(
                      "relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                      idx === currentMediaIndex
                        ? "border-primary ring-2 ring-primary/30"
                        : media.status === "success"
                        ? "border-emerald-500/50 cursor-pointer hover:border-emerald-500"
                        : media.status === "error"
                        ? "border-destructive/50"
                        : "border-border"
                    )}
                    disabled={media.status !== "success"}
                  >
                    {media.isVideo ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={media.base64}
                        alt={`Arquivo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Status overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      {media.status === "analyzing" && (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      )}
                      {media.status === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                      {media.status === "error" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {media.status === "pending" && (
                        <span className="text-xs text-white/70">{idx + 1}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {/* Navigation arrows for multiple successful media */}
              {successfulMedia.length > 1 && (
                <div className="flex justify-center gap-4 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const prevIdx = successfulMedia.findIndex((_, i) => 
                        mediaQueue.indexOf(successfulMedia[i]) === currentMediaIndex
                      );
                      if (prevIdx > 0) {
                        navigateToMedia(mediaQueue.indexOf(successfulMedia[prevIdx - 1]));
                      }
                    }}
                    disabled={currentMediaIndex === mediaQueue.indexOf(successfulMedia[0])}
                    className="h-8"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const currIdx = successfulMedia.findIndex((_, i) => 
                        mediaQueue.indexOf(successfulMedia[i]) === currentMediaIndex
                      );
                      if (currIdx < successfulMedia.length - 1) {
                        navigateToMedia(mediaQueue.indexOf(successfulMedia[currIdx + 1]));
                      }
                    }}
                    disabled={currentMediaIndex === mediaQueue.indexOf(successfulMedia[successfulMedia.length - 1])}
                    className="h-8"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Loading State with LoadingFacts */}
          {isAnalyzing && currentMedia && (
            <div className="relative flex flex-col items-center justify-center h-[60vh]">
              {/* Media preview behind the loading overlay */}
              <div className="absolute inset-0 opacity-30">
                {currentMedia.isVideo ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={currentMedia.base64}
                    alt="Analyzing"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <LoadingFacts isVideo={isAnalyzingVideo} />
              {mediaQueue.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-xs text-white/70">
                    Analisando {currentMediaIndex + 1} de {mediaQueue.length}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Image Quality Error */}
          {imageQualityError && currentMedia && (
            <div className="p-4">
              <ImageQualityError
                issues={imageQualityError.issues}
                suggestion={imageQualityError.suggestion}
                capturedImage={currentMedia.base64}
                onRetry={handleTryAgain}
              />
            </div>
          )}

          {/* Real Car Results */}
          {realCarResult && realCarResult.car && currentMedia && (
            <RealCarResults
              car={realCarResult.car}
              searchTerms={realCarResult.searchTerms}
              confidence={realCarResult.confidence}
              capturedImage={currentMedia.base64}
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
