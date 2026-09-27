import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConsolidatedResult,
  StoredBatchUpload,
  BATCH_UPLOAD_STORAGE_KEY,
  BATCH_UPLOAD_EXPIRY_HOURS,
} from "./types";

const DB_NAME = "paddock_batch";
const STORE = "kv";
function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    };
  });
}
const idbGet = () => idb<StoredBatchUpload | undefined>("readonly", (s) => s.get(BATCH_UPLOAD_STORAGE_KEY));
const idbSet = (v: StoredBatchUpload) => idb("readwrite", (s) => s.put(v, BATCH_UPLOAD_STORAGE_KEY));
const idbDel = () => idb("readwrite", (s) => s.delete(BATCH_UPLOAD_STORAGE_KEY));

export function useBatchPersistence() {
  const [hasPendingResults, setHasPendingResults] = useState(false);
  const [pendingResults, setPendingResults] = useState<ConsolidatedResult[]>([]);
  const idbLoaded = useRef(false);

  // Check for pending results on mount
  useEffect(() => {
    idbGet().then((data) => {
      if (!data?.results?.length) return;
      idbLoaded.current = true;
      if (Date.now() - data.timestamp > BATCH_UPLOAD_EXPIRY_HOURS * 3600000) { void idbDel().catch(() => {}); return; }
      setPendingResults(data.results);
      setHasPendingResults(true);
    }).catch(() => {}).finally(() => {
    if (idbLoaded.current) return;
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
    });
  }, []);

  const saveResults = useCallback((results: ConsolidatedResult[]) => {
    if (results.length === 0) {
      void idbDel().catch(() => {});
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
      payload.map(({ croppedImage: _c, existingItemImage: _e, realCarPhotos: _p, originalImage: _o, ...rest }) => rest as ConsolidatedResult);

    void idbSet({ results, timestamp: Date.now() }).catch((e) => console.warn("[BatchPersistence] IDB failed:", e));
    try {
      write(lightweight(results));
    } catch (e) {
      console.warn("[BatchPersistence] Storage full, retrying without images:", e);
      try { localStorage.removeItem(BATCH_UPLOAD_STORAGE_KEY); } catch { /* ignore */ }
    }
  }, []);

  const clearResults = useCallback(() => {
    void idbDel().catch(() => {});
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
