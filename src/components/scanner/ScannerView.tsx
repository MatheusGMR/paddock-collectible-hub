import { useState, useRef, useCallback, useEffect } from "react";
import { X, Zap, RotateCcw, Check, Plus, Camera, SwitchCamera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addToCollection, checkItemInCollection } from "@/lib/database";
import { useNavigate } from "react-router-dom";
import { IndexBadge } from "@/components/index/IndexBadge";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { PriceIndex } from "@/lib/priceIndex";

interface AnalysisResult {
  identified: boolean;
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
    notes: string;
  };
  priceIndex?: PriceIndex;
}

export const ScannerView = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInCollection, setIsInCollection] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    if (cameraActive) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [cameraActive, startCamera, stopCamera]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageBase64);
    stopCamera();
    setIsScanning(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (!data.identified) {
        toast({
          title: "Item Not Identified",
          description: "Could not identify a collectible car in the image. Please try again with a clearer photo.",
          variant: "destructive",
        });
        setAnalysisResult(null);
      } else {
        setAnalysisResult(data);
        
        // Check if already in collection
        if (user) {
          const inCollection = await checkItemInCollection(
            user.id,
            data.realCar.brand,
            data.realCar.model
          );
          setIsInCollection(inCollection);
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [stopCamera, toast, user]);

  const handleAddToCollection = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to add items to your collection.",
      });
      navigate("/auth");
      return;
    }

    if (!analysisResult) return;

    setIsAddingToCollection(true);

    try {
      await addToCollection(
        user.id,
        {
          real_car_brand: analysisResult.realCar.brand,
          real_car_model: analysisResult.realCar.model,
          real_car_year: analysisResult.realCar.year,
          historical_fact: analysisResult.realCar.historicalFact,
          collectible_manufacturer: analysisResult.collectible.manufacturer,
          collectible_scale: analysisResult.collectible.scale,
          collectible_year: analysisResult.collectible.estimatedYear,
          collectible_origin: analysisResult.collectible.origin,
          collectible_series: analysisResult.collectible.series,
          collectible_condition: analysisResult.collectible.condition,
          collectible_notes: analysisResult.collectible.notes,
          price_index: analysisResult.priceIndex?.score || null,
          rarity_tier: analysisResult.priceIndex?.tier || null,
          index_breakdown: analysisResult.priceIndex?.breakdown || null,
        },
        capturedImage || undefined
      );

      toast({
        title: "Added to collection!",
        description: `${analysisResult.realCar.brand} ${analysisResult.realCar.model} has been added.`,
      });
      
      setIsInCollection(true);
    } catch (error) {
      console.error("Add to collection error:", error);
      toast({
        title: "Error",
        description: "Failed to add item to collection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const resetScan = useCallback(() => {
    setAnalysisResult(null);
    setCapturedImage(null);
    setIsInCollection(false);
    setBreakdownOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    window.history.back();
  }, [stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Camera/Preview View */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {capturedImage && !cameraActive && (
          <img
            src={capturedImage}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {!cameraActive && !capturedImage && (
          <div className="absolute inset-0 bg-gradient-to-b from-background-secondary to-background opacity-50" />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Scanner Frame */}
        <div className="absolute inset-8 border-2 border-primary/50 rounded-2xl pointer-events-none">
          <div className="absolute -top-px -left-px w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-2xl" />
          <div className="absolute -top-px -right-px w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-2xl" />
          <div className="absolute -bottom-px -left-px w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-2xl" />
          <div className="absolute -bottom-px -right-px w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-2xl" />

          {isScanning && (
            <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
          )}
        </div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {cameraActive && (
          <button
            onClick={switchCamera}
            className="absolute top-4 left-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
          >
            <SwitchCamera className="h-6 w-6 text-foreground" />
          </button>
        )}

        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm font-medium text-primary">
                Analyzing collectible...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results Panel */}
      {analysisResult ? (
        <div className="bg-card border-t border-border p-6 animate-slide-up safe-bottom max-h-[60vh] overflow-y-auto">
          {isInCollection && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-primary/10 rounded-lg">
              <Check className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Already in your collection</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {analysisResult.realCar.brand} {analysisResult.realCar.model}
              </h3>
              <p className="text-sm text-foreground-secondary mb-3">
                {analysisResult.realCar.year}
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs uppercase tracking-wide text-primary mb-1">Historical Fact</p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {analysisResult.realCar.historicalFact}
                </p>
              </div>
            </div>

            {/* Price Index Badge */}
            {analysisResult.priceIndex && (
              <IndexBadge
                score={analysisResult.priceIndex.score}
                tier={analysisResult.priceIndex.tier}
                onClick={() => setBreakdownOpen(true)}
              />
            )}

            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-primary mb-3">Collectible Details</p>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Manufacturer" value={analysisResult.collectible.manufacturer} />
                <InfoRow label="Scale" value={analysisResult.collectible.scale} />
                <InfoRow label="Year" value={analysisResult.collectible.estimatedYear} />
                <InfoRow label="Origin" value={analysisResult.collectible.origin} />
                <InfoRow label="Series" value={analysisResult.collectible.series || "N/A"} />
                <InfoRow label="Condition" value={analysisResult.collectible.condition} />
              </div>
              {analysisResult.collectible.notes && (
                <p className="text-xs text-foreground-secondary mt-3">
                  {analysisResult.collectible.notes}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              {!isInCollection && (
                <Button 
                  onClick={handleAddToCollection}
                  disabled={isAddingToCollection}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isAddingToCollection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add to Collection
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground hover:bg-muted"
                onClick={resetScan}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Scan Again
              </Button>
            </div>
          </div>

          {/* Index Breakdown Sheet */}
          {analysisResult.priceIndex && (
            <IndexBreakdown
              open={breakdownOpen}
              onOpenChange={setBreakdownOpen}
              score={analysisResult.priceIndex.score}
              tier={analysisResult.priceIndex.tier}
              breakdown={analysisResult.priceIndex.breakdown}
            />
          )}
        </div>
      ) : (
        <div className="bg-card border-t border-border p-6 safe-bottom">
          <div className="flex flex-col items-center gap-4">
            {!cameraActive && !capturedImage ? (
              <>
                <p className="text-sm text-foreground-secondary text-center">
                  Tap below to open camera and scan your collectible
                </p>
                <Button
                  onClick={startCamera}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
              </>
            ) : cameraActive ? (
              <>
                <p className="text-sm text-foreground-secondary text-center">
                  Position your collectible in the frame
                </p>
                <Button
                  onClick={capturePhoto}
                  disabled={isScanning}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Capture & Analyze
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground-secondary text-center">
                  Analysis failed. Try again with a clearer photo.
                </p>
                <Button
                  onClick={resetScan}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-foreground-secondary">{label}</p>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);
