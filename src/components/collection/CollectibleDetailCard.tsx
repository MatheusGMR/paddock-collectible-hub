import { useState } from "react";
import { X, Car, Package, History, ChevronDown, ChevronUp } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { IndexBadge } from "@/components/index/IndexBadge";
import { IndexBreakdown } from "@/components/index/IndexBreakdown";
import { PriceIndexBreakdown, getRarityTier } from "@/lib/priceIndex";
import { MusicPlayer } from "@/components/scanner/MusicPlayer";
import { RealCarPhotoCarousel } from "@/components/collection/RealCarPhotoCarousel";
import { cn } from "@/lib/utils";

export interface CollectibleDetailItem {
  id: string;
  image_url: string | null;
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
  } | null;
}

interface CollectibleDetailCardProps {
  item: CollectibleDetailItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection = ({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
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

export const CollectibleDetailCard = ({ item, open, onOpenChange }: CollectibleDetailCardProps) => {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  
  if (!item?.item) return null;
  
  const { item: data } = item;
  const score = data.price_index ?? 0;
  const tier = data.rarity_tier ?? getRarityTier(score);

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
              {/* Hero Image - using object-contain to show full car */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-muted to-muted/50 flex items-center justify-center">
                <img
                  src={item.image_url || "/placeholder.svg"}
                  alt={`${data.real_car_brand} ${data.real_car_model}`}
                  className="max-w-full max-h-full object-contain"
                />
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
              {score > 0 && (
                <div className="flex justify-center">
                  <IndexBadge
                    score={score}
                    tier={tier}
                    onClick={() => setBreakdownOpen(true)}
                  />
                </div>
              )}
              
              {/* Collapsible Sections */}
              <div className="space-y-3">
                {/* Real Car Data */}
                <CollapsibleSection 
                  title="Dados do Carro Real" 
                  icon={<Car className="h-4 w-4 text-primary" />}
                  defaultOpen
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
              
              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
      
      {/* Index Breakdown Sheet */}
      {data.index_breakdown && (
        <IndexBreakdown
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          score={score}
          tier={tier}
          breakdown={data.index_breakdown}
        />
      )}
    </>
  );
};
