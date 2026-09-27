import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: string;
  onSave: (image: string) => void | Promise<void>;
  legacy?: boolean;
  onReplace?: (file: File) => void;
}

export function CollectiblePhotoEditor({ open, onOpenChange, source, onSave, legacy, onReplace }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<
    | { type: "drag"; x: number; y: number; offsetX: number; offsetY: number }
    | { type: "pinch"; distance: number; centerX: number; centerY: number; zoom: number; offsetX: number; offsetY: number }
    | null
  >(null);
  const transformRef = useRef({ zoom: 1, offset: { x: 0, y: 0 } });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateTransform = (nextZoom: number, nextOffset: { x: number; y: number }) => {
    transformRef.current = { zoom: nextZoom, offset: nextOffset };
    setZoom(nextZoom);
    setOffset(nextOffset);
  };

  const startGesture = (canvas: HTMLCanvasElement) => {
    const pointers = [...pointersRef.current.values()];
    const { zoom: currentZoom, offset: currentOffset } = transformRef.current;
    if (pointers.length >= 2) {
      const rect = canvas.getBoundingClientRect();
      const [a, b] = pointers;
      gestureRef.current = {
        type: "pinch",
        distance: Math.hypot(b.x - a.x, b.y - a.y),
        centerX: ((a.x + b.x) / 2 - rect.left) / rect.width,
        centerY: ((a.y + b.y) / 2 - rect.top) / rect.height,
        zoom: currentZoom,
        offsetX: currentOffset.x,
        offsetY: currentOffset.y,
      };
    } else if (pointers.length === 1) {
      gestureRef.current = { type: "drag", x: pointers[0].x, y: pointers[0].y, offsetX: currentOffset.x, offsetY: currentOffset.y };
    } else {
      gestureRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) return;
    pointersRef.current.clear();
    gestureRef.current = null;
    updateTransform(1, { x: 0, y: 0 });
    setReady(false);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => { imageRef.current = image; setReady(true); };
    image.onerror = () => { imageRef.current = null; toast.error("Não foi possível abrir esta foto."); };
    image.src = source;
    return () => { image.onload = null; image.onerror = null; imageRef.current = null; };
  }, [source, open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const base = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * base * zoom;
    const h = image.naturalHeight * base * zoom;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (width - w) / 2 + offset.x * width, (height - h) / 2 + offset.y * height, w, h);
  }, [ready, zoom, offset]);

  const save = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setSaving(true);
    try {
      await onSave(canvas.toDataURL("image/jpeg", 0.9));
      onOpenChange(false);
    } catch (error) {
      console.error("Photo adjustment failed:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a foto. Tente novamente.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[100] w-[calc(100vw-1.5rem)] max-w-lg max-h-[92dvh] overflow-y-auto rounded-lg bg-background p-4 sm:p-6">
        <DialogHeader><DialogTitle>Ajustar foto</DialogTitle></DialogHeader>
        {legacy && <p className="text-xs text-muted-foreground">A foto original não está disponível para este item. Você pode ajustar a imagem salva ou escolher outra foto.</p>}
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md bg-muted">
          <canvas
            ref={canvasRef} width={1200} height={900}
            aria-label="Arraste para posicionar; use dois dedos para ampliar ou reduzir a foto"
            className="w-full h-full touch-none cursor-move"
            onPointerDown={(e) => {
              if (!ready) return;
              pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              e.currentTarget.setPointerCapture(e.pointerId);
              startGesture(e.currentTarget);
            }}
            onPointerMove={(e) => {
              if (!pointersRef.current.has(e.pointerId)) return;
              pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              const gesture = gestureRef.current;
              if (!gesture) return;
              const rect = e.currentTarget.getBoundingClientRect();
              if (gesture.type === "drag" && pointersRef.current.size === 1) {
                updateTransform(transformRef.current.zoom, {
                  x: gesture.offsetX + (e.clientX - gesture.x) / rect.width,
                  y: gesture.offsetY + (e.clientY - gesture.y) / rect.height,
                });
              } else if (gesture.type === "pinch" && pointersRef.current.size >= 2 && gesture.distance > 0) {
                const [a, b] = [...pointersRef.current.values()];
                const nextZoom = Math.min(8, Math.max(0.5, gesture.zoom * Math.hypot(b.x - a.x, b.y - a.y) / gesture.distance));
                const ratio = nextZoom / gesture.zoom;
                const centerX = ((a.x + b.x) / 2 - rect.left) / rect.width;
                const centerY = ((a.y + b.y) / 2 - rect.top) / rect.height;
                updateTransform(nextZoom, {
                  x: centerX - 0.5 + (gesture.offsetX + 0.5 - gesture.centerX) * ratio,
                  y: centerY - 0.5 + (gesture.offsetY + 0.5 - gesture.centerY) * ratio,
                });
              }
            }}
            onPointerUp={(e) => { pointersRef.current.delete(e.pointerId); startGesture(e.currentTarget); }}
            onPointerCancel={(e) => { pointersRef.current.delete(e.pointerId); startGesture(e.currentTarget); }}
          />
          {!ready && <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">Use dois dedos para ampliar ou reduzir. Arraste para posicionar o carrinho.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="icon" title="Reduzir foto" aria-label="Reduzir foto" disabled={!ready || zoom <= 0.5} onClick={() => updateTransform(Math.max(0.5, transformRef.current.zoom / 1.2), transformRef.current.offset)}><Minus className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" title="Ampliar foto" aria-label="Ampliar foto" disabled={!ready || zoom >= 8} onClick={() => updateTransform(Math.min(8, transformRef.current.zoom * 1.2), transformRef.current.offset)}><Plus className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" title="Restaurar enquadramento" aria-label="Restaurar enquadramento" onClick={() => updateTransform(1, { x: 0, y: 0 })}><RotateCcw className="h-4 w-4" /></Button>
          {onReplace && <><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onReplace(file); e.target.value = ""; }} /><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Outra foto</Button></>}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={save} disabled={!ready || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}