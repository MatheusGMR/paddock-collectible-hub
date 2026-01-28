import { useEffect, useRef } from "react";
import { ListingCard, Listing } from "./ListingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingFeedProps {
  listings: Listing[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const ListingFeed = ({ 
  listings, 
  isLoading, 
  hasMore, 
  onLoadMore 
}: ListingFeedProps) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  if (isLoading && listings.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-lg font-medium text-foreground">Nenhum anúncio encontrado</p>
        <p className="text-sm text-foreground-secondary mt-1">
          Tente ajustar os filtros ou buscar por outro termo
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="grid grid-cols-2 gap-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10" />

      {/* Loading more indicator */}
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
    </div>
  );
};
