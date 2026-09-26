import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Loader2 } from "lucide-react";
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
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
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
            aria-label="Arraste para posicionar o carrinho"
            className="w-full h-full touch-none cursor-move"
            onPointerDown={(e) => {
              if (!ready) return;
              dragRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current;
              if (!drag) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setOffset({ x: drag.offsetX + (e.clientX - drag.x) / rect.width, y: drag.offsetY + (e.clientY - drag.y) / rect.height });
            }}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          />
          {!ready && <Loader2 className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span>Tamanho</span><span>{Math.round(zoom * 100)}%</span></div>
          <Slider aria-label="Tamanho da foto" value={[zoom]} onValueChange={([value]) => setZoom(value)} min={0.5} max={8} step={0.05} disabled={!ready} />
          <p className="text-xs text-muted-foreground">Diminua para criar margem; arraste para centralizar o carrinho.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="icon" title="Restaurar enquadramento" aria-label="Restaurar enquadramento" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}><RotateCcw className="h-4 w-4" /></Button>
          {onReplace && <><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onReplace(file); e.target.value = ""; }} /><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Outra foto</Button></>}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={save} disabled={!ready || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}