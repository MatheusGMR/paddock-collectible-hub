import { useEffect, useRef } from "react";
import { NewsCard } from "./NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { NewsArticle } from "@/lib/api/news";

interface NewsFeedProps {
  articles: NewsArticle[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const NewsFeed = ({
  articles,
  isLoading,
  hasMore,
  onLoadMore,
}: NewsFeedProps) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

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

  // Loading skeleton
  if (isLoading && articles.length === 0) {
    return (
      <div className="p-4 space-y-4">
        {/* Featured skeleton */}
        <div className="space-y-2">
          <Skeleton className="aspect-[2/1] rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[16/10] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <span className="text-5xl mb-4">📰</span>
        <p className="text-lg font-medium text-foreground">
          {t.news?.noNewsFound || "Nenhuma notícia encontrada"}
        </p>
        <p className="text-sm text-foreground-secondary mt-1">
          {t.news?.noNewsFoundDesc || "Tente ajustar os filtros ou buscar por outro termo"}
        </p>
      </div>
    );
  }

  // Separate featured article (first one if available)
  const [featured, ...rest] = articles;

  return (
    <div className="p-4 pb-20">
      {/* Featured article */}
      {featured && (
        <div className="mb-4">
          <NewsCard article={featured} variant="featured" />
        </div>
      )}

      {/* Latest news label */}
      {rest.length > 0 && (
        <h2 className="text-sm font-semibold text-foreground-secondary mb-3">
          {t.news?.latestNews || "Últimas Notícias"}
        </h2>
      )}

      {/* News grid */}
      <div className="grid grid-cols-2 gap-3">
        {rest.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10" />

      {/* Loading more indicator */}
      {isLoading && articles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[16/10] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
