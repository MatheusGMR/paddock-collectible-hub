import { useNavigate } from "react-router-dom";
import { Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedCuriosity } from "@/hooks/useFeaturedCuriosity";
import { getTierLabel, getTierColor, getTierBgColor, getTierBorderColor } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";

interface FeaturedCuriosityCardProps {
  curiosity: FeaturedCuriosity | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const FeaturedCuriosityCard = ({ 
  curiosity, 
  loading, 
  onRefresh 
}: FeaturedCuriosityCardProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="mx-4 my-4 rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-16 w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!curiosity) {
    return null;
  }

  const tier = curiosity.rarityTier || "common";
  const carName = `${curiosity.carBrand} ${curiosity.carModel}${curiosity.carYear ? ` ${curiosity.carYear}` : ""}`;

  const handleOwnerClick = () => {
    navigate(`/user/${curiosity.owner.id}`);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRefresh?.();
  };

  return (
    <div className="mx-4 my-4 rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-primary">
            Curiosidade do Dia
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Carregar outra curiosidade"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Image */}
      <div className="px-4 pb-3">
        <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-muted">
          <img
            src={curiosity.imageUrl}
            alt={carName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          
          {/* Rarity badge overlay */}
          {curiosity.priceIndex && (
            <div className="absolute top-2 right-2">
              <div className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border",
                getTierBgColor(tier),
                getTierBorderColor(tier),
                getTierColor(tier)
              )}>
                {getTierLabel(tier)} • {curiosity.priceIndex}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Car info */}
      <div className="px-4 pb-2">
        <h3 className="text-base font-bold text-foreground">
          {carName}
        </h3>
        {(curiosity.manufacturer || curiosity.scale) && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {[curiosity.manufacturer, curiosity.scale].filter(Boolean).join(" • ")}
          </p>
        )}
      </div>

      {/* Historical fact / curiosity */}
      {curiosity.historicalFact && (
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground/90 leading-relaxed italic">
            "{curiosity.historicalFact}"
          </p>
        </div>
      )}

      {/* Owner section with CTA */}
      <div className="px-4 pb-4 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleOwnerClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage src={curiosity.owner.avatarUrl || undefined} />
              <AvatarFallback className="bg-muted text-foreground text-xs">
                {curiosity.owner.username[0]?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">
                Da coleção de
              </p>
              <p className="text-sm font-semibold text-primary">
                @{curiosity.owner.username}
              </p>
            </div>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOwnerClick}
            className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            Ver coleção
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
