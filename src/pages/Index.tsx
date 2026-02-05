import { useEffect, useRef, useCallback, useMemo } from "react";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { PullToRefreshIndicator } from "@/components/feed/PullToRefreshIndicator";
import { ChallengeProgressBar } from "@/components/challenge/ChallengeProgressBar";
import { useFeedPosts, FeedPost } from "@/hooks/useFeedPosts";
import { useFeaturedCuriosity } from "@/hooks/useFeaturedCuriosity";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScreenTips } from "@/hooks/useScreenTips";
import { Loader2, Inbox } from "lucide-react";

const Index = () => {
  const { posts, loading, loadingMore, error, hasMore, loadMore, refetch } = useFeedPosts();
  const { curiosity, loading: curiosityLoading, refresh: refreshCuriosity } = useFeaturedCuriosity();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  
  // Pull to refresh
  const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      refetch();
      refreshCuriosity();
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

  // Transform curiosity into a post format (read-only, no interactions)
  const curiosityAsPost: FeedPost | null = useMemo(() => {
    if (!curiosity) return null;
    
    return {
      id: `curiosity-${curiosity.id}`,
      user: {
        id: undefined, // No direct profile link for "Coleções de Destaque"
        username: "Coleções de Destaque",
        avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=destaque&backgroundColor=f59e0b",
      },
      image: curiosity.imageUrl,
      caption: `Da coleção de @${curiosity.owner.username}`,
      historicalFact: curiosity.historicalFact,
      likes: 0,
      comments: 0,
      item: {
        brand: curiosity.carBrand,
        model: curiosity.carModel,
        year: curiosity.carYear,
        scale: curiosity.scale,
        manufacturer: curiosity.manufacturer,
      },
      createdAt: "Destaque",
      topComment: null,
      isFromFollowing: false,
      isCuriosity: true,
      originalOwner: {
        id: curiosity.owner.id,
        username: curiosity.owner.username,
      },
    };
  }, [curiosity]);

  // Calculate position for curiosity (between 1 and min(5, posts.length))
  const curiosityPosition = useMemo(() => {
    if (!curiosityAsPost || posts.length === 0) return -1;
    const maxPosition = Math.min(5, posts.length);
    const hash = curiosity?.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return (hash % maxPosition) + 1;
  }, [curiosityAsPost, posts.length, curiosity?.id]);

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
      ) : posts.length === 0 && !curiosityAsPost ? (
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
          {/* If no posts but has curiosity, show curiosity as first post */}
          {posts.length === 0 && curiosityAsPost && (
            <PostCard post={curiosityAsPost} />
          )}
          
          {posts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} />
              {/* Insert curiosity as post at calculated position */}
              {index + 1 === curiosityPosition && curiosityAsPost && (
                <PostCard post={curiosityAsPost} />
              )}
            </div>
          ))}
          
          {/* Infinite scroll trigger */}
          <div ref={loadMoreTriggerRef} className="py-8 flex justify-center">
            {loadingMore ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : hasMore ? (
              <div className="h-1" /> 
            ) : posts.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Você viu tudo por agora ✨
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
