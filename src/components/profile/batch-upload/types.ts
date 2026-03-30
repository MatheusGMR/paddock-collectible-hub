import { BoundingBox } from "@/lib/imageCrop";
import { PriceIndex } from "@/lib/priceIndex";

export const MAX_PHOTOS_PER_BATCH = 10;
export const PARALLEL_PROCESSING_LIMIT = 3;
export const MAX_VIDEO_SIZE_MB = 20;

export interface AnalysisResult {
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
  photoIndex?: number;
}

export interface ImageQualityResponse {
  isValid: boolean;
  issues: Array<{
    type: string;
    severity: "error" | "warning";
  }>;
  suggestion: string;
}

export interface MultiCarAnalysisResponse {
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

export interface RealCarAnalysisResponse {
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

export interface QueuedMedia {
  id: string;
  base64: string;
  isVideo: boolean;
  status: "pending" | "analyzing" | "success" | "error";
  results?: AnalysisResult[];
  error?: string;
}

export interface ConsolidatedResult extends AnalysisResult {
  mediaId: string;
  mediaIndex: number;
  isSelected: boolean;
}

export interface BatchUploadState {
  mediaQueue: QueuedMedia[];
  consolidatedResults: ConsolidatedResult[];
  phase: "selecting" | "processing" | "reviewing";
}

// localStorage persistence
export const BATCH_UPLOAD_STORAGE_KEY = "paddock_batch_upload_pending";
export const BATCH_UPLOAD_EXPIRY_HOURS = 24;

export interface StoredBatchUpload {
  results: ConsolidatedResult[];
  timestamp: number;
}
