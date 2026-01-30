import { useState, useRef, useCallback, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checkItemInUserCollection, CollectionItemWithIndex } from "@/lib/database";
import { CollectibleDetailCard } from "@/components/collection/CollectibleDetailCard";

interface CollectionScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
}

interface ScanResult {
  found: boolean;
  item?: CollectionItemWithIndex;
  scannedCar?: {
    brand: string;
    model: string;
    color?: string;
  };
}

export const CollectionScannerSheet = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
}: CollectionScannerSheetProps) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { t } = useLanguage();
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: t.common.error,
        description: t.scanner.cameraError,
        variant: "destructive",
      });
    }
  }, [t, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setScanResult(null);
      setShowDetail(false);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    setIsScanning(true);

    try {
      // Analyze the captured image
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data;
      
      if (!response.identified || response.count === 0) {
        toast({
          title: t.scanner.itemNotIdentified,
          description: t.scanner.itemNotIdentifiedDesc,
          variant: "destructive",
        });
        setIsScanning(false);
        return;
      }

      // Get the first identified item
      const firstItem = response.items[0];
      const brand = firstItem.realCar?.brand || "";
      const model = firstItem.realCar?.model || "";
      const color = firstItem.collectible?.color || null;

      // Check if item exists in target user's collection
      const result = await checkItemInUserCollection(targetUserId, brand, model, color);

      setScanResult({
        found: result.found,
        item: result.item,
        scannedCar: { brand, model, color: color || undefined },
      });

      stopCamera();
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: t.scanner.analysisFailed,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [targetUserId, t, toast, stopCamera]);

  const handleRetry = () => {
    setScanResult(null);
    startCamera();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>
            {t.social.checkInCollection} ({targetUsername})
          </SheetTitle>
        </SheetHeader>

        <div className="relative flex-1 h-full">
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera View */}
          {cameraActive && !scanResult && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-[60vh] object-cover"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-primary rounded-xl" />
              </div>

              {/* Capture Button */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <Button
                  size="lg"
                  onClick={captureAndAnalyze}
                  disabled={isScanning}
                  className="rounded-full h-16 w-16"
                >
                  {isScanning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Scanning State */}
          {isScanning && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-lg font-medium">
                {t.social.analyzingItem}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.social.checkingCollection} ({targetUsername})
              </p>
            </div>
          )}

          {/* Result */}
          {scanResult && (
            <div className="p-6 space-y-6">
              {scanResult.found && scanResult.item ? (
                <>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-primary">
                        {t.social.foundInCollection}
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        {targetUsername} {t.social.hasThisItem}
                      </p>
                    </div>
                  </div>

                  {/* Item Preview */}
                  <button
                    onClick={() => setShowDetail(true)}
                    className="w-full bg-muted rounded-xl p-4 flex items-center gap-4 hover:bg-muted/80 transition-colors"
                  >
                    {scanResult.item.image_url && (
                      <img
                        src={scanResult.item.image_url}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="text-left">
                      <p className="font-semibold">
                        {scanResult.item.item?.real_car_brand} {scanResult.item.item?.real_car_model}
                      </p>
                      {scanResult.item.item?.collectible_manufacturer && (
                        <p className="text-sm text-muted-foreground">
                          {scanResult.item.item.collectible_manufacturer}
                        </p>
                      )}
                    </div>
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">
                      {t.social.notFoundInCollection}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {targetUsername} {t.social.doesNotHaveItem}
                    </p>
                    {scanResult.scannedCar && (
                      <p className="text-sm font-medium mt-2">
                        {scanResult.scannedCar.brand} {scanResult.scannedCar.model}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={handleRetry} className="w-full">
                {t.social.scanAnother}
              </Button>
            </div>
          )}
        </div>

        {/* Detail Card */}
        {scanResult?.item && (
          <CollectibleDetailCard
            item={scanResult.item}
            open={showDetail}
            onOpenChange={setShowDetail}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
