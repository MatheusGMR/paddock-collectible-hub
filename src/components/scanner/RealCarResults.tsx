import { useState, useEffect } from "react";
import { Car, ExternalLink, RotateCcw, Loader2, ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, Listing } from "@/components/mercado/ListingCard";
import { fetchExternalListings } from "@/lib/api/listings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Fetch listings when component mounts
  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);
      setSearchStatus("searching");

      try {
        // Use the first search term for the query
        const query = searchTerms[0] || `${car.brand} ${car.model} diecast`;
        console.log("[RealCarResults] Searching for:", query);

        const result = await fetchExternalListings({ query, limit: 12 });

        if (result.success && result.listings.length > 0) {
          setListings(result.listings);
          setSearchStatus("found");
        } else {
          setListings([]);
          setSearchStatus("empty");
        }
      } catch (error) {
        console.error("[RealCarResults] Error fetching listings:", error);
        setListings([]);
        setSearchStatus("empty");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [car.brand, car.model, searchTerms]);

  const confidenceColors = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-red-500/20 text-red-400 border-red-500/30",
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-foreground-secondary/50 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">{t.scanner.noMiniaturesFound}</h3>
              <p className="text-sm text-foreground-secondary max-w-xs">
                {t.scanner.trySearchInMarket}
              </p>
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
    </div>
  );
};
