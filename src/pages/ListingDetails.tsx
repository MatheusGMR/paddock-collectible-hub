import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Calendar, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BuyButton } from "@/components/checkout/BuyButton";
import { SourceBadge } from "@/components/mercado/SourceBadge";
import { IndexCard } from "@/components/index/IndexCard";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice, getSourceByCode } from "@/data/marketplaceSources";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ListingData {
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
}

interface ItemData {
  real_car_brand: string;
  real_car_model: string;
  real_car_year: string | null;
  collectible_scale: string | null;
  collectible_manufacturer: string | null;
  collectible_condition: string | null;
  collectible_color: string | null;
  collectible_series: string | null;
  collectible_origin: string | null;
  rarity_tier: string | null;
  price_index: number | null;
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  historical_fact: string | null;
  index_breakdown: any | null;
}

const rarityColors: Record<string, string> = {
  legendary: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  epic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  rare: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  uncommon: "bg-green-500/20 text-green-400 border-green-500/30",
  common: "bg-muted text-muted-foreground border-border",
};

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [listing, setListing] = useState<ListingData | null>(null);
  const [item, setItem] = useState<ItemData | null>(null);
  const [sellerProfile, setSellerProfile] = useState<{ username: string; avatar_url: string | null; city: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) {
        setError("ID não encontrado");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;
        setListing(data);

        // Fetch item data if linked
        if (data.item_id) {
          const { data: itemData } = await supabase
            .from("items")
            .select("*")
            .eq("id", data.item_id)
            .single();
          if (itemData) setItem(itemData);
        }

        // Fetch seller profile
        if (data.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url, city")
            .eq("user_id", data.user_id)
            .single();
          if (profile) setSellerProfile(profile);
        }
      } catch (err) {
        console.error("Error fetching listing:", err);
        setError(t.errors.notFound);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [id, t.errors.notFound]);

  const sourceData = listing ? getSourceByCode(listing.source) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur pt-safe">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur pt-safe">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">{t.errors.notFound}</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground">{error || t.errors.notFound}</p>
          <Button onClick={() => navigate("/mercado")} className="mt-4">
            {t.checkout?.backToMarket || "Voltar ao Mercado"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium text-foreground line-clamp-1">
            {listing.title}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <SourceBadge source={listing.source} />
          </div>
          {item?.rarity_tier && (
            <Badge
              variant="outline"
              className={cn(
                "absolute top-3 left-3",
                rarityColors[item.rarity_tier] || rarityColors.common
              )}
            >
              <Star className="h-3 w-3 mr-1" />
              {t.index?.tiers?.[item.rarity_tier as keyof typeof t.index.tiers] || item.rarity_tier}
            </Badge>
          )}
        </div>

        {/* Title and Price */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">
            {formatPrice(listing.price, listing.currency)}
          </p>

          {/* Market value comparison */}
          {item?.estimated_value_min != null && item?.estimated_value_max != null && (
            <div className="mt-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Valor de mercado: {formatPrice(item.estimated_value_min, listing.currency)} – {formatPrice(item.estimated_value_max, listing.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Rarity Index Card */}
        {item?.price_index != null && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground mb-3">
              {t.index?.priceIndex || "Índice de Preço"}
            </h2>
            <IndexCard
              rank={0}
              image={listing.image_url}
              brand={item.real_car_brand}
              model={item.real_car_model}
              manufacturer={item.collectible_manufacturer || ""}
              series={item.collectible_series || undefined}
              score={item.price_index}
              tier={item.rarity_tier || "common"}
            />
          </div>
        )}

        {/* Collectible Details */}
        {item && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              Dados do Colecionável
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Marca" value={item.real_car_brand} />
              <DetailRow label="Modelo" value={item.real_car_model} />
              {item.real_car_year && <DetailRow label="Ano" value={item.real_car_year} />}
              {item.collectible_scale && <DetailRow label="Escala" value={item.collectible_scale} />}
              {item.collectible_manufacturer && <DetailRow label="Fabricante" value={item.collectible_manufacturer} />}
              {item.collectible_condition && <DetailRow label="Condição" value={item.collectible_condition} />}
              {item.collectible_color && <DetailRow label="Cor" value={item.collectible_color} />}
              {item.collectible_series && <DetailRow label="Série" value={item.collectible_series} />}
              {item.collectible_origin && <DetailRow label="Origem" value={item.collectible_origin} />}
            </div>
          </div>
        )}

        {/* Historical Fact */}
        {item?.historical_fact && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground mb-2">
              Fato Histórico
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.historical_fact}
            </p>
          </div>
        )}

        {/* Source, Date, Seller */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <MapPin className="h-3 w-3" />
            {sourceData?.flag} {listing.source_name}
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Calendar className="h-3 w-3" />
            {format(new Date(listing.created_at), "d MMM yyyy", {
              locale: language === "pt-BR" ? ptBR : undefined,
            })}
          </Badge>
        </div>

        {/* Seller info */}
        {sellerProfile && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
              {sellerProfile.avatar_url ? (
                <img src={sellerProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {sellerProfile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">@{sellerProfile.username}</p>
              {sellerProfile.city && (
                <p className="text-xs text-muted-foreground">{sellerProfile.city}</p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {listing.description && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {language === "pt-BR" ? "Descrição" : "Description"}
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>
        )}

        {/* Security Badge */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t.checkout?.securePayment || "Pagamento Seguro"}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "pt-BR"
                ? "Apple Pay, Google Pay e Cartão de Crédito"
                : "Apple Pay, Google Pay and Credit Card"}
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Buy Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 p-4 backdrop-blur">
        <BuyButton
          listingId={listing.id}
          price={listing.price}
          currency={listing.currency}
        />
      </div>
    </div>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-muted-foreground text-xs">{label}</span>
    <p className="text-foreground font-medium">{value}</p>
  </div>
);
