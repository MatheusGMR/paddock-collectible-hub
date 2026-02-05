import { useCallback, useEffect, useState } from "react";
import {
  ConsolidatedResult,
  StoredBatchUpload,
  BATCH_UPLOAD_STORAGE_KEY,
  BATCH_UPLOAD_EXPIRY_HOURS,
} from "./types";

export function useBatchPersistence() {
  const [hasPendingResults, setHasPendingResults] = useState(false);
  const [pendingResults, setPendingResults] = useState<ConsolidatedResult[]>([]);

  // Check for pending results on mount
  useEffect(() => {
    const stored = localStorage.getItem(BATCH_UPLOAD_STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredBatchUpload = JSON.parse(stored);
        const expiryTime = BATCH_UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000;
        const isExpired = Date.now() - data.timestamp > expiryTime;

        if (isExpired) {
          localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
          setHasPendingResults(false);
        } else {
          setPendingResults(data.results);
          setHasPendingResults(data.results.length > 0);
        }
      } catch (e) {
        console.error("Failed to parse stored batch upload:", e);
        localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
      }
    }
  }, []);

  const saveResults = useCallback((results: ConsolidatedResult[]) => {
    if (results.length === 0) {
      localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
      setHasPendingResults(false);
      setPendingResults([]);
      return;
    }

    const data: StoredBatchUpload = {
      results,
      timestamp: Date.now(),
    };
    localStorage.setItem(BATCH_UPLOAD_STORAGE_KEY, JSON.stringify(data));
    setHasPendingResults(true);
    setPendingResults(results);
  }, []);

  const clearResults = useCallback(() => {
    localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
    setHasPendingResults(false);
    setPendingResults([]);
  }, []);

  const loadPendingResults = useCallback((): ConsolidatedResult[] => {
    return pendingResults;
  }, [pendingResults]);

  return {
    hasPendingResults,
    pendingResults,
    saveResults,
    clearResults,
    loadPendingResults,
  };
}
