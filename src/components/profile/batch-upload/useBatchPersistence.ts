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
      try {
        localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
      } catch (e) {
        console.warn("[BatchPersistence] Failed to clear storage:", e);
      }
      setHasPendingResults(false);
      setPendingResults([]);
      return;
    }

    // Estado em memória é sempre a fonte de verdade da revisão.
    setHasPendingResults(true);
    setPendingResults(results);

    const write = (payload: ConsolidatedResult[]) => {
      const data: StoredBatchUpload = { results: payload, timestamp: Date.now() };
      localStorage.setItem(BATCH_UPLOAD_STORAGE_KEY, JSON.stringify(data));
    };

    // Versão leve: sem as imagens pesadas que estouram a cota do navegador.
    const lightweight = (payload: ConsolidatedResult[]) =>
      payload.map(({ croppedImage: _c, existingItemImage: _e, realCarPhotos: _p, ...rest }) => rest as ConsolidatedResult);

    try {
      write(results);
    } catch (e) {
      console.warn("[BatchPersistence] Storage full, retrying without images:", e);
      try {
        write(lightweight(results));
      } catch (e2) {
        console.warn("[BatchPersistence] Could not persist batch results:", e2);
        try {
          localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
    }
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
