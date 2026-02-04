import { useEffect, useRef, useCallback, useMemo } from "react";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { FeaturedCuriosityCard } from "@/components/feed/FeaturedCuriosityCard";
import { PullToRefreshIndicator } from "@/components/feed/PullToRefreshIndicator";
import { ChallengeProgressBar } from "@/components/challenge/ChallengeProgressBar";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { useFeaturedCuriosity } from "@/hooks/useFeaturedCuriosity";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScreenTips } from "@/hooks/useScreenTips";
import { Loader2, Inbox } from "lucide-react";
import { mockPosts } from "@/data/mockData";

const Index = () => {
  const { posts, loading, loadingMore, error, hasMore, loadMore, refetch } = useFeedPosts();
  const { curiosity, loading: curiosityLoading, refresh: refreshCuriosity } = useFeaturedCuriosity();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  
  // Pull to refresh
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for visual feedback
      refetch();
      refreshCuriosity(); // Also refresh the curiosity card
    },
    threshold: 80,
  });
  
  // Trigger guided tips for feed screen
  useScreenTips("feed", 800);

  // Setup infinite scroll observer
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }
  }, [hasMore, loadingMore, loadMore]);

  useEffect(() => {
    setupObserver();
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [setupObserver]);

  // Use real posts if available, otherwise show mock data
  const displayPosts = posts.length > 0 ? posts : mockPosts.map(p => ({
    ...p,
    caption: p.caption,
    historicalFact: null,
    user: { ...p.user, id: undefined },
    item: p.item ? { ...p.item, manufacturer: null } : null,
  }));

  // Calculate random position for curiosity card (between 1 and min(5, posts.length))
  // Use curiosity id as seed to keep position stable during session
  const curiosityPosition = useMemo(() => {
    if (!curiosity || displayPosts.length === 0) return -1;
    const maxPosition = Math.min(5, displayPosts.length);
    // Use a simple hash of curiosity id for consistent positioning during session
    const hash = curiosity.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % maxPosition) + 1; // Position 1 to maxPosition (after 1st to maxPosition-th post)
  }, [curiosity, displayPosts.length]);

  // Always show mock data as fallback content when real posts run out
  const showMockFallback = posts.length > 0 && !hasMore && posts.length < 5;

  return (
    <div ref={containerRef} className="min-h-screen">
      <FeedHeader />
      
      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
      />
      
      {/* Challenge progress bar */}
      <ChallengeProgressBar />
      
      {loading && !isRefreshing ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            Nenhum post ainda
          </p>
          <p className="text-sm text-muted-foreground">
            Escaneie um carrinho e compartilhe na rede!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {displayPosts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} />
              {/* Insert curiosity card at random position */}
              {index + 1 === curiosityPosition && (
                <FeaturedCuriosityCard 
                  curiosity={curiosity} 
                  loading={curiosityLoading} 
                  onRefresh={refreshCuriosity}
                />
              )}
            </div>
          ))}
          
          {/* Fallback: Show curiosity at end if position wasn't hit (e.g., not enough posts) */}
          {curiosityPosition === -1 && curiosity && (
            <FeaturedCuriosityCard 
              curiosity={curiosity} 
              loading={curiosityLoading} 
              onRefresh={refreshCuriosity}
            />
          )}
          
          {/* Show mock posts as "Destaques da comunidade" when real posts run out */}
          {showMockFallback && (
            <>
              <div className="py-4 px-4 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Destaques da comunidade
                </p>
              </div>
              {mockPosts.slice(0, 3).map((p) => (
                <PostCard 
                  key={`mock-${p.id}`} 
                  post={{
                    ...p,
                    caption: p.caption,
                    historicalFact: null,
                    user: { ...p.user, id: undefined },
                    item: p.item ? { ...p.item, manufacturer: null } : null,
                  }} 
                />
              ))}
            </>
          )}
          
          {/* Infinite scroll trigger */}
          <div ref={loadMoreTriggerRef} className="py-8 flex justify-center">
            {loadingMore ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : hasMore ? (
              <div className="h-1" /> 
            ) : (
              <p className="text-xs text-muted-foreground">
                Você viu tudo por agora ✨
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
