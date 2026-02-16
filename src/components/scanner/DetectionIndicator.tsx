import { Car, Crosshair, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DetectionIndicatorProps {
  detectedCount: number;
  isModelLoading: boolean;
  isModelReady: boolean;
  autoScanStatus?: "idle" | "counting" | "triggered";
}

export function DetectionIndicator({
  detectedCount,
  isModelLoading,
  isModelReady,
  autoScanStatus = "idle",
}: DetectionIndicatorProps) {
  if (isModelLoading) {
    return (
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 animate-fade-in">
        <Crosshair className="h-3.5 w-3.5 text-white/50 animate-pulse-glow" />
        <span className="text-[11px] text-white/50">
          Preparando detecção...
        </span>
      </div>
    );
  }

  if (!isModelReady) return null;

  const hasDetection = detectedCount > 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-1.5 transition-all duration-500 ease-out",
          hasDetection
            ? "bg-emerald-500/25 border border-emerald-400/30"
            : "bg-black/40"
        )}
      >
        {hasDetection ? (
          <>
            <Car className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] text-emerald-300 font-medium">
              {detectedCount} {detectedCount === 1 ? "carrinho detectado" : "carrinhos detectados"}
            </span>
          </>
        ) : (
          <>
            <Crosshair className="h-3.5 w-3.5 text-white/40 animate-pulse-glow" />
            <span className="text-[11px] text-white/40">
              Aponte para um carrinho
            </span>
          </>
        )}
      </div>

      {/* Auto-scan countdown indicator */}
      {autoScanStatus === "counting" && hasDetection && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 bg-primary/20 backdrop-blur-sm rounded-full px-3 py-1"
        >
          <Loader2 className="h-3 w-3 text-primary animate-spin" />
          <span className="text-[10px] text-primary font-medium">
            Analisando automaticamente...
          </span>
          {/* Progress bar */}
          <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden ml-1">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}

      {autoScanStatus === "triggered" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5 bg-emerald-500/30 backdrop-blur-sm rounded-full px-3 py-1"
        >
          <span className="text-[10px] text-emerald-300 font-medium">
            ✓ Capturando...
          </span>
        </motion.div>
      )}
    </div>
  );
}
