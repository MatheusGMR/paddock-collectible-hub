import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, X, ImagePlus, Video, AlertCircle, RefreshCw } from "lucide-react";
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

type Phase = "selecting" | "processing" | "retry-failed" | "reprocessing" | "reviewing";

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
  // Track failed media indices for retry
  const [failedMediaIndices, setFailedMediaIndices] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryInputRef = useRef<HTMLInputElement>(null);
  const [retryTargetIndex, setRetryTargetIndex] = useState<number | null>(null);
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

  /** Consolidate results from processed queue, returning consolidated + failed indices */
  const consolidateResults = (processedQueue: QueuedMedia[]) => {
    const consolidated: ConsolidatedResult[] = [];
    const failed: number[] = [];

    processedQueue.forEach((media, mediaIndex) => {
      if (media.status === "success" && media.results && media.results.length > 0) {
        media.results.forEach((result) => {
          consolidated.push({
            ...result,
            mediaId: media.id,
            mediaIndex,
            isSelected: !result.isDuplicate,
          });
        });
      } else {
        // Failed or no results found
        failed.push(mediaIndex);
      }
    });

    return { consolidated, failed };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setMediaQueue(newMedia);
    setPhase("processing");
    setProgress({ current: 0, total: newMedia.length });

    try {
      const processedQueue = await processQueue(newMedia);
      setMediaQueue(processedQueue);

      const { consolidated, failed } = consolidateResults(processedQueue);

      setConsolidatedResults(consolidated);
      setFailedMediaIndices(failed);

      if (failed.length > 0 && consolidated.length >= 0) {
        // Some images failed - show retry phase
        setPhase("retry-failed");
      } else {
        if (consolidated.length > 0) {
          saveResults(consolidated);
        }
        setPhase("reviewing");
      }
    } catch (error) {
      console.error("[BatchUpload] Processing failed:", error);
      toast({
        title: t.common.error,
        description: "Falha no processamento. Tente novamente.",
        variant: "destructive",
      });
      setPhase("selecting");
    }
  };

  /** Handle replacing a failed image with a new one */
  const handleRetryReplace = (failedIndex: number) => {
    setRetryTargetIndex(failedIndex);
    retryInputRef.current?.click();
  };

  /** Handle file selected for retry replacement */
  const handleRetryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || retryTargetIndex === null) return;

    const file = files[0];
    const base64 = await fileToBase64(file);

    // Replace the failed media item
    const updatedQueue = [...mediaQueue];
    updatedQueue[retryTargetIndex] = {
      ...updatedQueue[retryTargetIndex],
      base64,
      isVideo: file.type.startsWith("video/"),
      status: "pending",
      results: undefined,
      error: undefined,
    };
    setMediaQueue(updatedQueue);

    // Remove from failed list
    setFailedMediaIndices((prev) => prev.filter((i) => i !== retryTargetIndex));

    if (retryInputRef.current) {
      retryInputRef.current.value = "";
    }
    setRetryTargetIndex(null);
  };

  /** Skip a failed image (remove from retry list) */
  const handleRetrySkip = (failedIndex: number) => {
    setFailedMediaIndices((prev) => prev.filter((i) => i !== failedIndex));
  };

  /** Re-process all replaced images and merge results */
  const handleRetryProcess = async () => {
    // Find items that were replaced (status = "pending" after replacement)
    const itemsToReprocess = mediaQueue.filter((m) => m.status === "pending");

    if (itemsToReprocess.length === 0) {
      // No replacements made, just go to review
      if (consolidatedResults.length > 0) {
        saveResults(consolidatedResults);
      }
      setPhase("reviewing");
      return;
    }

    setPhase("reprocessing");
    setProgress({ current: 0, total: itemsToReprocess.length });

    try {
      const reprocessedQueue = await processQueue(itemsToReprocess);

      // Merge reprocessed results into mediaQueue
      const updatedQueue = [...mediaQueue];
      reprocessedQueue.forEach((reprocessed) => {
        const idx = updatedQueue.findIndex((m) => m.id === reprocessed.id);
        if (idx !== -1) {
          updatedQueue[idx] = reprocessed;
        }
      });
      setMediaQueue(updatedQueue);

      // Re-consolidate ALL results from updated queue
      const { consolidated } = consolidateResults(updatedQueue);

      setConsolidatedResults(consolidated);
      setFailedMediaIndices([]);
      if (consolidated.length > 0) {
        saveResults(consolidated);
      }
      setPhase("reviewing");
    } catch (error) {
      console.error("[BatchUpload] Reprocessing failed:", error);
      toast({
        title: t.common.error,
        description: "Falha no reprocessamento. Tente novamente.",
        variant: "destructive",
      });
      setPhase("retry-failed");
    }
  };

  /** Skip all failed and go directly to review */
  const handleSkipAllFailed = () => {
    setFailedMediaIndices([]);
    if (consolidatedResults.length > 0) {
      saveResults(consolidatedResults);
    }
    setPhase("reviewing");
  };

  // Individual item add handler for carousel view
  const handleAddToCollectionSingle = async (index: number) => {
    if (!user) return;
    
    const result = consolidatedResults[index];
    if (!result) return;
    
    setIsAddingToCollection(true);
    
    try {
      const mediaItem = mediaQueue.find(m => m.id === result.mediaId);
      
      let imageUrl: string | undefined;
      let imageToSave = result.croppedImage;
      
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
    setFailedMediaIndices([]);
    setRetryTargetIndex(null);
  };

  const currentMedia = mediaQueue[currentMediaIndex];

  const handleSheetClose = useCallback(() => {
    if (isProcessing) {
      toast({
        title: "Processando...",
        description: "Aguarde a conclusão da análise",
      });
      return;
    }
    if (consolidatedResults.length > 0) {
      saveResults(consolidatedResults);
    }
    onOpenChange(false);
  }, [consolidatedResults, isProcessing, saveResults, onOpenChange, toast]);

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
          {(phase === "processing" || phase === "reprocessing") && (
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
                    {phase === "reprocessing"
                      ? `Reanalisando ${progress.current + 1} de ${progress.total}`
                      : `Analisando ${progress.current + 1} de ${progress.total}`}
                  </p>
                  {phase === "processing" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelProcessing}
                      className="mt-2 text-white/60 hover:text-white"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Retry Failed Images */}
          {phase === "retry-failed" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {failedMediaIndices.length} {failedMediaIndices.length === 1 ? "imagem não identificada" : "imagens não identificadas"}
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">
                  {consolidatedResults.length > 0
                    ? `${consolidatedResults.length} ${consolidatedResults.length === 1 ? "veículo identificado" : "veículos identificados"} com sucesso`
                    : "Nenhum veículo identificado"}
                </p>
                <p className="text-xs text-foreground-secondary mt-2">
                  Substitua as imagens com problema ou pule para ver os resultados
                </p>
              </div>

              {/* Failed images grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {failedMediaIndices.map((failedIdx) => {
                  const media = mediaQueue[failedIdx];
                  if (!media) return null;
                  const isReplaced = media.status === "pending";
                  return (
                    <div
                      key={media.id}
                      className={`relative rounded-xl overflow-hidden border-2 ${
                        isReplaced ? "border-primary" : "border-amber-500/50"
                      }`}
                    >
                      <img
                        src={media.base64}
                        alt={`Foto ${failedIdx + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      {isReplaced && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          Substituída
                        </div>
                      )}
                      {!isReplaced && (
                        <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-6 w-6 text-amber-500" />
                          <span className="text-xs text-foreground font-medium">
                            Não identificado
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2">
                        <Button
                          size="sm"
                          variant={isReplaced ? "outline" : "default"}
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleRetryReplace(failedIdx)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {isReplaced ? "Trocar" : "Substituir"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => handleRetrySkip(failedIdx)}
                        >
                          Pular
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                {/* Show "Re-analyze" if any images were replaced */}
                {mediaQueue.some((m) => m.status === "pending") && (
                  <Button onClick={handleRetryProcess} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reanalisar imagens substituídas
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleSkipAllFailed}
                  className="w-full"
                >
                  {consolidatedResults.length > 0
                    ? `Ver ${consolidatedResults.length} ${consolidatedResults.length === 1 ? "resultado" : "resultados"}`
                    : "Pular e fechar"}
                </Button>
              </div>

              {/* Hidden input for retry file selection */}
              <input
                ref={retryInputRef}
                type="file"
                accept="image/*"
                onChange={handleRetryFileSelect}
                className="hidden"
              />
            </div>
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
