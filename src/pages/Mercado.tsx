import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { CartSheet } from "@/components/mercado/CartSheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { formatPrice } from "@/data/marketplaceSources";
import { useScreenTips } from "@/hooks/useScreenTips";
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

const rarityColors: Record<string, string> = {
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  uncommon: "bg-green-500/20 text-green-400 border-green-500/30",
  common: "bg-muted text-muted-foreground border-border",
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
      // Fetch listings with joined item data
      let query = supabase
        .from("listings")
        .select(`
          id, title, description, price, currency, image_url,
          source, source_name, source_country, created_at,
          user_id, item_id,
          items (
            real_car_brand, real_car_model, real_car_year,
            collectible_scale, collectible_manufacturer, collectible_condition,
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

      // Fetch seller profiles for listings with user_id
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

  // Initial load
  useEffect(() => {
    fetchListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload on search change
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
            <CartSheet />
          </div>
          <div className="relative">
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
                <MarketplaceCard
                  key={listing.id}
                  listing={listing}
                  onClick={() => navigate(`/listing/${listing.id}`)}
                />
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

// Rich listing card with collectible details
const MarketplaceCard = ({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) => {
  const item = listing.item;
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl bg-card border border-border text-left",
        "transition-all duration-200 hover:shadow-lg hover:border-primary/30",
        "active:scale-[0.98]"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={listing.image_url}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Rarity badge */}
        {item?.rarity_tier && (
          <Badge
            variant="outline"
            className={cn(
              "absolute top-2 left-2 text-[10px]",
              rarityColors[item.rarity_tier] || rarityColors.common
            )}
          >
            {t.index?.tiers?.[item.rarity_tier as keyof typeof t.index.tiers] || item.rarity_tier}
          </Badge>
        )}

        {/* Price Index badge */}
        {item?.price_index != null && (
          <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px]">
            {item.price_index}
          </Badge>
        )}

        {/* Asking price overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-lg font-bold text-white">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-medium text-foreground line-clamp-2 text-sm leading-tight">
          {listing.title}
        </h3>

        {/* Car info */}
        {item && (
          <p className="text-xs text-muted-foreground">
            {item.real_car_brand} {item.real_car_model}
            {item.real_car_year ? ` (${item.real_car_year})` : ""}
          </p>
        )}

        {/* Scale & manufacturer */}
        {item && (item.collectible_scale || item.collectible_manufacturer) && (
          <div className="flex flex-wrap gap-1">
            {item.collectible_scale && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {item.collectible_scale}
              </span>
            )}
            {item.collectible_manufacturer && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {item.collectible_manufacturer}
              </span>
            )}
          </div>
        )}

        {/* Market value estimate */}
        {item?.estimated_value_min != null && item?.estimated_value_max != null && (
          <p className="text-[10px] text-muted-foreground">
            Valor aprox: {formatPrice(item.estimated_value_min, listing.currency)} – {formatPrice(item.estimated_value_max, listing.currency)}
          </p>
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
  );
};

export default Mercado;
