import { useState, useRef, useCallback, useEffect } from "react";
import { X, RotateCcw, Camera as CameraIcon, SwitchCamera, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGuidedTips } from "@/contexts/GuidedTipsContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { addToCollection, checkDuplicateInCollection } from "@/lib/database";
import { useNavigate } from "react-router-dom";
import { CaptureButton } from "@/components/scanner/CaptureButton";
import { ResultCarousel } from "@/components/scanner/ResultCarousel";
import { ImageQualityError, ImageQualityIssue } from "@/components/scanner/ImageQualityError";
import { RealCarResults } from "@/components/scanner/RealCarResults";
import { LoadingFacts } from "@/components/scanner/LoadingFacts";
import { PriceIndex } from "@/lib/priceIndex";
import { cropImageByBoundingBox, BoundingBox, extractFrameFromVideo } from "@/lib/imageCrop";
import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { trackInteraction, trackEvent } from "@/lib/analytics";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { useNativeCameraPreview } from "@/hooks/useNativeCameraPreview";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera } from "@capacitor/camera";
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
  croppedImage?: string; // Will be populated after cropping
  isDuplicate?: boolean; // Duplicate detection flag
  existingItemImage?: string; // Image of existing item if duplicate
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
  // Real car specific fields (when detectedType === "real_car")
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

const MAX_RECORDING_DURATION = 15; // seconds (reduced for AI processing)

export const ScannerView = () => {
  // Set notch/status bar to black for immersive camera experience
  useThemeColor("scanner");
  
  // State for camera
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  
  // Detected type from AI (auto-detected, not user selected)
  const [detectedType, setDetectedType] = useState<"collectible" | "real_car" | null>(null);
  
  // Real car results state
  const [realCarResult, setRealCarResult] = useState<RealCarAnalysisResponse | null>(null);
  
  // Image quality validation state
  const [imageQualityError, setImageQualityError] = useState<ImageQualityResponse | null>(null);
  
  // Multi-car state
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [skippedIndices, setSkippedIndices] = useState<Set<number>>(new Set());
  
  // Video recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  
  // Flash effect state
  const [showFlash, setShowFlash] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPressedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const nativeCamera = useNativeCamera();
  const cameraPreview = useNativeCameraPreview();
  
  // Track if we're using native camera preview (embedded live preview) vs fallback (opens native UI)
  const [useNativeFallback, setUseNativeFallback] = useState(false);
  // Track if using embedded camera preview (iOS/Android)
  const [useCameraPreview, setUseCameraPreview] = useState(false);
  
  // Only trigger guided tips when camera is active and not in error state
  const { startScreenTips } = useGuidedTips();
  
  // Show tips only after camera successfully initializes
  useEffect(() => {
    if (cameraActive && !cameraError && !isInitializing) {
      const timer = setTimeout(() => {
        startScreenTips("scanner");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cameraActive, cameraError, isInitializing, startScreenTips]);

  // Cleanup video preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Effect to attach stream to video element when cameraActive changes
  useEffect(() => {
    const attachStreamToVideo = async () => {
      if (cameraActive && videoRef.current && streamRef.current) {
        console.log("[Scanner] Attaching stream to video element");
        videoRef.current.srcObject = streamRef.current;
        try {
          await videoRef.current.play();
          console.log("[Scanner] Video playback started");
        } catch (err) {
          console.warn("[Scanner] Video play() failed:", err);
        }
      }
    };
    
    attachStreamToVideo();
  }, [cameraActive]);

  // Auto-start camera on mount - use camera-preview on iOS/Android for immersive experience
  // IMPORTANT: Empty dependency array to run only once on mount
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      if (!mounted) return;
      
      console.log("[Scanner] Initializing camera (once)...");
      console.log("[Scanner] Platform:", Capacitor.getPlatform(), "isNative:", Capacitor.isNativePlatform());
      setIsInitializing(true);
      setCameraError(false);
      setUseNativeFallback(false);
      setUseCameraPreview(false);
      
      // On native platforms (iOS/Android), use camera-preview for embedded live feed
      if (Capacitor.isNativePlatform()) {
        console.log("[Scanner] Native platform detected, using camera-preview for immersive experience");
        
        try {
          // First check camera permissions
          const permissions = await CapacitorCamera.checkPermissions();
          if (!mounted) return;
          
          console.log("[Scanner] Camera permission state:", permissions.camera);
          
          // Request permission if needed
          if (permissions.camera === 'prompt' || permissions.camera === 'prompt-with-rationale') {
            console.log("[Scanner] Requesting camera permission...");
            const requested = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
            console.log("[Scanner] Permission result:", requested.camera);
            
            if (requested.camera === 'denied') {
              console.log("[Scanner] Permission denied by user");
              if (mounted) {
                setCameraError(true);
                setIsInitializing(false);
                toast({
                  title: t.common.error,
                  description: "Permissão de câmera negada. Vá em Ajustes > Paddock > Câmera para habilitar.",
                  variant: "destructive",
                });
              }
              return;
            }
          } else if (permissions.camera === 'denied') {
            console.log("[Scanner] Camera permission denied");
            if (mounted) {
              setCameraError(true);
              setIsInitializing(false);
              toast({
                title: t.common.error,
                description: "Permissão de câmera negada. Vá em Ajustes > Paddock > Câmera para habilitar.",
                variant: "destructive",
              });
            }
            return;
          }
          
          // Permission granted - start camera preview
          console.log("[Scanner] Permission granted, starting camera-preview...");
          const started = await cameraPreview.start();
          
          if (!mounted) {
            // Cleanup if unmounted
            cameraPreview.stop();
            return;
          }
          
          if (started) {
            console.log("[Scanner] Camera-preview started successfully");
            setUseCameraPreview(true);
            setCameraActive(true);
            setIsInitializing(false);
          } else {
            // Fallback to native camera UI if camera-preview fails
            console.log("[Scanner] Camera-preview failed, falling back to native camera UI");
            setUseNativeFallback(true);
            setCameraActive(false);
            setIsInitializing(false);
          }
        } catch (error) {
          console.error("[Scanner] Camera-preview error:", error);
          if (mounted) {
            // Fallback to native camera UI
            setUseNativeFallback(true);
            setCameraActive(false);
            setIsInitializing(false);
          }
        }
        
        return;
      }
      
      // Web platform - use getUserMedia
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log("[Scanner] getUserMedia not available");
          throw new Error("getUserMedia not supported");
        }

        console.log("[Scanner] Requesting camera stream (web)...");
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log("[Scanner] Camera stream acquired successfully");
        
        streamRef.current = stream;
        setCameraActive(true);
        setIsInitializing(false);
        
      } catch (error: unknown) {
        if (!mounted) return;
        
        console.error("[Scanner] Camera access error:", error);
        setCameraError(true);
        setIsInitializing(false);
        
        const errorName = error instanceof Error ? error.name : "";
        const errorMessage = error instanceof Error ? error.message : "";
        
        console.log("[Scanner] Error details - name:", errorName, "message:", errorMessage);
        
        const isPermissionError = 
          errorName === "NotAllowedError" || 
          errorName === "PermissionDeniedError" ||
          errorMessage.includes("permission") ||
          errorMessage.includes("Permission");
        
        let errorDescription = t.scanner.cameraError;
        
        if (isPermissionError) {
          errorDescription = "Permissão de câmera negada. Vá em Ajustes > Paddock > Câmera para habilitar.";
        }
        
        toast({
          title: t.common.error,
          description: errorDescription,
          variant: "destructive",
        });
      }
    };

    initCamera();

    // Cleanup on unmount
    return () => {
      mounted = false;
      console.log("[Scanner] Cleanup: stopping camera");
      
      // Stop camera-preview if active
      cameraPreview.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  // Auto-open native camera when fallback mode is activated
  // This provides a seamless experience on iOS/Android
  const hasOpenedNativeCameraRef = useRef(false);
  
  useEffect(() => {
    // Only trigger once when useNativeFallback becomes true
    if (!useNativeFallback || isInitializing || capturedImage || isScanning || hasOpenedNativeCameraRef.current) {
      return;
    }
    
    hasOpenedNativeCameraRef.current = true;
    console.log("[Scanner] Auto-opening native camera...");
    
    const openCameraWithPermissions = async () => {
      try {
        // First ensure we have camera permission
        const permissions = await CapacitorCamera.checkPermissions();
        console.log("[Scanner] Current permissions:", permissions.camera);
        
        // Request permission if in prompt state
        if (permissions.camera === 'prompt' || permissions.camera === 'prompt-with-rationale') {
          console.log("[Scanner] Requesting camera permission...");
          const requested = await CapacitorCamera.requestPermissions({ permissions: ['camera'] });
          console.log("[Scanner] Permission result:", requested.camera);
          
          if (requested.camera === 'denied') {
            console.log("[Scanner] Permission denied by user");
            setCameraError(true);
            hasOpenedNativeCameraRef.current = false;
            toast({
              title: t.common.error,
              description: "Permissão de câmera negada. Vá em Ajustes > Paddock > Câmera para habilitar.",
              variant: "destructive",
            });
            return;
          }
        } else if (permissions.camera === 'denied') {
          console.log("[Scanner] Permission already denied");
          setCameraError(true);
          hasOpenedNativeCameraRef.current = false;
          toast({
            title: t.common.error,
            description: "Permissão de câmera negada. Vá em Ajustes > Paddock > Câmera para habilitar.",
            variant: "destructive",
          });
          return;
        }
        
        // Now open the camera
        console.log("[Scanner] Opening native camera...");
        const result = await nativeCamera.takePhoto();
        
        if (!result) {
          // User cancelled - allow retry
          console.log("[Scanner] Native camera cancelled by user");
          hasOpenedNativeCameraRef.current = false;
          return;
        }
        
        console.log("[Scanner] Native camera photo captured");
        setCapturedImage(result.base64Image);
        setIsScanning(true);
        
        trackEvent("scan_initiated", { source: "native_camera_auto" });
        
        // Analyze the image
        const { data, error } = await supabase.functions.invoke("analyze-collectible", {
          body: { imageBase64: result.base64Image },
        });
        
        if (error) {
          console.error("[Scanner] Analysis error:", error);
          toast({
            title: t.scanner.analysisFailed,
            description: t.scanner.analysisFailedDesc,
            variant: "destructive",
          });
          setIsScanning(false);
          return;
        }
        
        const response = data as MultiCarAnalysisResponse;
        const responseType = response.detectedType || "collectible";
        setDetectedType(responseType);
        
        trackEvent("scan_completed", { 
          detected_type: responseType, 
          identified: response.identified,
          items_count: response.count || (response.identified ? 1 : 0)
        });
        
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
            const hasValidItems = response.items && response.items.length > 0 && response.identified;
            const tooManyIssue = response.imageQuality.issues?.find((i: { type: string }) => i.type === "too_many_cars");
            const isFalseTooMany = tooManyIssue && response.count && response.count <= 5;
            
            if (!hasValidItems && !isFalseTooMany) {
              setImageQualityError(response.imageQuality);
              setAnalysisResults([]);
              setIsScanning(false);
              return;
            }
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
            const itemsWithCrops = await Promise.all(
              response.items.map(async (item) => {
                if (item.boundingBox && result.base64Image) {
                  try {
                    const croppedImage = await cropImageByBoundingBox(result.base64Image, item.boundingBox as BoundingBox);
                    return { ...item, croppedImage };
                  } catch (err) {
                    return { ...item, croppedImage: result.base64Image };
                  }
                }
                return { ...item, croppedImage: result.base64Image };
              })
            );
            
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
                    return { ...item, isDuplicate: duplicate.isDuplicate, existingItemImage: duplicate.existingItemImage };
                  } catch (err) {
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
            }
          }
        }
        
        setIsScanning(false);
      } catch (err) {
        console.error("[Scanner] Native camera error:", err);
        hasOpenedNativeCameraRef.current = false;
      }
    };
    
    // Small delay to ensure UI is ready
    const timer = setTimeout(openCameraWithPermissions, 100);
    return () => clearTimeout(timer);
  }, [useNativeFallback, isInitializing, capturedImage, isScanning, nativeCamera, toast, t, user]);

  const startCamera = useCallback(async () => {
    console.log("[Scanner] Manual startCamera called");
    setIsInitializing(true);
    setCameraError(false);
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false // No audio needed
      });

      console.log("[Scanner] Camera stream acquired (manual)");
      streamRef.current = stream;
      setCameraActive(true);
      setIsInitializing(false);
      
    } catch (error: unknown) {
      console.error("[Scanner] Camera access error:", error);
      setCameraError(true);
      setIsInitializing(false);
      
      const errorName = error instanceof Error ? error.name : "";
      const isPermissionError = errorName === "NotAllowedError" || errorName === "PermissionDeniedError";
      
      toast({
        title: t.common.error,
        description: isPermissionError 
          ? "Permissão de câmera negada. Vá em Ajustes > Privacidade > Câmera para habilitar."
          : t.scanner.cameraError,
        variant: "destructive",
      });
    }
  }, [facingMode, toast, t]);

  const stopCamera = useCallback(() => {
    console.log("[Scanner] Stopping camera");
    
    // Stop camera-preview if using it
    if (useCameraPreview) {
      cameraPreview.stop();
      setUseCameraPreview(false);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [useCameraPreview, cameraPreview]);

  const switchCamera = useCallback(async () => {
    // For camera-preview, use flip method
    if (useCameraPreview) {
      await cameraPreview.flip();
      return;
    }
    
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [cameraActive, facingMode, startCamera, stopCamera, useCameraPreview, cameraPreview]);

  // Capture photo using camera-preview (embedded native camera)
  const captureCameraPreviewPhoto = useCallback(async () => {
    console.log("[Scanner] Capturing via camera-preview...");
    
    // Trigger flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);
    
    setIsScanning(true);
    
    try {
      const result = await cameraPreview.capture();
      
      if (!result) {
        setIsScanning(false);
        toast({
          title: t.common.error,
          description: "Não foi possível capturar a foto.",
          variant: "destructive",
        });
        return;
      }
      
      const imageBase64 = result.base64Image;
      setCapturedImage(imageBase64);
      
      // Stop camera preview after capture
      await cameraPreview.stop();
      setUseCameraPreview(false);
      setCameraActive(false);
      
      // Track scan event
      trackEvent("scan_initiated", { source: "camera_preview" });

      // Analyze the captured image
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      trackEvent("scan_completed", { 
        detected_type: responseType, 
        identified: response.identified,
        items_count: response.count || (response.identified ? 1 : 0)
      });

      console.log("[Scanner] Detected type:", responseType);

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
          const hasValidItems = response.items && response.items.length > 0 && response.identified;
          const tooManyIssue = response.imageQuality.issues?.find((i: { type: string }) => i.type === "too_many_cars");
          const isFalseTooMany = tooManyIssue && response.count && response.count <= 5;
          
          if (!hasValidItems && !isFalseTooMany) {
            setImageQualityError(response.imageQuality);
            setAnalysisResults([]);
            setIsScanning(false);
            return;
          }
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
          // Crop individual car images from bounding boxes
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
          
          // Check for duplicates in user's collection
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
                    existingItemImage: duplicate.existingItemImage
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
      setIsScanning(false);
    }
  }, [cameraPreview, toast, t, user]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Trigger flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

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
    
    // Track scan event
    trackEvent("scan_initiated", { source: "camera" });

    try {
      // Single unified call - AI auto-detects if it's a toy or real car
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      // Track detection result
      trackEvent("scan_completed", { 
        detected_type: responseType, 
        identified: response.identified,
        items_count: response.count || (response.identified ? 1 : 0)
      });

      console.log("[Scanner] Detected type:", responseType);

      if (responseType === "real_car") {
        // Handle real car detection
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
        // Handle collectible detection (original flow)
        // Check image quality first - but validate that the issues are real
        if (response.imageQuality && !response.imageQuality.isValid) {
          // Filter out false positives: if we have items identified, ignore the quality error
          const hasValidItems = response.items && response.items.length > 0 && response.identified;
          
          // Also check if the "too_many_cars" issue is a false positive
          const tooManyIssue = response.imageQuality.issues?.find((i: { type: string; detectedCount?: number }) => i.type === "too_many_cars");
          const isFalseTooMany = tooManyIssue && response.count && response.count <= 5;
          
          // Only show quality error if it's a real blocking issue
          if (!hasValidItems && !isFalseTooMany) {
            setImageQualityError(response.imageQuality);
            setAnalysisResults([]);
            setIsScanning(false);
            return;
          }
        }

        // Clear any previous quality errors
        setImageQualityError(null);

        if (!response.identified || response.count === 0) {
          toast({
            title: t.scanner.itemNotIdentified,
            description: t.scanner.itemNotIdentifiedDesc,
            variant: "destructive",
          });
          setAnalysisResults([]);
        } else {
          // Crop individual car images from bounding boxes
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
          
          // Check for duplicates in user's collection
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
                    existingItemImage: duplicate.existingItemImage
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
      setIsScanning(false);
    }
  }, [stopCamera, toast, t, user]);

  // Native camera capture function (fallback for iOS native app)
  const captureNativePhoto = useCallback(async () => {
    console.log("[Scanner] Capturing via native camera...");
    setIsScanning(true);
    
    try {
      const result = await nativeCamera.takePhoto();
      
      if (!result) {
        setIsScanning(false);
        toast({
          title: t.common.error,
          description: "Não foi possível capturar a foto.",
          variant: "destructive",
        });
        return;
      }
      
      const imageBase64 = result.base64Image;
      setCapturedImage(imageBase64);
      
      // Track scan event
      trackEvent("scan_initiated", { source: "native_camera" });

      // Analyze the captured image
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      trackEvent("scan_completed", { 
        detected_type: responseType, 
        identified: response.identified,
        items_count: response.count || (response.identified ? 1 : 0)
      });

      console.log("[Scanner] Detected type:", responseType);

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
          const hasValidItems = response.items && response.items.length > 0 && response.identified;
          const tooManyIssue = response.imageQuality.issues?.find((i: { type: string }) => i.type === "too_many_cars");
          const isFalseTooMany = tooManyIssue && response.count && response.count <= 5;
          
          if (!hasValidItems && !isFalseTooMany) {
            setImageQualityError(response.imageQuality);
            setAnalysisResults([]);
            setIsScanning(false);
            return;
          }
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
                    existingItemImage: duplicate.existingItemImage
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
      setIsScanning(false);
    }
  }, [nativeCamera, toast, t, user]);

  // Native gallery picker (fallback)
  const openNativeGallery = useCallback(async () => {
    console.log("[Scanner] Opening native gallery...");
    
    try {
      const result = await nativeCamera.pickFromGallery();
      
      if (!result) {
        return;
      }
      
      const imageBase64 = result.base64Image;
      setCapturedImage(imageBase64);
      setIsScanning(true);
      
      trackEvent("scan_initiated", { source: "native_gallery" });

      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      // Same analysis flow as captureNativePhoto...
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
        if (!response.identified || response.count === 0) {
          toast({
            title: t.scanner.itemNotIdentified,
            description: t.scanner.itemNotIdentifiedDesc,
            variant: "destructive",
          });
          setAnalysisResults([]);
        } else {
          const itemsWithCrops = await Promise.all(
            response.items.map(async (item) => {
              if (item.boundingBox && imageBase64) {
                try {
                  const croppedImage = await cropImageByBoundingBox(imageBase64, item.boundingBox as BoundingBox);
                  return { ...item, croppedImage };
                } catch (error) {
                  return { ...item, croppedImage: imageBase64 };
                }
              }
              return { ...item, croppedImage: imageBase64 };
            })
          );
          
          setAnalysisResults(itemsWithCrops);
          setAddedIndices(new Set());
          setSkippedIndices(new Set());
        }
      }
    } catch (error) {
      console.error("Gallery analysis error:", error);
      toast({
        title: t.scanner.analysisFailed,
        description: t.scanner.analysisFailedDesc,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [nativeCamera, toast, t]);

  // Video analysis function
  const analyzeVideo = useCallback(async (videoBlob: Blob) => {
    setIsScanning(true);
    
    // Track scan event
    trackEvent("scan_initiated", { source: "video" });
    
    try {
      // Convert video blob to base64
      const reader = new FileReader();
      const videoBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });
      
      console.log("[Scanner] Sending video for analysis...");
      
      const { data, error } = await supabase.functions.invoke("analyze-collectible", {
        body: { imageBase64: videoBase64 },
      });

      if (error) throw error;

      const response = data as MultiCarAnalysisResponse;
      const responseType = response.detectedType || "collectible";
      setDetectedType(responseType);

      // Track detection result
      trackEvent("scan_completed", { 
        detected_type: responseType, 
        identified: response.identified,
        items_count: response.count || (response.identified ? 1 : 0),
        source: "video"
      });

      console.log("[Scanner] Video analysis detected type:", responseType);

      if (responseType === "real_car") {
        // Handle real car detection
        if (!response.identified || !response.car) {
          toast({
            title: t.scanner.couldNotIdentify,
            description: response.error || t.scanner.tryDifferentAngle,
            variant: "destructive",
          });
          setRealCarResult(null);
        } else {
          // For real car from video, we need to capture a frame as the image
          // Use the video preview URL to set as captured image
          setCapturedImage(videoPreviewUrl);
          setRealCarResult({
            identified: response.identified,
            car: response.car,
            searchTerms: response.searchTerms || [],
            confidence: response.confidence || "medium",
          });
        }
      } else {
        // Handle collectible detection
        // Check image quality first - but validate that the issues are real
        if (response.imageQuality && !response.imageQuality.isValid) {
          // Filter out false positives: if we have items identified, ignore the quality error
          const hasValidItems = response.items && response.items.length > 0 && response.identified;
          
          // Also check if the "too_many_cars" issue is a false positive
          const tooManyIssue = response.imageQuality.issues?.find((i: { type: string; detectedCount?: number }) => i.type === "too_many_cars");
          const isFalseTooMany = tooManyIssue && response.count && response.count <= 5;
          
          // Only show quality error if it's a real blocking issue
          if (!hasValidItems && !isFalseTooMany) {
            setImageQualityError(response.imageQuality);
            setAnalysisResults([]);
            setIsScanning(false);
            return;
          }
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
          // For video analysis, extract a frame and crop individual cars
          let baseImageForCropping: string | null = null;
          
          // Extract a frame from the video for cropping
          if (videoBlob && response.items.some(item => item.boundingBox)) {
            try {
              baseImageForCropping = await extractFrameFromVideo(videoBlob);
              console.log("[Scanner] Extracted video frame for cropping");
            } catch (error) {
              console.error("[Scanner] Failed to extract video frame:", error);
            }
          }
          
          // Crop individual car images from bounding boxes
          const itemsWithCrops = await Promise.all(
            response.items.map(async (item) => {
              if (item.boundingBox && baseImageForCropping) {
                try {
                  const croppedImage = await cropImageByBoundingBox(baseImageForCropping, item.boundingBox as BoundingBox);
                  return { ...item, croppedImage };
                } catch (error) {
                  console.error("Failed to crop image:", error);
                  return { ...item, croppedImage: baseImageForCropping };
                }
              }
              // Fallback to extracted frame or undefined
              return { ...item, croppedImage: baseImageForCropping || undefined };
            })
          );
          
          // Check for duplicates in user's collection
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
                    existingItemImage: duplicate.existingItemImage
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
      console.error("Video analysis error:", error);
      toast({
        title: t.scanner.analysisFailed,
        description: t.scanner.analysisFailedDesc,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  }, [toast, t, user, videoPreviewUrl]);

  // Handle file selection from gallery
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("[Scanner] File selected from gallery:", file.type, file.size);

    // Check file size (20MB max)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t.scanner.videoTooLarge,
        description: `${t.scanner.maxVideoSize} 20MB`,
        variant: "destructive",
      });
      return;
    }

    stopCamera();

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (isVideo) {
      // Handle video file
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setRecordedVideo(file);
      
      // Analyze video
      await analyzeVideo(file);
    } else if (isImage) {
      // Handle image file
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageBase64 = reader.result as string;
        setCapturedImage(imageBase64);
        setIsScanning(true);
        
        // Track scan event
        trackEvent("scan_initiated", { source: "gallery_image" });

        try {
          const { data, error } = await supabase.functions.invoke("analyze-collectible", {
            body: { imageBase64 },
          });

          if (error) throw error;

          const response = data as MultiCarAnalysisResponse;
          const responseType = response.detectedType || "collectible";
          setDetectedType(responseType);

          trackEvent("scan_completed", { 
            detected_type: responseType, 
            identified: response.identified,
            items_count: response.count || (response.identified ? 1 : 0),
            source: "gallery_image"
          });

          console.log("[Scanner] Gallery image detected type:", responseType);

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
              setIsScanning(false);
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
                        existingItemImage: duplicate.existingItemImage
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
          console.error("Gallery image analysis error:", error);
          toast({
            title: t.scanner.analysisFailed,
            description: t.scanner.analysisFailedDesc,
            variant: "destructive",
          });
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: t.common.error,
        description: t.scanner.unsupportedFileType || "Tipo de arquivo não suportado",
        variant: "destructive",
      });
    }

    // Reset the input so the same file can be selected again
    event.target.value = "";
  }, [stopCamera, toast, t, user, analyzeVideo]);

  const openGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Video recording functions
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    
    console.log("[Scanner] Starting video recording");
    
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log("[Scanner] Recording stopped, creating blob for analysis");
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        stopCamera();
        
        // Automatically analyze the video
        await analyzeVideo(blob);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= MAX_RECORDING_DURATION - 1) {
            stopRecording();
            return MAX_RECORDING_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error("[Scanner] Recording error:", error);
      toast({
        title: t.common.error,
        description: "Não foi possível iniciar a gravação",
        variant: "destructive",
      });
    }
  }, [stopCamera, toast, t]);

  const stopRecording = useCallback(() => {
    console.log("[Scanner] Stopping recording");
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    isPressedRef.current = false;
  }, []);

  // Press handlers for CaptureButton - simplified to photo only (video disabled)
  const handlePressStart = useCallback(() => {
    // Video recording disabled - do nothing on press start
  }, []);

  const handlePressEnd = useCallback(() => {
    if (isScanning || !cameraActive) return;
    
    // Simple tap = capture photo (video recording disabled)
    capturePhoto();
  }, [isScanning, cameraActive, capturePhoto]);

  const handleAddToCollection = async (index: number) => {
    if (!user) {
      toast({
        title: t.scanner.signInRequired,
        description: t.scanner.signInRequiredDesc,
      });
      navigate("/auth");
      return;
    }

    const result = analysisResults[index];
    if (!result) return;

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
          collectible_color: result.collectible.color || null,
          collectible_notes: result.collectible.notes,
          price_index: result.priceIndex?.score || null,
          rarity_tier: result.priceIndex?.tier || null,
          index_breakdown: result.priceIndex?.breakdown || null,
          music_suggestion: result.musicSuggestion || null,
          music_selection_reason: result.musicSelectionReason || null,
          real_car_photos: result.realCarPhotos || null,
        },
        // Use cropped image if available, otherwise fall back to full image
        result.croppedImage || capturedImage || undefined
      );

      toast({
        title: t.scanner.addedToCollection,
        description: `${result.realCar.brand} ${result.realCar.model}`,
      });
      
      // Track analytics
      trackInteraction("add_collection", "add_to_collection_button", {
        brand: result.realCar.brand,
        model: result.realCar.model,
        manufacturer: result.collectible.manufacturer,
        rarity: result.priceIndex?.tier
      });
      
      setAddedIndices(prev => new Set(prev).add(index));
    } catch (error) {
      console.error("Add to collection error:", error);
      toast({
        title: t.scanner.addError,
        description: t.scanner.addErrorDesc,
        variant: "destructive",
      });
    }
  };

  const handleSkipItem = (index: number) => {
    setSkippedIndices(prev => new Set(prev).add(index));
  };

  const handleComplete = () => {
    navigate("/profile");
  };

  const resetScan = useCallback(async () => {
    setAnalysisResults([]);
    setCapturedImage(null);
    setCameraError(false);
    setIsInitializing(true);
    setAddedIndices(new Set());
    setSkippedIndices(new Set());
    setWarningMessage(null);
    setImageQualityError(null);
    setRecordedVideo(null);
    setRecordingDuration(0);
    setRealCarResult(null);
    setDetectedType(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
    
    // Restart camera - use camera-preview on native platforms
    if (Capacitor.isNativePlatform()) {
      const started = await cameraPreview.start();
      if (started) {
        setUseCameraPreview(true);
        setCameraActive(true);
        setIsInitializing(false);
      } else {
        // Fallback to native camera UI
        setUseNativeFallback(true);
        setCameraActive(false);
        setIsInitializing(false);
      }
    } else {
      startCamera();
    }
  }, [startCamera, videoPreviewUrl, cameraPreview]);

  const handleClose = useCallback(() => {
    stopCamera();
    navigate("/");
  }, [stopCamera, navigate]);

  const hasResults = analysisResults.length > 0;

  // Show real car results if available
  if (realCarResult && realCarResult.car && capturedImage) {
    return (
      <RealCarResults
        car={realCarResult.car}
        searchTerms={realCarResult.searchTerms}
        confidence={realCarResult.confidence}
        capturedImage={capturedImage}
        onScanAgain={resetScan}
      />
    );
  }

  // Show image quality error screen if there are issues
  if (imageQualityError && capturedImage) {
    return (
      <ImageQualityError
        issues={imageQualityError.issues}
        suggestion={imageQualityError.suggestion}
        capturedImage={capturedImage}
        onRetry={resetScan}
      />
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${useCameraPreview ? 'native-camera-mode' : 'bg-background'}`}>
      {/* Camera-preview container - native layer renders behind WebView */}
      {useCameraPreview && (
        <div id="camera-preview-container" className="fixed inset-0 z-0" />
      )}
      
      {/* Camera/Preview View */}
      <div className={`relative flex-1 overflow-hidden ${useCameraPreview ? 'bg-transparent' : 'bg-black'}`}>
        {/* Video element for web camera - ALWAYS rendered, visibility controlled by CSS */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            cameraActive && !useCameraPreview && !capturedImage && !videoPreviewUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {capturedImage && !videoPreviewUrl && (
          <img
            src={capturedImage}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Video preview */}
        {videoPreviewUrl && (
          <video
            src={videoPreviewUrl}
            autoPlay
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Gradient overlay when camera is not active (web only) */}
        {!cameraActive && !capturedImage && !videoPreviewUrl && !useNativeFallback && !useCameraPreview && (
          <div className="absolute inset-0 bg-gradient-to-b from-background-secondary to-background opacity-50" />
        )}
        
        {/* Native fallback background - full black with centered instructions (only if camera-preview failed) */}
        {useNativeFallback && !useCameraPreview && !capturedImage && !isScanning && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <CameraIcon className="h-10 w-10 text-white/60" />
            </div>
            <p className="text-white/80 text-center font-medium">
              Toque no botão para abrir a câmera
            </p>
            <p className="text-white/40 text-center text-sm">
              A foto será capturada pela câmera nativa do seu dispositivo
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Flash effect overlay */}
        {showFlash && (
          <div className="absolute inset-0 bg-white z-50 animate-fade-out-flash pointer-events-none" />
        )}

        {/* Paddock watermark - positioned below notch */}
        {(cameraActive || useNativeFallback || useCameraPreview) && !isScanning && !capturedImage && (
          <div className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}>
            <PaddockLogo 
              variant="wordmark" 
              size={30} 
              className="opacity-30"
            />
          </div>
        )}

        {/* Auto-detect hint - no manual toggle needed */}

        {/* Minimal corner guides - subtle like Instagram/TikTok - positioned below notch */}
        {(cameraActive || useCameraPreview) && !isScanning && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top left corner */}
            <div className="absolute left-6 w-10 h-10" style={{ top: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}>
              <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40 rounded-full" />
              <div className="absolute top-0 left-0 h-full w-[2px] bg-white/40 rounded-full" />
            </div>
            {/* Top right corner */}
            <div className="absolute right-6 w-10 h-10" style={{ top: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}>
              <div className="absolute top-0 right-0 w-full h-[2px] bg-white/40 rounded-full" />
              <div className="absolute top-0 right-0 h-full w-[2px] bg-white/40 rounded-full" />
            </div>
            {/* Bottom left corner */}
            <div className="absolute bottom-32 left-6 w-10 h-10">
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/40 rounded-full" />
              <div className="absolute bottom-0 left-0 h-full w-[2px] bg-white/40 rounded-full" />
            </div>
            {/* Bottom right corner */}
            <div className="absolute bottom-32 right-6 w-10 h-10">
              <div className="absolute bottom-0 right-0 w-full h-[2px] bg-white/40 rounded-full" />
              <div className="absolute bottom-0 right-0 h-full w-[2px] bg-white/40 rounded-full" />
            </div>
          </div>
        )}

        {/* Scanning animation overlay - positioned below notch */}
        {isScanning && (
          <div className="absolute inset-x-6 bottom-32 pointer-events-none overflow-hidden" style={{ top: "calc(env(safe-area-inset-top, 0px) + 4rem)" }}>
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
          </div>
        )}

        {/* Close button - positioned below notch */}
        <button
          onClick={handleClose}
          className="absolute right-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {/* Switch camera button - positioned below notch */}
        {(cameraActive || useCameraPreview) && !isRecording && !capturedImage && (
          <button
            onClick={switchCamera}
            data-tip="flip-camera"
            className="absolute left-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
          >
            <SwitchCamera className="h-6 w-6 text-foreground" />
          </button>
        )}

        {isScanning && <LoadingFacts isVideo={!!videoPreviewUrl} />}
      </div>

      {/* Video analyzing indicator removed - LoadingFacts already handles this */}

      {/* Results Panel - Multi-car Carousel */}
      {hasResults ? (
        <ResultCarousel
          results={analysisResults}
          onAddToCollection={handleAddToCollection}
          onSkip={handleSkipItem}
          onComplete={handleComplete}
          onScanAgain={resetScan}
          addedIndices={addedIndices}
          skippedIndices={skippedIndices}
          warning={warningMessage || undefined}
        />
      ) : !videoPreviewUrl && (
        /* Floating controls overlay - no bottom panel */
        <div className="absolute bottom-0 left-0 right-0 pb-8 safe-bottom">
          <div className="flex flex-col items-center gap-3">
            {isInitializing ? (
              <>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <p className="text-sm text-white/70 text-center">
                  {t.scanner.openingCamera}
                </p>
              </>
            ) : cameraError ? (
              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-5 mx-6 max-w-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                    <CameraIcon className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm text-white font-medium text-center">
                    Não foi possível acessar a câmera
                  </p>
                  <p className="text-xs text-white/60 text-center leading-relaxed">
                    Verifique se a permissão está habilitada em{" "}
                    <span className="text-white/80 font-medium">Ajustes → Paddock → Câmera</span>
                  </p>
                </div>
                <Button
                  onClick={startCamera}
                  className="w-full mt-4 bg-white text-black hover:bg-white/90 h-11 font-medium"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.scanner.tryAgain}
                </Button>
              </div>
            ) : useCameraPreview ? (
              /* Camera-preview mode - immersive embedded camera */
              <div className="relative w-full flex items-center justify-center">
                {/* Gallery button - bottom left */}
                <button
                  onClick={openNativeGallery}
                  disabled={isScanning}
                  className="absolute left-6 bottom-0 p-3 bg-background/50 backdrop-blur-sm rounded-full z-10 disabled:opacity-50"
                  aria-label={t.scanner.selectFromGallery}
                >
                  <ImageIcon className="h-6 w-6 text-white" />
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[11px] text-white/50 text-center tracking-wide">
                    {t.scanner.tapToCapture}
                  </p>
                  <CaptureButton
                    disabled={isScanning}
                    onClick={captureCameraPreviewPhoto}
                  />
                </div>
              </div>
            ) : useNativeFallback ? (
              /* Native camera fallback mode - no live preview (only if camera-preview failed) */
              <div className="relative w-full flex items-center justify-center">
                {/* Gallery button - bottom left */}
                <button
                  onClick={openNativeGallery}
                  disabled={isScanning}
                  className="absolute left-6 bottom-0 p-3 bg-background/50 backdrop-blur-sm rounded-full z-10 disabled:opacity-50"
                  aria-label={t.scanner.selectFromGallery}
                >
                  <ImageIcon className="h-6 w-6 text-white" />
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[11px] text-white/50 text-center tracking-wide">
                    {t.scanner.tapToCapture}
                  </p>
                  <CaptureButton
                    disabled={isScanning}
                    onClick={captureNativePhoto}
                  />
                </div>
              </div>
            ) : cameraActive && (
              <div className="relative w-full flex items-center justify-center">
                {/* Gallery button - bottom left */}
                <button
                  onClick={openGallery}
                  className="absolute left-6 bottom-0 p-3 bg-background/50 backdrop-blur-sm rounded-full z-10"
                  aria-label={t.scanner.selectFromGallery}
                >
                  <ImageIcon className="h-6 w-6 text-white" />
                </button>
                
                <div className="flex flex-col items-center gap-3">
                  <p className="text-[11px] text-white/50 text-center tracking-wide">
                    {t.scanner.tapToCapture}
                  </p>
                  <CaptureButton
                    disabled={isScanning}
                    onClick={capturePhoto}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for gallery selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

    </div>
  );
};
