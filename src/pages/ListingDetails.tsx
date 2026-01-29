import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BuyButton } from "@/components/checkout/BuyButton";
import { SourceBadge } from "@/components/mercado/SourceBadge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice, getSourceByCode } from "@/data/marketplaceSources";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [listing, setListing] = useState<ListingData | null>(null);
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
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-32" />
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
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-medium">{t.errors.notFound}</span>
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
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-medium text-foreground line-clamp-1">
          {listing.title}
        </span>
      </div>

      {/* Content */}
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
        </div>

        {/* Title and Price */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
          <p className="mt-2 text-3xl font-bold text-primary">
            {formatPrice(listing.price, listing.currency)}
          </p>
        </div>

        {/* Source and Date Info */}
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
