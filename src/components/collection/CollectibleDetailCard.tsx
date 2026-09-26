import { useState, useEffect } from "react";
import { X, Car, Package, History, ChevronDown, ChevronUp, Trash2, Loader2, ImageOff, TrendingUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IndexBadge } from "@/components/index/IndexBadge";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { PriceIndexBreakdown, getRarityTier, formatBRL } from "@/lib/priceIndex";
import { MusicPlayer } from "@/components/scanner/MusicPlayer";
import { RealCarPhotoCarousel } from "@/components/collection/RealCarPhotoCarousel";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { CollectiblePhotoEditor } from "@/components/collection/CollectiblePhotoEditor";
import { useAuth } from "@/contexts/AuthContext";
import { uploadCollectionImage } from "@/lib/uploadImage";

interface UserContext {
  special_edition?: boolean;
  numbered?: boolean;
  unique?: boolean;
  imported_from?: string;
  notes?: string;
}

export interface CollectibleDetailItem {
  id: string;
  image_url: string | null;
  original_image_url?: string | null;
  user_context?: UserContext | null;
  item: {
    real_car_brand: string;
    real_car_model: string;
    real_car_year?: string | null;
    historical_fact?: string | null;
    collectible_manufacturer?: string | null;
    collectible_scale?: string | null;
    collectible_series?: string | null;
    collectible_origin?: string | null;
    collectible_condition?: string | null;
    collectible_year?: string | null;
    collectible_notes?: string | null;
    price_index?: number | null;
    rarity_tier?: string | null;
    index_breakdown?: PriceIndexBreakdown | null;
    music_suggestion?: string | null;
    music_selection_reason?: string | null;
    real_car_photos?: string[] | null;
    estimated_value_min?: number | null;
    estimated_value_max?: number | null;
  } | null;
}

interface CollectibleDetailCardProps {
  item: CollectibleDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => Promise<void>;
  canEditPhoto?: boolean;
  onPhotoUpdated?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  dataTip?: string;
}

const CollapsibleSection = ({ title, icon, defaultOpen = false, children, dataTip }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} data-tip={dataTip}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-foreground-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground-secondary" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 px-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-foreground-secondary text-sm">{label}</span>
      <span className="text-foreground text-sm font-medium">{value}</span>
    </div>
  );
};

export const CollectibleDetailCard = ({ item, open, onOpenChange, onDelete, canEditPhoto = false, onPhotoUpdated }: CollectibleDetailCardProps) => {
  const { user } = useAuth();
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [updatedImage, setUpdatedImage] = useState<string | null>(null);
  const [updatedOriginal, setUpdatedOriginal] = useState<string | null>(null);
  useEffect(() => {
    return () => { if (photoSource?.startsWith("blob:")) URL.revokeObjectURL(photoSource); };
  }, [photoSource]);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [override, setOverride] = useState<{ score: number; breakdown: PriceIndexBreakdown } | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctx, setCtx] = useState<UserContext>({});

  useEffect(() => {
    setOverride(null);
    setCtx(item?.user_context ?? {});
    if (!item?.user_context) {
      supabase.from("user_collection").select("user_context").eq("id", item?.id ?? "").maybeSingle()
        .then(({ data }) => { if (data?.user_context) setCtx(data.user_context as UserContext); });
    }
  }, [item?.id]);

  const recalculate = async (saveContext: boolean) => {
    if (!item) return;
    setRecalculating(true);
    try {
      if (saveContext) {
        const { error } = await supabase.from("user_collection").update({ user_context: ctx as never }).eq("id", item.id);
        if (error) throw error;
      }
      const { data: res, error } = await supabase.functions.invoke("recalculate-index", { body: { collectionIds: [item.id] } });
      if (error) throw error;
      const r = res?.results?.[0];
      if (!r || r.error) throw new Error(r?.error || "Falha");
      const { data: fresh } = await supabase.from("user_collection").select("item:items(price_index,index_breakdown)").eq("id", item.id).single();
      const f = fresh?.item as unknown as { price_index: number; index_breakdown: PriceIndexBreakdown } | null;
      if (f) setOverride({ score: f.price_index, breakdown: f.index_breakdown });
      setCtxOpen(false);
      toast.success(`Pontuação atualizada: ${r.score}`);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível recalcular agora. Tente novamente.");
    } finally {
      setRecalculating(false);
    }
  };
  
  // Reset image state when item changes
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
    setUpdatedImage(null);
    setUpdatedOriginal(null);
    setPhotoSource(null);
  }, [item?.id]);

  // Resolve the best available image: captured photo > real car photo > placeholder
  const resolvedImageUrl = (() => {
    const captured = updatedImage || item?.image_url;
    // Accept any non-empty string that looks like a valid image source
    if (captured && captured.trim().length > 0 && captured !== "/placeholder.svg") return captured;
    // Fallback to first real car photo
    const realPhotos = item?.item?.real_car_photos;
    if (realPhotos && realPhotos.length > 0 && typeof realPhotos[0] === "string") return realPhotos[0];
    return "/placeholder.svg";
  })();
  
  if (!item?.item) return null;
  
  const { item: data } = item;
  const score = override?.score ?? data.price_index ?? 0;
  const tier = override ? getRarityTier(override.score) : (data.rarity_tier ?? getRarityTier(score));
  const breakdown = override?.breakdown ?? data.index_breakdown ?? null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(item.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95vh] max-h-[95vh]">
          <DrawerHeader className="relative border-b border-border pb-2">
            <DrawerTitle className="text-center">Detalhes do Item</DrawerTitle>
            <DrawerClose className="absolute right-4 top-4">
              <X className="h-5 w-5" />
            </DrawerClose>
          </DrawerHeader>
          
          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-4">
              {/* Hero Image - square format with object-contain to show full vehicle */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                {imageFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <ImageOff className="h-12 w-12 text-muted-foreground/40 mb-2" />
                    <span className="text-sm text-muted-foreground/60">Imagem indisponível</span>
                  </div>
                ) : (
                  <>
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                      </div>
                    )}
                    <img
                      src={resolvedImageUrl}
                      alt={`${data.real_car_brand} ${data.real_car_model}`}
                      className={cn(
                         "w-full h-full object-contain object-center transition-opacity",
                         canEditPhoto && user && "cursor-pointer",
                        imageLoaded ? "opacity-100" : "opacity-0"
                      )}
                       role={canEditPhoto && user ? "button" : undefined}
                       tabIndex={canEditPhoto && user ? 0 : undefined}
                       aria-label={canEditPhoto && user ? "Ajustar foto do carrinho" : undefined}
                       onClick={() => { if (canEditPhoto && user) { setPhotoSource(updatedOriginal || item.original_image_url || item.image_url || null); setPhotoEditorOpen(true); } }}
                       onKeyDown={(e) => { if (canEditPhoto && user && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setPhotoSource(updatedOriginal || item.original_image_url || item.image_url || null); setPhotoEditorOpen(true); } }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth < 10 || img.naturalHeight < 10) {
                          setImageFailed(true);
                        } else {
                          setImageLoaded(true);
                        }
                      }}
                      onError={() => setImageFailed(true)}
                    />
                  </>
                )}
                {canEditPhoto && user && (
                  <Button type="button" variant="secondary" size="sm" className="absolute bottom-3 right-3" onClick={() => { setPhotoSource(updatedOriginal || item.original_image_url || item.image_url || null); setPhotoEditorOpen(true); }}>Ajustar foto</Button>
                )}
              </div>
              
              {/* Title & Year */}
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">
                  {data.real_car_brand} {data.real_car_model}
                </h2>
                <p className="text-foreground-secondary">
                  {data.real_car_year} • {data.collectible_scale}
                </p>
              </div>
              
              {/* Price Index Badge */}
              <div className="flex flex-col items-center gap-3" data-tip="price-index">
                {score > 0 && (
                  <IndexBadge score={score} tier={tier} onClick={() => breakdown ? setBreakdownOpen(true) : recalculate(false)} />
                )}
                {(!breakdown || score === 0) && (
                  <Button size="sm" variant="outline" onClick={() => recalculate(false)} disabled={recalculating}>
                    {recalculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Calcular critérios
                  </Button>
                )}
                <button type="button" onClick={() => setCtxOpen((v) => !v)} className="flex items-center gap-1.5 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Informações especiais
                </button>
                {ctxOpen && (
                  <div className="w-full rounded-xl border border-border/50 bg-card/80 p-4 space-y-3">
                    <p className="text-xs text-foreground-secondary">Conte o que a foto não mostra. Isso ajusta a raridade.</p>
                    {([
                      ["special_edition", "Edição especial / licenciada"],
                      ["numbered", "Numerada / tiragem limitada"],
                      ["unique", "Unidade única"],
                    ] as const).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" className="accent-primary h-4 w-4" checked={!!ctx[k]} onChange={(e) => setCtx({ ...ctx, [k]: e.target.checked })} />
                        {label}
                      </label>
                    ))}
                    <input className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground" placeholder="Importado de (ex.: Estados Unidos)" value={ctx.imported_from ?? ""} onChange={(e) => setCtx({ ...ctx, imported_from: e.target.value.slice(0, 60) })} />
                    <textarea className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground resize-none" rows={2} placeholder="Observação (ex.: edição Elvis Presley)" value={ctx.notes ?? ""} onChange={(e) => setCtx({ ...ctx, notes: e.target.value.slice(0, 300) })} />
                    <Button className="w-full" onClick={() => recalculate(true)} disabled={recalculating}>
                      {recalculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Salvar e recalcular
                    </Button>
                  </div>
                )}
              </div>

              {/* Market Value */}
              {data.estimated_value_min != null && data.estimated_value_max != null && data.estimated_value_min > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/80 p-4 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Valor de Mercado</span>
                  </div>
                  <p className="text-xl font-bold text-foreground text-center">
                    {formatBRL(data.estimated_value_min)} – {formatBRL(data.estimated_value_max)}
                  </p>
                </div>
              )}
              
              {/* Collapsible Sections */}
              <div className="space-y-3">
                {/* Real Car Data */}
                <CollapsibleSection 
                  title="Dados do Carro Real" 
                  icon={<Car className="h-4 w-4 text-primary" />}
                  defaultOpen
                  dataTip="item-specs"
                >
                  <div className="space-y-0">
                    <DetailRow label="Marca" value={data.real_car_brand} />
                    <DetailRow label="Modelo" value={data.real_car_model} />
                    <DetailRow label="Ano" value={data.real_car_year} />
                  </div>
                </CollapsibleSection>
                
                {/* Collectible Data */}
                <CollapsibleSection 
                  title="Dados do Colecionável" 
                  icon={<Package className="h-4 w-4 text-primary" />}
                  defaultOpen
                >
                  <div className="space-y-0">
                    <DetailRow label="Fabricante" value={data.collectible_manufacturer} />
                    <DetailRow label="Escala" value={data.collectible_scale} />
                    <DetailRow label="Série" value={data.collectible_series} />
                    <DetailRow label="Condição" value={data.collectible_condition} />
                    <DetailRow label="Origem" value={data.collectible_origin} />
                    <DetailRow label="Ano do Modelo" value={data.collectible_year} />
                    {data.collectible_notes && (
                      <div className="pt-2">
                        <p className="text-xs text-foreground-secondary mb-1">Notas</p>
                        <p className="text-sm text-foreground/80">{data.collectible_notes}</p>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
                
                {/* Historical Fact */}
                {data.historical_fact && (
                  <CollapsibleSection 
                    title="Fato Histórico" 
                    icon={<History className="h-4 w-4 text-primary" />}
                    dataTip="historical-fact"
                  >
                    <p className="text-sm text-foreground/90 leading-relaxed italic">
                      "{data.historical_fact}"
                    </p>
                  </CollapsibleSection>
                )}
                
                {/* Music Player */}
                {data.music_suggestion && (
                  <MusicPlayer 
                    suggestion={data.music_suggestion} 
                    selectionReason={data.music_selection_reason || undefined}
                    carBrand={data.real_car_brand}
                    autoPreload
                  />
                )}
                
                {/* Real Car Photos Carousel */}
                <RealCarPhotoCarousel
                  photos={data.real_car_photos || []}
                  carName={`${data.real_car_brand} ${data.real_car_model}`}
                  carBrand={data.real_car_brand}
                  carModel={data.real_car_model}
                />
              </div>
              
              {/* Delete Button */}
              {onDelete && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover da Coleção
                </Button>
              )}
              
              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      {canEditPhoto && user && (
        <CollectiblePhotoEditor
          open={photoEditorOpen}
          onOpenChange={setPhotoEditorOpen}
          source={photoSource || resolvedImageUrl}
          legacy={!updatedOriginal && !item.original_image_url && !photoSource?.startsWith("blob:")}
          onReplace={(file) => { setPhotoSource(URL.createObjectURL(file)); }}
          onSave={async (image) => {
            if (!item || !user) throw new Error("Faça login para ajustar esta foto.");
            const imageUrl = await uploadCollectionImage(user.id, image);
            if (!imageUrl) throw new Error("Não foi possível enviar a foto.");
            const isReplacement = photoSource?.startsWith("blob:");
            let originalUrl: string | null = null;
            if (isReplacement && photoSource) {
              const originalBlob = await fetch(photoSource).then((response) => response.blob());
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(originalBlob);
              });
              originalUrl = await uploadCollectionImage(user.id, base64);
              if (!originalUrl) throw new Error("Não foi possível preservar a foto original.");
            }
            const { data: saved, error } = await supabase.from("user_collection")
              .update({ image_url: imageUrl, ...(originalUrl ? { original_image_url: originalUrl } : {}) })
              .eq("id", item.id).eq("user_id", user.id).select("id").maybeSingle();
            if (error || !saved) throw error || new Error("Não foi possível atualizar este carrinho.");
            setUpdatedImage(imageUrl);
            if (originalUrl) setUpdatedOriginal(originalUrl);
            setImageLoaded(false);
            setImageFailed(false);
            onPhotoUpdated?.();
            toast.success("Foto atualizada");
          }}
        />
      )}
      
      {/* Index Breakdown Sheet */}
      {breakdown && (
        <IndexBreakdown
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          score={score}
          tier={tier}
          breakdown={breakdown}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Coleção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{data.real_car_brand} {data.real_car_model}" da sua coleção? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
