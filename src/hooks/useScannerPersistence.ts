import { useCallback, useEffect, useState } from "react";

const SCANNER_STORAGE_KEY = "paddock_scanner_pending_results";
const SCANNER_EXPIRY_HOURS = 24;

export interface PendingScanResult {
  capturedImage: string;
  analysisResults: unknown[];
  detectedType: "collectible" | "real_car";
  timestamp: number;
}

interface StoredScannerData {
  result: PendingScanResult;
  timestamp: number;
}

export function useScannerPersistence() {
  const [hasPendingResult, setHasPendingResult] = useState(false);
  const [pendingResult, setPendingResult] = useState<PendingScanResult | null>(null);

  // Check for pending results on mount
  useEffect(() => {
    const stored = localStorage.getItem(SCANNER_STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredScannerData = JSON.parse(stored);
        const expiryTime = SCANNER_EXPIRY_HOURS * 60 * 60 * 1000;
        const isExpired = Date.now() - data.timestamp > expiryTime;

        if (isExpired) {
          localStorage.removeItem(SCANNER_STORAGE_KEY);
          setHasPendingResult(false);
        } else {
          setPendingResult(data.result);
          setHasPendingResult(true);
        }
      } catch (e) {
        console.error("[ScannerPersistence] Failed to parse stored data:", e);
        localStorage.removeItem(SCANNER_STORAGE_KEY);
      }
    }
  }, []);

  const saveResult = useCallback((result: PendingScanResult) => {
    const data: StoredScannerData = {
      result,
      timestamp: Date.now(),
    };
    localStorage.setItem(SCANNER_STORAGE_KEY, JSON.stringify(data));
    setHasPendingResult(true);
    setPendingResult(result);
    console.log("[ScannerPersistence] Saved pending result");
  }, []);

  const clearResult = useCallback(() => {
    localStorage.removeItem(SCANNER_STORAGE_KEY);
    setHasPendingResult(false);
    setPendingResult(null);
    console.log("[ScannerPersistence] Cleared pending result");
  }, []);

  return {
    hasPendingResult,
    pendingResult,
    saveResult,
    clearResult,
  };
}
