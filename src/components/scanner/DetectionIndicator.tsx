import { Car, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

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
  );
}
