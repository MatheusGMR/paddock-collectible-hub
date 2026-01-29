import { useState, useCallback, useEffect } from "react";
import { MercadoHeader } from "@/components/mercado/MercadoHeader";
import { ListingFeed } from "@/components/mercado/ListingFeed";
import { getMockListings } from "@/data/mockListings";
import { fetchExternalListings, getInternalListings } from "@/lib/api/listings";
import { Listing } from "@/components/mercado/ListingCard";
import { useToast } from "@/hooks/use-toast";

const Mercado = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  const { toast } = useToast();

  // Load listings from Firecrawl API or fallback to mock
  const loadListings = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;

      try {
        if (useRealData) {
          // Fetch from real API
          const [externalResult, internalListings] = await Promise.all([
            fetchExternalListings({
              query: searchQuery || "hot wheels diecast",
              country: selectedCountry || undefined,
              limit: 10,
            }),
            getInternalListings({ limit: 10, offset: 0 }),
          ]);

          // Combine internal (Paddock) and external listings
          const combinedListings: Listing[] = [
            ...internalListings.map((l) => ({
              ...l,
              source: "paddock" as const,
              source_name: "Paddock",
            })),
            ...externalResult.listings,
          ];

          if (externalResult.success && combinedListings.length > 0) {
            if (reset) {
              setListings(combinedListings);
              setPage(2);
            } else {
              setListings((prev) => [...prev, ...combinedListings]);
              setPage((p) => p + 1);
            }
            setHasMore(externalResult.has_more);
            setIsLoading(false);
            return;
          }

          // Show message if Firecrawl returned no results
          if (externalResult.message) {
            toast({
              title: "Busca externa indisponível",
              description: "Exibindo anúncios de demonstração",
            });
          }
        }

        // Fallback to mock data
        await new Promise((resolve) => setTimeout(resolve, 300));
        const result = getMockListings({
          search: searchQuery,
          country: selectedCountry,
          category: selectedCategory,
          page: currentPage,
          limit: 10,
        });

        if (reset) {
          setListings(result.listings);
          setPage(2);
        } else {
          setListings((prev) => [...prev, ...result.listings]);
          setPage((p) => p + 1);
        }
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Error loading listings:", error);
        // Fallback to mock on error
        const result = getMockListings({
          search: searchQuery,
          country: selectedCountry,
          category: selectedCategory,
          page: currentPage,
          limit: 10,
        });
        if (reset) {
          setListings(result.listings);
          setPage(2);
        } else {
          setListings((prev) => [...prev, ...result.listings]);
          setPage((p) => p + 1);
        }
        setHasMore(result.hasMore);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, selectedCountry, selectedCategory, page, useRealData, toast]
  );

  // Initial load
  useEffect(() => {
    loadListings(true);
  }, []);

  // Handle search change with debounce effect
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setPage(1);
      setListings([]);
      setHasMore(true);
      
      // Debounce the search
      const timeoutId = setTimeout(() => {
        loadListings(true);
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [loadListings]
  );

  // Handle country filter change
  const handleCountryChange = useCallback(
    (country: string | null) => {
      setSelectedCountry(country);
      setPage(1);
      setListings([]);
      setHasMore(true);
      setTimeout(() => loadListings(true), 100);
    },
    [loadListings]
  );

  // Handle category filter change
  const handleCategoryChange = useCallback(
    (category: string | null) => {
      setSelectedCategory(category);
      setPage(1);
      setListings([]);
      setHasMore(true);
      
      // For category filter, use mock data as external API doesn't support it
      const result = getMockListings({
        search: searchQuery,
        country: selectedCountry,
        category: category,
        page: 1,
        limit: 10,
      });
      setListings(result.listings);
      setHasMore(result.hasMore);
      setPage(2);
    },
    [searchQuery, selectedCountry]
  );

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadListings(false);
    }
  }, [isLoading, hasMore, loadListings]);

  return (
    <div className="min-h-screen">
      <MercadoHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />
      <ListingFeed
        listings={listings}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
    </div>
  );
};

export default Mercado;
