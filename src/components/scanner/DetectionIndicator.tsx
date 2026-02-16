import { Car, Crosshair, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

interface DetectionIndicatorProps {
  detectedCount: number;
  isModelLoading: boolean;
  isModelReady: boolean;
}

export function DetectionIndicator({
  detectedCount,
  isModelLoading,
  isModelReady,
}: DetectionIndicatorProps) {
  const isNative = Capacitor.isNativePlatform();

  // On native: show simple guidance
  if (isNative) {
    return (
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
        <ScanLine className="h-3.5 w-3.5 text-white/40 animate-pulse" />
        <span className="text-[11px] text-white/40">
          Aponte para um carrinho
        </span>
      </div>
    );
  }

  // Web: COCO-SSD based indicator
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
    </div>
  );
}
