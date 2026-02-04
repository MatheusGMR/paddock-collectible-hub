import { useState, useEffect } from "react";
import { Car, ExternalLink, RotateCcw, Loader2, ShoppingCart, Search, RefreshCw, Check, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, Listing } from "@/components/mercado/ListingCard";
import { fetchExternalListings } from "@/lib/api/listings";
import { validateListings } from "@/lib/api/validateListings";
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

// Brand name variations for better search matching
const BRAND_ALIASES: Record<string, string[]> = {
  volkswagen: ["vw", "volkswagen"],
  chevrolet: ["chevy", "chevrolet", "gm"],
  mercedes: ["mercedes", "mercedes-benz", "mb"],
  bmw: ["bmw"],
  porsche: ["porsche"],
  ferrari: ["ferrari"],
  lamborghini: ["lamborghini", "lambo"],
  ford: ["ford"],
  toyota: ["toyota"],
  honda: ["honda"],
  nissan: ["nissan", "datsun"],
  mazda: ["mazda"],
  subaru: ["subaru"],
  mitsubishi: ["mitsubishi"],
  fiat: ["fiat"],
  alfa: ["alfa romeo", "alfa"],
  audi: ["audi"],
  dodge: ["dodge"],
  jeep: ["jeep"],
  land: ["land rover", "range rover"],
  hyundai: ["hyundai"],
  kia: ["kia"],
  renault: ["renault"],
  peugeot: ["peugeot"],
  citroen: ["citroen", "citroën"],
};

// Model name variations (Portuguese/English) - includes Brazilian market models
const MODEL_ALIASES: Record<string, string[]> = {
  // Classic/European
  fusca: ["fusca", "beetle", "bug", "kafer"],
  gol: ["gol", "voyage"],
  uno: ["uno"],
  palio: ["palio"],
  civic: ["civic"],
  corolla: ["corolla"],
  mustang: ["mustang"],
  camaro: ["camaro"],
  challenger: ["challenger"],
  charger: ["charger"],
  supra: ["supra"],
  skyline: ["skyline", "gtr", "gt-r"],
  "911": ["911", "carrera", "turbo"],
  countach: ["countach"],
  testarossa: ["testarossa"],
  f40: ["f40"],
  f50: ["f50"],
  enzo: ["enzo"],
  laferrari: ["laferrari"],
  huracan: ["huracan", "huracán"],
  aventador: ["aventador"],
  gallardo: ["gallardo"],
  murcielago: ["murcielago", "murciélago"],
  // Brazilian market cars - Fiat
  toro: ["toro", "fiat toro"],
  argo: ["argo", "fiat argo"],
  cronos: ["cronos", "fiat cronos"],
  mobi: ["mobi", "fiat mobi"],
  strada: ["strada", "fiat strada"],
  pulse: ["pulse", "fiat pulse"],
  fastback: ["fastback", "fiat fastback"],
  // Brazilian market cars - Chevrolet
  onix: ["onix", "chevrolet onix"],
  tracker: ["tracker", "chevrolet tracker"],
  s10: ["s10", "chevrolet s10"],
  montana: ["montana", "chevrolet montana"],
  spin: ["spin", "chevrolet spin"],
  // Brazilian market cars - Volkswagen
  polo: ["polo", "vw polo"],
  virtus: ["virtus", "vw virtus"],
  nivus: ["nivus", "vw nivus"],
  tcross: ["t-cross", "tcross", "vw t-cross"],
  taos: ["taos", "vw taos"],
  saveiro: ["saveiro", "vw saveiro"],
  amarok: ["amarok", "vw amarok"],
  // Brazilian market cars - Toyota
  hilux: ["hilux", "toyota hilux"],
  sw4: ["sw4", "toyota sw4", "fortuner"],
  yaris: ["yaris", "toyota yaris"],
  // Brazilian market cars - Hyundai/Kia
  hb20: ["hb20", "hyundai hb20"],
  creta: ["creta", "hyundai creta"],
  tucson: ["tucson", "hyundai tucson"],
  sportage: ["sportage", "kia sportage"],
  // Brazilian market cars - Jeep
  compass: ["compass", "jeep compass"],
  renegade: ["renegade", "jeep renegade"],
  commander: ["commander", "jeep commander"],
};

// Generate multiple search query variations for better results
const generateSearchQueries = (car: RealCarData, originalTerms: string[]): string[] => {
  const queries: string[] = [];
  const brandLower = car.brand.toLowerCase();
  const modelLower = car.model.toLowerCase();
  
  // Get brand variations
  const brandVariations = Object.entries(BRAND_ALIASES).find(([key]) => 
    brandLower.includes(key) || key.includes(brandLower)
  )?.[1] || [car.brand];
  
  // Get model variations
  const modelVariations = Object.entries(MODEL_ALIASES).find(([key]) => 
    modelLower.includes(key) || key.includes(modelLower)
  )?.[1] || [car.model];
  
  // PRIORITY 1: Direct product searches (most likely to find actual listings)
  queries.push(`${car.brand} ${car.model} miniatura comprar`);
  queries.push(`${car.brand} ${car.model} diecast comprar`);
  queries.push(`${car.brand} ${car.model} carrinho miniatura`);
  queries.push(`miniatura ${car.brand} ${car.model}`);
  
  // PRIORITY 2: Specific manufacturer searches (Hot Wheels, Majorette, etc.)
  queries.push(`hot wheels ${car.brand} ${car.model}`);
  queries.push(`majorette ${car.brand} ${car.model}`);
  queries.push(`matchbox ${car.brand} ${car.model}`);
  queries.push(`welly ${car.brand} ${car.model}`);
  queries.push(`maisto ${car.brand} ${car.model}`);
  queries.push(`bburago ${car.brand} ${car.model}`);
  
  // PRIORITY 3: Scale-specific searches
  queries.push(`${car.brand} ${car.model} 1:64`);
  queries.push(`${car.brand} ${car.model} escala 1:43`);
  queries.push(`${car.brand} ${car.model} escala 1:24`);
  
  // Original AI-suggested terms
  queries.push(...originalTerms);
  
  // Generate combinations with brand/model variations
  for (const brand of brandVariations.slice(0, 2)) {
    for (const model of modelVariations.slice(0, 2)) {
      queries.push(`${brand} ${model} miniatura`);
      queries.push(`${brand} ${model} diecast`);
    }
  }
  
  // Brazilian market specific searches
  queries.push(`${car.model} miniatura brasil`);
  queries.push(`carrinho ${car.brand} ${car.model}`);
  queries.push(`${car.brand} ${car.model} brinquedo colecionável`);
  
  // Just model (some models are unique enough)
  queries.push(`${car.model} miniatura diecast`);
  queries.push(`${car.model} hot wheels`);
  queries.push(`${car.model} majorette`);
  
  // Brand + collectible terms
  queries.push(`${car.brand} miniatura colecionável`);
  queries.push(`${car.brand} diecast escala`);
  
  // With year if specific (not decade)
  if (car.year && !car.year.includes("Anos") && car.year.length === 4) {
    queries.push(`${car.brand} ${car.model} ${car.year} miniatura`);
  }
  
  // Variant-specific searches
  if (car.variant && car.variant.trim()) {
    queries.push(`${car.brand} ${car.model} ${car.variant} miniatura`);
    queries.push(`${car.model} ${car.variant} diecast`);
  }
  
  // Body style specific for pickups and SUVs (common in Brazil)
  if (car.bodyStyle) {
    const bodyLower = car.bodyStyle.toLowerCase();
    if (bodyLower === "pickup" || bodyLower === "suv") {
      queries.push(`${car.brand} ${bodyLower} miniatura`);
      queries.push(`${car.model} ${bodyLower} diecast`);
    }
  }
  
  // Remove duplicates and empty strings, normalize
  const uniqueQueries = [...new Set(
    queries
      .filter(q => q.trim())
      .map(q => q.toLowerCase().trim())
  )];
  
  // Prioritize queries with both brand and model, then those with "comprar" or "miniatura"
  return uniqueQueries.sort((a, b) => {
    const aHasBrand = a.includes(brandLower);
    const aHasModel = a.includes(modelLower);
    const aHasAction = a.includes("comprar") || a.includes("miniatura");
    const bHasBrand = b.includes(brandLower);
    const bHasModel = b.includes(modelLower);
    const bHasAction = b.includes("comprar") || b.includes("miniatura");
    
    const aScore = (aHasBrand ? 3 : 0) + (aHasModel ? 2 : 0) + (aHasAction ? 1 : 0);
    const bScore = (bHasBrand ? 3 : 0) + (bHasModel ? 2 : 0) + (bHasAction ? 1 : 0);
    
    return bScore - aScore;
  });
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
  const [isValidating, setIsValidating] = useState(false);
  const [searchStatus, setSearchStatus] = useState<"searching" | "validating" | "found" | "empty">("searching");
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0);
  const [allQueries, setAllQueries] = useState<string[]>([]);
  const [validatedCount, setValidatedCount] = useState<number | null>(null);
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

  // Fetch listings with progressive search and AI validation
  useEffect(() => {
    if (allQueries.length === 0) return;

    const fetchAndValidateListings = async () => {
      setIsLoading(true);
      setSearchStatus("searching");
      setValidatedCount(null);

      // Collect results from multiple queries for better coverage
      let allFoundListings: Listing[] = [];
      const maxQueries = Math.min(currentQueryIndex + 5, allQueries.length);

      for (let i = currentQueryIndex; i < maxQueries; i++) {
        const query = allQueries[i];
        console.log(`[RealCarResults] Trying query ${i + 1}/${allQueries.length}: "${query}"`);
        
        setTriedQueries(prev => [...prev, query]);

        try {
          const result = await fetchExternalListings({ query, limit: 15 });

          if (result.success && result.listings.length > 0) {
            console.log(`[RealCarResults] Found ${result.listings.length} listings with query: "${query}"`);
            allFoundListings = [...allFoundListings, ...result.listings];
          }
        } catch (error) {
          console.error(`[RealCarResults] Error with query "${query}":`, error);
        }

        // Stop if we have enough results
        if (allFoundListings.length >= 20) {
          break;
        }
      }

      if (allFoundListings.length === 0) {
        setListings([]);
        setSearchStatus("empty");
        setIsLoading(false);
        return;
      }

      // Remove duplicates by URL
      const uniqueListings = allFoundListings.filter((listing, index, self) =>
        index === self.findIndex(l => l.external_url === listing.external_url)
      );

      console.log(`[RealCarResults] Total unique listings before validation: ${uniqueListings.length}`);

      // Now validate with AI
      setSearchStatus("validating");
      setIsValidating(true);

      try {
        const validated = await validateListings(uniqueListings, {
          brand: car.brand,
          model: car.model,
          year: car.year || undefined,
          variant: car.variant || undefined,
          bodyStyle: car.bodyStyle || undefined
        });

        console.log(`[RealCarResults] Validated listings: ${validated.length}/${uniqueListings.length}`);
        
        setValidatedCount(validated.length);
        setListings(validated.slice(0, 12)); // Limit to 12 for display
        setSearchStatus(validated.length > 0 ? "found" : "empty");
      } catch (error) {
        console.error("[RealCarResults] Validation error:", error);
        // Fallback to unvalidated results
        setListings(uniqueListings.slice(0, 12));
        setSearchStatus("found");
      } finally {
        setIsValidating(false);
        setIsLoading(false);
      }
    };

    fetchAndValidateListings();
  }, [allQueries, currentQueryIndex, car]);

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
              <div className="flex items-center gap-2">
                {validatedCount !== null && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    <Shield className="h-3 w-3 mr-1" />
                    Verificado
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {listings.length} encontrados
                </span>
              </div>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {searchStatus === "validating" 
                      ? "Verificando correspondência com IA..." 
                      : t.scanner.searchingMiniatures}
                  </p>
                  {searchStatus === "validating" && (
                    <p className="text-xs text-muted-foreground/70">
                      Filtrando apenas miniaturas do {car.brand} {car.model}
                    </p>
                  )}
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
