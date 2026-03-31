import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Plus, Eye, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { QueuedMedia, DetectedVehicle } from "./types";

interface BatchConfirmGridProps {
  mediaQueue: QueuedMedia[];
  onConfirm: () => void;
  onReplaceImage: (index: number) => void;
  onUpdateCount: (index: number, count: number) => void;
}

export function BatchConfirmGrid({
  mediaQueue,
  onConfirm,
  onReplaceImage,
  onUpdateCount,
}: BatchConfirmGridProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const totalVehicles = mediaQueue.reduce((sum, m) => sum + (m.vehicleCount || 0), 0);
  const allCounted = mediaQueue.every((m) => m.status === "counted");
  // Allow advancing if user manually adjusted any count (even if auto-detection returned 0)
  const hasManualAdjustments = mediaQueue.some((m) => m.manuallyAdjusted && (m.vehicleCount || 0) > 0);
  const canConfirm = allCounted && (totalVehicles > 0 || hasManualAdjustments);

  const selectedMedia = selectedImageIndex !== null ? mediaQueue[selectedImageIndex] : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header summary */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Veículos detectados
            </h3>
            <p className="text-sm text-foreground-secondary">
              {totalVehicles} {totalVehicles === 1 ? "veículo" : "veículos"} em {mediaQueue.length} {mediaQueue.length === 1 ? "foto" : "fotos"}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Toque para revisar
          </Badge>
        </div>
      </div>

      {/* Image detail view */}
      {selectedMedia && selectedImageIndex !== null ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Back button */}
          <div className="px-4 py-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImageIndex(null)}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <span className="text-sm text-foreground-secondary">
              Foto {selectedImageIndex + 1} de {mediaQueue.length}
            </span>
          </div>

          {/* Image with bounding boxes */}
          <div className="flex-1 relative mx-4 mb-3 rounded-xl overflow-hidden bg-muted">
            <img
              src={selectedMedia.base64}
              alt={`Foto ${selectedImageIndex + 1}`}
              className="w-full h-full object-contain"
            />
            {/* Bounding box overlays */}
            {selectedMedia.detectedVehicles?.map((vehicle, vIdx) => (
              <div
                key={vIdx}
                className="absolute border-2 border-primary rounded-lg pointer-events-none"
                style={{
                  left: `${vehicle.boundingBox.x}%`,
                  top: `${vehicle.boundingBox.y}%`,
                  width: `${vehicle.boundingBox.width}%`,
                  height: `${vehicle.boundingBox.height}%`,
                }}
              >
                <div className="absolute -top-5 left-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-t-md whitespace-nowrap">
                  {vehicle.label}
                </div>
              </div>
            ))}
          </div>

          {/* Count adjustment */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between bg-muted rounded-xl p-3">
              <span className="text-sm font-medium text-foreground">
                Veículos nesta foto:
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    onUpdateCount(selectedImageIndex, Math.max(0, (selectedMedia.vehicleCount || 0) - 1))
                  }
                >
                  -
                </Button>
                <span className="text-lg font-bold text-foreground min-w-[2ch] text-center">
                  {selectedMedia.vehicleCount || 0}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    onUpdateCount(selectedImageIndex, (selectedMedia.vehicleCount || 0) + 1)
                  }
                >
                  +
                </Button>
              </div>
            </div>

            {/* Navigation between images */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={selectedImageIndex === 0}
                onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={selectedImageIndex === mediaQueue.length - 1}
                onClick={() => setSelectedImageIndex(Math.min(mediaQueue.length - 1, selectedImageIndex + 1))}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Replace image option */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-foreground-secondary"
              onClick={() => onReplaceImage(selectedImageIndex)}
            >
              Substituir esta imagem
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Grid view */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              {mediaQueue.map((media, idx) => {
                const isLoading = media.status === "counting";
                const count = media.vehicleCount || 0;
                const hasVehicles = count > 0;

                return (
                  <button
                    key={media.id}
                    className={cn(
                      "relative rounded-xl overflow-hidden border-2 transition-all text-left",
                      hasVehicles ? "border-primary/50" : "border-destructive/50",
                      isLoading && "opacity-70 animate-pulse"
                    )}
                    onClick={() => setSelectedImageIndex(idx)}
                    disabled={isLoading}
                  >
                    <img
                      src={media.base64}
                      alt={`Foto ${idx + 1}`}
                      className="w-full aspect-square object-cover"
                    />

                    {/* Count badge */}
                    {!isLoading && (
                      <div
                        className={cn(
                          "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                          hasVehicles
                            ? "bg-primary text-primary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        )}
                      >
                        {hasVehicles ? (
                          <>
                            <Check className="h-3 w-3" />
                            {count} {count === 1 ? "veículo" : "veículos"}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            Nenhum
                          </>
                        )}
                      </div>
                    )}

                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Tap hint */}
                    {!isLoading && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-2 pt-6">
                        <div className="flex items-center gap-1 text-[11px] text-foreground-secondary">
                          <Eye className="h-3 w-3" />
                          Toque para revisar
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm button */}
          <div className="px-4 py-3 border-t border-border">
            <Button
              onClick={onConfirm}
              disabled={!allCounted || totalVehicles === 0}
              className="w-full"
            >
              {totalVehicles > 0
                ? `Analisar ${totalVehicles} ${totalVehicles === 1 ? "veículo" : "veículos"}`
                : "Nenhum veículo detectado"}
            </Button>
            {totalVehicles === 0 && allCounted && (
              <p className="text-xs text-foreground-secondary text-center mt-2">
                Toque nas fotos para ajustar a contagem ou substituir imagens
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
