import { useState, useEffect } from "react";
import { Car, ExternalLink, RotateCcw, Loader2, ShoppingCart, Search, RefreshCw, Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, Listing } from "@/components/mercado/ListingCard";
import { fetchExternalListings } from "@/lib/api/listings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CollectionItemWithIndex } from "@/lib/database";
import { CollectibleDetailCard } from "@/components/collection/CollectibleDetailCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PriceIndexBreakdown } from "@/lib/priceIndex";
import { Json } from "@/integrations/supabase/types";

interface RealCarData {
  brand: string;
  model: string;
  year: string;
  variant: string;
  bodyStyle: string;
  color: string;
}

interface RealCarResultsProps {
  car: RealCarData;
  searchTerms: string[];
  confidence: "high" | "medium" | "low";
  capturedImage: string;
  onScanAgain: () => void;
}

// Generate multiple search query variations for better results
const generateSearchQueries = (car: RealCarData, originalTerms: string[]): string[] => {
  const queries: string[] = [];
  
  // Original AI-suggested terms first
  queries.push(...originalTerms);
  
  // Brand + Model combinations
  queries.push(`${car.brand} ${car.model} miniatura`);
  queries.push(`${car.brand} ${car.model} diecast`);
  queries.push(`${car.brand} ${car.model} hot wheels`);
  queries.push(`${car.brand} ${car.model} escala`);
  
  // Just model (some models are unique enough)
  queries.push(`${car.model} miniatura`);
  queries.push(`${car.model} diecast`);
  
  // Brand only (for broader results)
  queries.push(`${car.brand} miniatura colecionável`);
  queries.push(`${car.brand} diecast hot wheels`);
  
  // Generic with year if available
  if (car.year && !car.year.includes("Anos")) {
    queries.push(`${car.brand} ${car.model} ${car.year} miniatura`);
  }
  
  // Remove duplicates and empty strings
  return [...new Set(queries.filter(q => q.trim()))];
};

interface CollectionMatch {
  found: boolean;
  item?: CollectionItemWithIndex;
}

export const RealCarResults = ({
  car,
  searchTerms,
  confidence,
  capturedImage,
  onScanAgain,
}: RealCarResultsProps) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchStatus, setSearchStatus] = useState<"searching" | "found" | "empty">("searching");
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [allQueries, setAllQueries] = useState<string[]>([]);
  const [triedQueries, setTriedQueries] = useState<string[]>([]);
  const [collectionMatch, setCollectionMatch] = useState<CollectionMatch | null>(null);
  const [checkingCollection, setCheckingCollection] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user has this car in their collection
  useEffect(() => {
    const parseIndexBreakdown = (json: Json | null): PriceIndexBreakdown | null => {
      if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
      return json as unknown as PriceIndexBreakdown;
    };

    const checkCollection = async () => {
      if (!user) {
        setCollectionMatch({ found: false });
        setCheckingCollection(false);
        return;
      }

      try {
        // Search for any collectible matching this real car's brand and model
        const { data, error } = await supabase
          .from("user_collection")
          .select(`
            id,
            image_url,
            item:items!inner(
              real_car_brand,
              real_car_model,
              real_car_year,
              collectible_scale,
              collectible_manufacturer,
              collectible_series,
              collectible_origin,
              collectible_condition,
              collectible_year,
              collectible_notes,
              historical_fact,
              price_index,
              rarity_tier,
              index_breakdown,
              music_suggestion,
              real_car_photos
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        // Find a match by brand and model (case insensitive)
        const match = (data || []).find((c: any) => {
          const brandMatch = c.item.real_car_brand.toLowerCase().includes(car.brand.toLowerCase()) ||
                            car.brand.toLowerCase().includes(c.item.real_car_brand.toLowerCase());
          const modelMatch = c.item.real_car_model.toLowerCase().includes(car.model.toLowerCase()) ||
                            car.model.toLowerCase().includes(c.item.real_car_model.toLowerCase());
          return brandMatch && modelMatch;
        });

        if (match) {
          setCollectionMatch({
            found: true,
            item: {
              id: match.id,
              image_url: match.image_url,
              item: match.item ? {
                real_car_brand: match.item.real_car_brand,
                real_car_model: match.item.real_car_model,
                real_car_year: match.item.real_car_year,
                collectible_scale: match.item.collectible_scale,
                collectible_manufacturer: match.item.collectible_manufacturer,
                collectible_series: match.item.collectible_series,
                collectible_origin: match.item.collectible_origin,
                collectible_condition: match.item.collectible_condition,
                collectible_year: match.item.collectible_year,
                collectible_notes: match.item.collectible_notes,
                historical_fact: match.item.historical_fact,
                price_index: match.item.price_index,
                rarity_tier: match.item.rarity_tier,
                index_breakdown: parseIndexBreakdown(match.item.index_breakdown),
                music_suggestion: match.item.music_suggestion,
                real_car_photos: match.item.real_car_photos as string[] | null
              } : null
            }
          });
        } else {
          setCollectionMatch({ found: false });
        }
      } catch (error) {
        console.error("Error checking collection:", error);
        setCollectionMatch({ found: false });
      } finally {
        setCheckingCollection(false);
      }
    };

    checkCollection();
  }, [user, car]);

  // Generate all possible search queries on mount
  useEffect(() => {
    const queries = generateSearchQueries(car, searchTerms);
    setAllQueries(queries);
    console.log("[RealCarResults] Generated search queries:", queries);
  }, [car, searchTerms]);

  // Fetch listings with progressive search
  useEffect(() => {
    if (allQueries.length === 0) return;

    const fetchListings = async () => {
      setIsLoading(true);
      setSearchStatus("searching");

      // Try each query until we find results
      for (let i = currentQueryIndex; i < allQueries.length; i++) {
        const query = allQueries[i];
        console.log(`[RealCarResults] Trying query ${i + 1}/${allQueries.length}: "${query}"`);
        
        setTriedQueries(prev => [...prev, query]);

        try {
          const result = await fetchExternalListings({ query, limit: 12 });

          if (result.success && result.listings.length > 0) {
            console.log(`[RealCarResults] Found ${result.listings.length} listings with query: "${query}"`);
            setListings(result.listings);
            setSearchStatus("found");
            setCurrentQueryIndex(i);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error(`[RealCarResults] Error with query "${query}":`, error);
        }

        // Only try first 3 queries automatically, then stop
        if (i >= currentQueryIndex + 2) {
          break;
        }
      }

      // No results found
      setListings([]);
      setSearchStatus("empty");
      setIsLoading(false);
    };

    fetchListings();
  }, [allQueries, currentQueryIndex]);

  const handleTryMoreQueries = () => {
    // Move to next batch of queries
    setCurrentQueryIndex(prev => Math.min(prev + 3, allQueries.length - 1));
  };

  const confidenceColors = {
    high: "bg-primary/20 text-primary border-primary/30",
    medium: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    low: "bg-destructive/20 text-destructive border-destructive/30",
  };

  const confidenceLabels = {
    high: "Alta",
    medium: "Média",
    low: "Baixa",
  };

  const handleViewInMarket = () => {
    // Navigate to market with pre-filled search
    const searchQuery = `${car.brand} ${car.model}`;
    navigate(`/mercado?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      {/* Header with captured image background */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={capturedImage}
          alt="Captured car"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        
        {/* Car info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-5 w-5 text-primary" />
            <span className="text-xs text-white/70">{t.scanner.realCarIdentified}</span>
            <Badge 
              variant="outline" 
              className={cn("text-[10px] h-5", confidenceColors[confidence])}
            >
              {confidenceLabels[confidence]}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {car.brand} {car.model}
          </h1>
          <p className="text-sm text-white/70">
            {car.year} {car.variant && `• ${car.variant}`} • {car.bodyStyle} • {car.color}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Collection check banner */}
          {!checkingCollection && collectionMatch && (
            <Card 
              className={cn(
                "border overflow-hidden",
                collectionMatch.found 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-muted bg-muted/30"
              )}
            >
              <CardContent className="p-3">
                {collectionMatch.found && collectionMatch.item ? (
                  <button
                    onClick={() => setShowDetail(true)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary text-sm">
                        {t.scanner.alreadyInCollection}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {collectionMatch.item.item?.collectible_manufacturer || "Hot Wheels"} • {collectionMatch.item.item?.collectible_scale || "1:64"}
                      </p>
                    </div>
                    {collectionMatch.item.image_url && (
                      <img
                        src={collectionMatch.item.image_url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {t.scanner.notInCollection || "Você não tem este carro"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.scanner.findMiniatureBelow || "Encontre uma miniatura abaixo!"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Checking collection state */}
          {checkingCollection && (
            <Card className="border-muted bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {t.scanner.checkingYourCollection || "Verificando sua coleção..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">{t.scanner.foundMiniatures}</h2>
            </div>
            {searchStatus === "found" && listings.length > 0 && (
              <span className="text-xs text-foreground-secondary">
                {listings.length} {t.scanner.foundMiniatures.toLowerCase()}
              </span>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-foreground-secondary">{t.scanner.searchingMiniatures}</p>
                </div>
              </div>
              {/* Skeleton grid */}
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <CardContent className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Listings grid */}
          {!isLoading && searchStatus === "found" && listings.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && searchStatus === "empty" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">{t.scanner.noMiniaturesFound}</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                {t.scanner.trySearchInMarket}
              </p>
              
              {/* Show tried queries */}
              {triedQueries.length > 0 && (
                <div className="w-full max-w-xs mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Buscas tentadas:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {triedQueries.slice(-3).map((q, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-muted/50">
                        {q.slice(0, 25)}{q.length > 25 ? "..." : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Try more queries button */}
              {currentQueryIndex + 3 < allQueries.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTryMoreQueries}
                  className="mb-2"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Tentar outras buscas
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0 bg-card border-t border-border p-4 safe-bottom">
        <div className="flex gap-3">
          <Button
            onClick={handleViewInMarket}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t.scanner.viewInMarket}
          </Button>
          <Button
            variant="outline"
            onClick={onScanAgain}
            className="flex-1 border-border text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t.scanner.scanAnother}
          </Button>
        </div>
      </div>

      {/* Collection item detail */}
      {collectionMatch?.item && (
        <CollectibleDetailCard
          item={collectionMatch.item}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
      )}
    </div>
  );
};
