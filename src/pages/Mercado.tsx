import { useState, useCallback } from "react";
import { MercadoHeader } from "@/components/mercado/MercadoHeader";
import { ListingFeed } from "@/components/mercado/ListingFeed";
import { getMockListings } from "@/data/mockListings";
import { Listing } from "@/components/mercado/ListingCard";

const Mercado = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load listings (simulating API call)
  const loadListings = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const currentPage = reset ? 1 : page;
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
      setIsLoading(false);
    },
    [searchQuery, selectedCountry, selectedCategory, page]
  );

  // Initial load and filter changes
  useState(() => {
    loadListings(true);
  });

  // Handle search change with debounce effect
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
    setListings([]);
    setHasMore(true);
    // Trigger reload
    setTimeout(() => {
      const result = getMockListings({
        search: query,
        country: selectedCountry,
        category: selectedCategory,
        page: 1,
        limit: 10,
      });
      setListings(result.listings);
      setHasMore(result.hasMore);
      setPage(2);
    }, 300);
  }, [selectedCountry, selectedCategory]);

  // Handle country filter change
  const handleCountryChange = useCallback((country: string | null) => {
    setSelectedCountry(country);
    setPage(1);
    setListings([]);
    setHasMore(true);
    const result = getMockListings({
      search: searchQuery,
      country: country,
      category: selectedCategory,
      page: 1,
      limit: 10,
    });
    setListings(result.listings);
    setHasMore(result.hasMore);
    setPage(2);
  }, [searchQuery, selectedCategory]);

  // Handle category filter change
  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setPage(1);
    setListings([]);
    setHasMore(true);
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
  }, [searchQuery, selectedCountry]);

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
