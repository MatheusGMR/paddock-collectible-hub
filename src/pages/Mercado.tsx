import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Star, Car, Package } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { CartSheet } from "@/components/mercado/CartSheet";
import { SellerStoresSection } from "@/components/mercado/SellerStoresSection";
import { AddToCartButton } from "@/components/mercado/AddToCartButton";
import { BuyButton } from "@/components/checkout/BuyButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice } from "@/data/marketplaceSources";
import { useScreenTips } from "@/hooks/useScreenTips";
import { getTierLabel, getTierColor, getTierBgColor } from "@/lib/priceIndex";
import { cn } from "@/lib/utils";

interface MarketplaceListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  image_url: string;
  source: string;
  source_name: string;
  source_country: string;
  created_at: string;
  user_id: string | null;
  item_id: string | null;
  item?: {
    real_car_brand: string;
    real_car_model: string;
    real_car_year: string | null;
    collectible_scale: string | null;
    collectible_manufacturer: string | null;
    collectible_condition: string | null;
    collectible_color: string | null;
    collectible_series: string | null;
    rarity_tier: string | null;
    price_index: number | null;
    estimated_value_min: number | null;
    estimated_value_max: number | null;
  } | null;
  seller?: {
    username: string;
    avatar_url: string | null;
    city: string | null;
  } | null;
}

const tierBorderAccent: Record<string, string> = {
  ultra_rare: "border-amber-400/40",
  super_rare: "border-purple-400/40",
  legendary: "border-amber-400/40",
  epic: "border-purple-400/40",
  rare: "border-blue-400/40",
  uncommon: "border-green-400/40",
  common: "border-border",
};

const tierGlowShadow: Record<string, string> = {
  ultra_rare: "shadow-[0_2px_12px_rgba(245,158,11,0.15)]",
  super_rare: "shadow-[0_2px_12px_rgba(168,85,247,0.15)]",
  legendary: "shadow-[0_2px_12px_rgba(245,158,11,0.15)]",
  epic: "shadow-[0_2px_12px_rgba(168,85,247,0.15)]",
  rare: "shadow-[0_2px_12px_rgba(59,130,246,0.15)]",
  uncommon: "shadow-[0_2px_12px_rgba(16,185,129,0.12)]",
  common: "",
};

const Mercado = () => {
  useScreenTips("mercado", 600);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const debouncedSearch = useDebounce(searchQuery, 400);

  const LIMIT = 20;

  const fetchListings = useCallback(async (reset = false) => {
    setIsLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      let query = supabase
        .from("listings")
        .select(`
          id, title, description, price, currency, image_url,
          source, source_name, source_country, created_at,
          user_id, item_id,
          items (
            real_car_brand, real_car_model, real_car_year,
            collectible_scale, collectible_manufacturer, collectible_condition,
            collectible_color, collectible_series,
            rarity_tier, price_index, estimated_value_min, estimated_value_max
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (debouncedSearch) {
        query = query.ilike("title", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const userIds = [...new Set((data || []).filter(l => l.user_id).map(l => l.user_id!))];
      let profilesMap = new Map<string, { username: string; avatar_url: string | null; city: string | null }>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url, city")
          .in("user_id", userIds);

        profiles?.forEach(p => profilesMap.set(p.user_id, p));
      }

      const mapped: MarketplaceListing[] = (data || []).map(l => ({
        ...l,
        item: l.items as MarketplaceListing["item"],
        seller: l.user_id ? profilesMap.get(l.user_id) || null : null,
      }));

      if (reset) {
        setListings(mapped);
        setOffset(LIMIT);
      } else {
        setListings(prev => [...prev, ...mapped]);
        setOffset(prev => prev + LIMIT);
      }

      setHasMore((data || []).length >= LIMIT);
    } catch (error) {
      console.error("Error fetching marketplace listings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [offset, debouncedSearch]);

  useEffect(() => {
    fetchListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold text-foreground">{t.mercado.title}</h1>
            </div>
            <div data-tip="mercado-cart"><CartSheet /></div>
          </div>
          <div className="relative" data-tip="mercado-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.mercado.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-border"
            />
          </div>
        </div>
      </div>

      {/* Seller Stores */}
      <div data-tip="mercado-stores"><SellerStoresSection /></div>

      {/* Listings */}
      <div className="p-4 pb-20">
        {isLoading && listings.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground">{t.mercado.noListingsFound}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.mercado.noListingsFoundDesc}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <div key={listing.id} data-tip={listings.indexOf(listing) === 0 ? "mercado-listing" : undefined}>
                <MarketplaceCard
                  listing={listing}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                />
                </div>
              ))}
            </div>

            {isLoading && listings.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/** Card inspired by the scanner result card — glassmorphism, rarity tint, rich specs */
const MarketplaceCard = ({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) => {
  const item = listing.item;
  const { t } = useLanguage();
  const tier = item?.rarity_tier || "common";
  const borderClass = tierBorderAccent[tier] || tierBorderAccent.common;
  const glowClass = tierGlowShadow[tier] || "";

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm text-left",
        "transition-all duration-200 hover:shadow-lg",
        borderClass,
        glowClass
      )}
    >
      {/* Clickable area */}
      <button onClick={onClick} className="w-full text-left active:scale-[0.98] transition-transform">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Rarity badge - top left */}
          {item?.rarity_tier && item.rarity_tier !== "common" && (
            <div className={cn(
              "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide backdrop-blur-md border",
              tier === "ultra_rare" || tier === "legendary"
                ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                : tier === "super_rare" || tier === "epic"
                ? "bg-purple-500/20 text-purple-300 border-purple-400/40"
                : tier === "rare"
                ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                : "bg-green-500/20 text-green-300 border-green-400/40"
            )}>
              <Star className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />
              {getTierLabel(tier)}
            </div>
          )}

          {/* Score badge - top right */}
          {item?.price_index != null && (
            <div className={cn(
              "absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center text-xs font-black backdrop-blur-md border",
              tier === "ultra_rare" || tier === "legendary"
                ? "bg-amber-500/30 text-amber-200 border-amber-400/50"
                : tier === "super_rare" || tier === "epic"
                ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
                : tier === "rare"
                ? "bg-blue-500/30 text-blue-200 border-blue-400/50"
                : tier === "uncommon"
                ? "bg-green-500/30 text-green-200 border-green-400/50"
                : "bg-background/70 text-foreground border-border/50"
            )}>
              {item.price_index}
            </div>
          )}

          {/* Price overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <p className="text-lg font-bold text-white">
              {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
        </div>

        {/* Content - scanner-style layout */}
        <div className="p-3 space-y-2">
          {/* Title — brand + model as header, like scanner */}
          {item ? (
            <>
              <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">
                {item.real_car_brand} {item.real_car_model}
              </h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {item.collectible_manufacturer}
                {item.collectible_scale ? ` • ${item.collectible_scale}` : ""}
                {item.real_car_year ? ` • ${item.real_car_year}` : ""}
              </p>
            </>
          ) : (
            <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2">
              {listing.title}
            </h3>
          )}

          {/* Spec chips — condition, color, series */}
          {item && (
            <div className="flex flex-wrap gap-1">
              {item.collectible_condition && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
                  {item.collectible_condition}
                </span>
              )}
              {item.collectible_color && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
                  {item.collectible_color}
                </span>
              )}
              {item.collectible_series && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/50">
                  {item.collectible_series}
                </span>
              )}
            </div>
          )}

          {/* Seller */}
          {listing.seller && (
            <p className="text-[10px] text-muted-foreground truncate">
              por @{listing.seller.username}
              {listing.seller.city ? ` · ${listing.seller.city}` : ""}
            </p>
          )}
        </div>
      </button>

      {/* Quick action buttons */}
      <div className="px-3 pb-3 flex gap-2">
        <AddToCartButton
          listingId={listing.id}
          size="sm"
          variant="outline"
          className="flex-1 text-xs h-8"
          showLabel={true}
        />
        <BuyButton
          listingId={listing.id}
          price={listing.price}
          currency={listing.currency}
          compact
        />
      </div>
    </div>
  );
};

export default Mercado;
