import { useEffect, useRef, useCallback, useMemo } from "react";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { FeedNewsCard } from "@/components/feed/FeedNewsCard";
import { PullToRefreshIndicator } from "@/components/feed/PullToRefreshIndicator";
import { ChallengeProgressBar } from "@/components/challenge/ChallengeProgressBar";
import { useFeedPosts, FeedPost } from "@/hooks/useFeedPosts";
import { useFeaturedCuriosity } from "@/hooks/useFeaturedCuriosity";
import { useNewsFeed } from "@/hooks/useNewsFeed";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useScreenTips } from "@/hooks/useScreenTips";
import { Loader2, Inbox } from "lucide-react";
import { NewsArticle } from "@/lib/api/news";

type FeedItem =
  | { type: "post"; data: FeedPost }
  | { type: "news"; data: NewsArticle };

const Index = () => {
  const { posts, loading, loadingMore, error, hasMore, loadMore, refetch } = useFeedPosts();
  const { curiosity, loading: curiosityLoading, refresh: refreshCuriosity } = useFeaturedCuriosity();
  const { articles: newsArticles, loading: newsLoading } = useNewsFeed();
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
  
  useScreenTips("feed", 800);

  // Stable refs for observer
  const hasMoreRef = useRef(hasMore);
  const loadingMoreRef = useRef(loadingMore);
  const loadMoreRef = useRef(loadMore);
  
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
  useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          loadMoreRef.current();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = observerRef.current;
    const trigger = loadMoreTriggerRef.current;
    if (observer && trigger) {
      observer.observe(trigger);
      return () => observer.unobserve(trigger);
    }
  }, [posts.length]);

  // Transform curiosity into a post format
  const curiosityAsPost: FeedPost | null = useMemo(() => {
    if (!curiosity) return null;
    return {
      id: `curiosity-${curiosity.id}`,
      user: {
        id: undefined,
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

  // Build unified feed: interleave 1 news every 3 posts
  const unifiedFeed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    let newsIndex = 0;
    const curiosityPosition = curiosityAsPost && posts.length > 0
      ? Math.min(5, posts.length)
      : -1;
    const hash = curiosity?.id?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    const actualCuriosityPos = curiosityPosition > 0 ? (hash % curiosityPosition) + 1 : -1;

    // If no posts but has curiosity
    if (posts.length === 0 && curiosityAsPost) {
      items.push({ type: "post", data: curiosityAsPost });
    }

    for (let i = 0; i < posts.length; i++) {
      items.push({ type: "post", data: posts[i] });

      // Insert curiosity at calculated position
      if (i + 1 === actualCuriosityPos && curiosityAsPost) {
        items.push({ type: "post", data: curiosityAsPost });
      }

      // Insert news every 3 posts
      if ((i + 1) % 3 === 0 && newsIndex < newsArticles.length) {
        items.push({ type: "news", data: newsArticles[newsIndex] });
        newsIndex++;
      }
    }

    return items;
  }, [posts, newsArticles, curiosityAsPost, curiosity?.id]);

  return (
    <div ref={containerRef} className="min-h-screen">
      <FeedHeader />
      
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
      />
      
      <ChallengeProgressBar />
      
      {loading && !isRefreshing ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : posts.length === 0 && !curiosityAsPost && newsArticles.length === 0 ? (
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
          {unifiedFeed.map((item, index) => (
            <div key={item.type === "post" ? item.data.id : `news-${(item.data as NewsArticle).id}-${index}`}>
              {item.type === "post" ? (
                <PostCard post={item.data as FeedPost} />
              ) : (
                <FeedNewsCard article={item.data as NewsArticle} />
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
