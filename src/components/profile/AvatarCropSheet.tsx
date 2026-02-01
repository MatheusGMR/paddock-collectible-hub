import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AvatarCropSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedImageBase64: string) => void;
}

export const AvatarCropSheet = ({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
}: AvatarCropSheetProps) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Reset transforms
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw the image on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;

    const size = 280; // Canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(size / 2, size / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale
    ctx.scale(scale, scale);

    // Apply position offset
    ctx.translate(position.x, position.y);

    // Calculate dimensions to fit/fill the circle
    const imgAspect = img.width / img.height;
    let drawWidth, drawHeight;

    if (imgAspect > 1) {
      // Landscape
      drawHeight = size / scale;
      drawWidth = drawHeight * imgAspect;
    } else {
      // Portrait
      drawWidth = size / scale;
      drawHeight = drawWidth / imgAspect;
    }

    // Draw image centered
    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    // Restore context
    ctx.restore();

    // Draw circular mask overlay
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [scale, rotation, position]);

  // Redraw when transforms change
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [imageLoaded, drawCanvas]);

  // Handle drag start
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x * scale,
      y: e.clientY - position.y * scale,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle drag move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: (e.clientX - dragStart.x) / scale,
      y: (e.clientY - dragStart.y) / scale,
    });
  };

  // Handle drag end
  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleZoom = (newScale: number[]) => {
    setScale(newScale[0]);
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Handle confirm
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export as base64
    const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(croppedBase64);
    onOpenChange(false);
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle>{t.profile.adjustPhoto || "Ajustar foto"}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center gap-6">
          {/* Preview Container */}
          <div
            ref={containerRef}
            className="relative w-[280px] h-[280px] rounded-full overflow-hidden bg-muted border-4 border-primary/30"
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-move touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            
            {/* Move hint */}
            {!isDragging && imageLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-background/80 backdrop-blur-sm rounded-full p-3">
                  <Move className="h-6 w-6 text-muted-foreground" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Zoom Control */}
          <div className="w-full max-w-xs flex items-center gap-4">
            <ZoomOut className="h-5 w-5 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={handleZoom}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Rotate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="gap-2"
          >
            <RotateCw className="h-4 w-4" />
            {t.profile.rotate || "Girar 90°"}
          </Button>

          {/* Instruction */}
          <p className="text-sm text-muted-foreground text-center">
            {t.profile.dragToAdjust || "Arraste para ajustar a posição"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-12"
          >
            <X className="h-5 w-5 mr-2" />
            {t.common.cancel || "Cancelar"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!imageLoaded}
            className="flex-1 h-12"
          >
            <Check className="h-5 w-5 mr-2" />
            {t.common.confirm || "Confirmar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
