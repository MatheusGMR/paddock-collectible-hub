import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, X, ImagePlus, Video, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { addToCollection } from "@/lib/database";
import { uploadCollectionImage, isBase64DataUri } from "@/lib/uploadImage";
import { LoadingFacts } from "@/components/scanner/LoadingFacts";
import { useNavigate } from "react-router-dom";
import {
  BatchCarouselView,
  MediaQueueGrid,
  useParallelProcessing,
  useBatchPersistence,
  QueuedMedia,
  ConsolidatedResult,
  MAX_PHOTOS_PER_BATCH,
  MAX_VIDEO_SIZE_MB,
} from "./batch-upload";

interface PhotoUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionUpdated?: () => void;
}

type Phase = "selecting" | "processing" | "reviewing";

export const PhotoUploadSheet = ({
  open,
  onOpenChange,
  onCollectionUpdated,
}: PhotoUploadSheetProps) => {
  const [phase, setPhase] = useState<Phase>("selecting");
  const [mediaQueue, setMediaQueue] = useState<QueuedMedia[]>([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [consolidatedResults, setConsolidatedResults] = useState<ConsolidatedResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { hasPendingResults, pendingResults, saveResults, clearResults } = useBatchPersistence();

  const handleMediaUpdate = useCallback((updatedMedia: QueuedMedia) => {
    setMediaQueue((prev) =>
      prev.map((m) => (m.id === updatedMedia.id ? updatedMedia : m))
    );
  }, []);

  const handleProgress = useCallback((current: number, total: number) => {
    setProgress({ current, total });
  }, []);

  const { isProcessing, processQueue, cancelProcessing } = useParallelProcessing({
    userId: user?.id,
    onProgress: handleProgress,
    onMediaUpdate: handleMediaUpdate,
  });

  // Check for pending results on open
  useEffect(() => {
    if (open && hasPendingResults && phase === "selecting") {
      // User has pending results from previous session
      setConsolidatedResults(pendingResults);
      setPhase("reviewing");
    }
  }, [open, hasPendingResults, pendingResults, phase]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Enforce limit
    const filesToProcess = Array.from(files).slice(0, MAX_PHOTOS_PER_BATCH);
    
    if (files.length > MAX_PHOTOS_PER_BATCH) {
      toast({
        title: `Limite de ${MAX_PHOTOS_PER_BATCH} fotos`,
        description: `Apenas as primeiras ${MAX_PHOTOS_PER_BATCH} serão processadas`,
        variant: "default",
      });
    }

    const newMedia: QueuedMedia[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setMediaQueue(newMedia);
    setPhase("processing");
    setProgress({ current: 0, total: newMedia.length });

    // Start parallel processing
    const processedQueue = await processQueue(newMedia);
    setMediaQueue(processedQueue);

    // Consolidate all results
    const consolidated: ConsolidatedResult[] = [];
    processedQueue.forEach((media, mediaIndex) => {
      if (media.status === "success" && media.results) {
        media.results.forEach((result) => {
          consolidated.push({
            ...result,
            mediaId: media.id,
            mediaIndex,
            isSelected: !result.isDuplicate, // Auto-select non-duplicates
          });
        });
      }
    });

    setConsolidatedResults(consolidated);
    saveResults(consolidated);
    setPhase("reviewing");
  };

  // Individual item add handler for carousel view
  const handleAddToCollectionSingle = async (index: number) => {
    if (!user) return;
    
    const result = consolidatedResults[index];
    if (!result) return;
    
    setIsAddingToCollection(true);
    
    try {
      // Get the original media to access its full base64 if cropped image is missing
      const mediaItem = mediaQueue.find(m => m.id === result.mediaId);
      
      // Upload image to storage - prefer cropped, fallback to original media
      let imageUrl: string | undefined;
      let imageToSave = result.croppedImage;
      
      // If no cropped image, try to use the original from mediaQueue
      if (!imageToSave && mediaItem?.base64) {
        imageToSave = mediaItem.base64;
      }

      if (imageToSave && isBase64DataUri(imageToSave)) {
        const uploadedUrl = await uploadCollectionImage(user.id, imageToSave);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      } else if (imageToSave) {
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
      
      // Mark as added
      setAddedIndices(prev => new Set([...prev, index]));
      
      toast({
        title: t.scanner.addedToCollection,
        description: `${result.realCar.brand} ${result.realCar.model}`,
      });
    } catch (error) {
      console.error("Failed to add item:", error);
      toast({
        title: t.common.error,
        description: "Falha ao adicionar item",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCollection(false);
    }
  };
  
  const handleSkipSingle = (index: number) => {
    setSkippedIndices(prev => new Set([...prev, index]));
  };
  
  const handleComplete = () => {
    clearResults();
    resetState();
    onOpenChange(false);
    onCollectionUpdated?.();
  };

  const handleSkipAll = () => {
    clearResults();
    resetState();
  };

  const handleScanWithCamera = () => {
    onOpenChange(false);
    navigate("/scanner");
  };

  const resetState = () => {
    setPhase("selecting");
    setMediaQueue([]);
    setCurrentMediaIndex(0);
    setConsolidatedResults([]);
    setProgress({ current: 0, total: 0 });
    setIsAddingToCollection(false);
    setAddedIndices(new Set());
    setSkippedIndices(new Set());
  };

  const currentMedia = mediaQueue[currentMediaIndex];

  // Allow closing at any time - save state for later resumption
  const handleSheetClose = useCallback(() => {
    // Always save results if we have any
    if (consolidatedResults.length > 0) {
      saveResults(consolidatedResults);
    }
    // Cancel processing if ongoing (will be resumed when sheet reopens)
    if (isProcessing) {
      cancelProcessing();
    }
    onOpenChange(false);
  }, [consolidatedResults, isProcessing, saveResults, cancelProcessing, onOpenChange]);

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        if (!val) {
          handleSheetClose();
        } else {
          onOpenChange(val);
        }
      }}
    >
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {t.profile.uploadPhotos}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSheetClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Initial State - Upload Prompt */}
          {phase === "selecting" && !hasPendingResults && (
            <div className="flex flex-col items-center justify-center flex-1 p-8 gap-6">
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
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Máximo {MAX_PHOTOS_PER_BATCH} fotos
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t.profile.chooseFiles || "Escolher arquivos"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleScanWithCamera}
                  className="w-full"
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

          {/* Processing State */}
          {phase === "processing" && (
            <>
              <MediaQueueGrid
                mediaQueue={mediaQueue}
                currentIndex={currentMediaIndex}
              />
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {currentMedia && (
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
                )}
                <LoadingFacts isVideo={currentMedia?.isVideo} />
                <div className="absolute bottom-8 left-0 right-0 text-center">
                  <p className="text-sm text-white/80 font-medium">
                    Analisando {progress.current + 1} de {progress.total}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelProcessing}
                    className="mt-2 text-white/60 hover:text-white"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Results Review State - Carousel format like scanner */}
          {phase === "reviewing" && (
            <BatchCarouselView
              results={consolidatedResults}
              onAddToCollection={handleAddToCollectionSingle}
              onSkip={handleSkipSingle}
              onComplete={handleComplete}
              onSkipAll={handleSkipAll}
              addedIndices={addedIndices}
              skippedIndices={skippedIndices}
              isAdding={isAddingToCollection}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
