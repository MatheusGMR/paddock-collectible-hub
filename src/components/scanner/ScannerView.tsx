import { useState, useRef, useCallback, useEffect } from "react";
import { X, RotateCcw, Camera, SwitchCamera, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";
import { addToCollection, checkDuplicateInCollection } from "@/lib/database";
import { useNavigate } from "react-router-dom";
import { CaptureButton } from "@/components/scanner/CaptureButton";
import { ResultCarousel } from "@/components/scanner/ResultCarousel";
import { ImageQualityError, ImageQualityIssue } from "@/components/scanner/ImageQualityError";
import { RealCarResults } from "@/components/scanner/RealCarResults";
import { LoadingFacts } from "@/components/scanner/LoadingFacts";
import { PriceIndex } from "@/lib/priceIndex";
import { cropImageByBoundingBox, BoundingBox } from "@/lib/imageCrop";
import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { trackInteraction, trackEvent } from "@/lib/analytics";
import { usePermissions } from "@/hooks/usePermissions";
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
  // Trigger guided tips for scanner screen
  useScreenTips("scanner", 1000);
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
  const { hasRequestedPermissions, requestAllPermissions, camera: cameraPermission } = usePermissions();

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

  // Auto-start camera on mount - request permissions if not yet granted
  useEffect(() => {
    const initCamera = async () => {
      console.log("[Scanner] Initializing camera automatically...");
      setIsInitializing(true);
      setCameraError(false);
      
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // If permissions weren't requested during onboarding, request them now (silently)
        // This ensures users who skipped onboarding still get camera access
        if (!hasRequestedPermissions() && cameraPermission !== "granted") {
          console.log("[Scanner] Permissions not yet granted, requesting now...");
          await requestAllPermissions();
        }

        // Now get the camera stream - permission should be granted
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true // Enable audio for video recording
        });

        console.log("[Scanner] Camera stream acquired (using pre-granted permission)");
        
        // Store stream immediately
        streamRef.current = stream;
        
        // Set camera active - the other useEffect will attach the stream
        setCameraActive(true);
        setIsInitializing(false);
        
      } catch (error) {
        console.error("[Scanner] Camera access error:", error);
        setCameraError(true);
        setIsInitializing(false);
        toast({
          title: t.common.error,
          description: t.scanner.cameraError,
          variant: "destructive",
        });
      }
    };

    initCamera();

    // Cleanup on unmount
    return () => {
      console.log("[Scanner] Cleanup: stopping camera");
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
  }, [toast, t, hasRequestedPermissions, requestAllPermissions, cameraPermission]);

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
        audio: true
      });

      console.log("[Scanner] Camera stream acquired (manual)");
      streamRef.current = stream;
      setCameraActive(true);
      setIsInitializing(false);
      
    } catch (error) {
      console.error("[Scanner] Camera access error:", error);
      setCameraError(true);
      setIsInitializing(false);
      toast({
        title: t.common.error,
        description: t.scanner.cameraError,
        variant: "destructive",
      });
    }
  }, [facingMode, toast, t]);

  const stopCamera = useCallback(() => {
    console.log("[Scanner] Stopping camera");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  }, [cameraActive, facingMode, startCamera, stopCamera]);

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
        // Check image quality first
        if (response.imageQuality && !response.imageQuality.isValid) {
          setImageQualityError(response.imageQuality);
          setAnalysisResults([]);
          setIsScanning(false);
          return;
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
          // For video analysis, use the first frame as the base image
          // Items from video don't have individual cropping - use video frame
          const itemsWithImages = response.items.map((item) => ({
            ...item,
            croppedImage: undefined, // Video doesn't support individual cropping
          }));
          
          // Check for duplicates in user's collection
          const itemsWithDuplicateCheck = await Promise.all(
            itemsWithImages.map(async (item) => {
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

  // Press handlers for CaptureButton
  const handlePressStart = useCallback(() => {
    if (isScanning || !cameraActive) return;
    
    isPressedRef.current = true;
    
    // Start timer - if held > 500ms, start recording
    pressTimerRef.current = setTimeout(() => {
      if (isPressedRef.current) {
        startRecording();
      }
    }, 500);
  }, [isScanning, cameraActive, startRecording]);

  const handlePressEnd = useCallback(() => {
    // If timer still active, it was a quick tap = photo
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      
      if (isPressedRef.current && !isRecording) {
        capturePhoto();
      }
    } else if (isRecording) {
      // Was recording, stop video
      stopRecording();
    }
    
    isPressedRef.current = false;
  }, [isRecording, capturePhoto, stopRecording]);

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

  const resetScan = useCallback(() => {
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
    // Restart camera
    startCamera();
  }, [startCamera, videoPreviewUrl]);

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
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Camera/Preview View */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {/* Video element is ALWAYS rendered, visibility controlled by CSS */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
            cameraActive && !capturedImage && !videoPreviewUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'
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

        {!cameraActive && !capturedImage && !videoPreviewUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-background-secondary to-background opacity-50" />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Flash effect overlay */}
        {showFlash && (
          <div className="absolute inset-0 bg-white z-50 animate-fade-out-flash pointer-events-none" />
        )}

        {/* Paddock watermark */}
        {cameraActive && !isScanning && !capturedImage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <PaddockLogo 
              variant="wordmark" 
              size={24} 
              className="opacity-30"
            />
          </div>
        )}

        {/* Auto-detect hint - no manual toggle needed */}

        {/* Minimal corner guides - subtle like Instagram/TikTok */}
        {cameraActive && !isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top left corner */}
            <div className="absolute top-16 left-6 w-10 h-10">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-white/40 rounded-full" />
              <div className="absolute top-0 left-0 h-full w-[2px] bg-white/40 rounded-full" />
            </div>
            {/* Top right corner */}
            <div className="absolute top-16 right-6 w-10 h-10">
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

        {/* Scanning animation overlay */}
        {isScanning && (
          <div className="absolute inset-x-6 top-16 bottom-32 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scanner-line" />
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        {cameraActive && !isRecording && (
          <button
            onClick={switchCamera}
            data-tip="flip-camera"
            className="absolute top-4 left-4 p-2 bg-background/50 backdrop-blur-sm rounded-full z-10"
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
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 mx-6">
                <p className="text-sm text-white/70 text-center mb-3">
                  {t.scanner.cameraError}
                </p>
                <Button
                  onClick={startCamera}
                  className="w-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 h-11 border-0"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  {t.scanner.tryAgain}
                </Button>
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
                    {t.scanner.tapToCapture} • {t.scanner.holdToRecord}
                  </p>
                  <CaptureButton
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    disabled={isScanning}
                    onPressStart={handlePressStart}
                    onPressEnd={handlePressEnd}
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
