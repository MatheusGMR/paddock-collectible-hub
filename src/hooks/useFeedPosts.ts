import { useCallback } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedPost {
  id: string;
  user: {
    id?: string;
    username: string;
    avatar: string;
  };
  image: string;
  caption: string | null;
  historicalFact: string | null;
  likes: number;
  comments: number;
  item: {
    brand: string;
    model: string;
    year: string | null;
    scale: string | null;
    manufacturer: string | null;
  } | null;
  createdAt: string;
  topComment: {
    id: string;
    content: string;
    username: string;
    likesCount: number;
  } | null;
  isFromFollowing?: boolean;
  isCuriosity?: boolean;
  originalOwner?: {
    id: string;
    username: string;
  };
}

const PAGE_SIZE = 10;

// 3-day window in milliseconds
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Format relative time
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "agora";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
};

/** Fetch following IDs for the current user */
const fetchFollowingIds = async (userId: string | undefined): Promise<string[]> => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (error) {
    console.error("Error fetching following:", error);
    return [];
  }
  return data?.map(f => f.following_id) || [];
};

/** Fetch a page of posts with all related data */
const fetchPostsPage = async (
  pageParam: number,
  followingIds: string[]
): Promise<{ posts: FeedPost[]; nextPage: number | undefined }> => {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Only fetch posts from the last 3 days for the timeline feel
  const threeDaysAgo = new Date(Date.now() - THREE_DAYS_MS).toISOString();

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(`
      id,
      image_url,
      caption,
      likes_count,
      comments_count,
      created_at,
      user_id,
      collection_item_id
    `)
    .gte("created_at", threeDaysAgo)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (postsError) throw postsError;

  const hasMore = postsData && postsData.length >= PAGE_SIZE;

  if (!postsData || postsData.length === 0) {
    // If no posts in 3-day window on first page, fetch any recent posts
    if (pageParam === 0) {
      const { data: fallbackPosts } = await supabase
        .from("posts")
        .select(`
          id, image_url, caption, likes_count, comments_count,
          created_at, user_id, collection_item_id
        `)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (!fallbackPosts || fallbackPosts.length === 0) {
        return { posts: [], nextPage: undefined };
      }

      const mapped = await mapPostsToFeedPosts(fallbackPosts, followingIds);
      return { posts: mapped, nextPage: undefined };
    }
    return { posts: [], nextPage: undefined };
  }

  // Sort: followed users first, then by date
  const sortedPosts = [...postsData].sort((a, b) => {
    const aFollow = followingIds.includes(a.user_id) ? 1 : 0;
    const bFollow = followingIds.includes(b.user_id) ? 1 : 0;
    if (aFollow !== bFollow) return bFollow - aFollow;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const mapped = await mapPostsToFeedPosts(sortedPosts, followingIds);
  return { posts: mapped, nextPage: hasMore ? pageParam + 1 : undefined };
};

/** Map raw posts data to FeedPost format with profiles, items, and comments */
const mapPostsToFeedPosts = async (
  postsData: any[],
  followingIds: string[]
): Promise<FeedPost[]> => {
  const userIds = [...new Set(postsData.map(p => p.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", userIds);

  const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  // Fetch collection items
  const collectionItemIds = postsData
    .filter(p => p.collection_item_id)
    .map(p => p.collection_item_id!);

  const itemsMap = new Map<string, any>();
  if (collectionItemIds.length > 0) {
    const { data: collectionItems } = await supabase
      .from("user_collection")
      .select(`
        id,
        item:items (
          real_car_brand, real_car_model, real_car_year,
          collectible_scale, collectible_manufacturer, historical_fact
        )
      `)
      .in("id", collectionItemIds);

    collectionItems?.forEach(ci => itemsMap.set(ci.id, ci.item));
  }

  // Fetch top comments
  const postIds = postsData.map(p => p.id);
  const { data: topComments } = await supabase
    .from("post_comments")
    .select("id, post_id, content, user_id, likes_count")
    .in("post_id", postIds)
    .order("likes_count", { ascending: false });

  const commenterIds = [...new Set(topComments?.map(c => c.user_id) || [])];
  let commenterMap = new Map<string, string>();
  if (commenterIds.length > 0) {
    const { data: cp } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", commenterIds);
    cp?.forEach(p => commenterMap.set(p.user_id, p.username));
  }

  const topCommentMap = new Map<string, { id: string; content: string; username: string; likesCount: number }>();
  topComments?.forEach(comment => {
    if (!topCommentMap.has(comment.post_id)) {
      topCommentMap.set(comment.post_id, {
        id: comment.id,
        content: comment.content,
        username: commenterMap.get(comment.user_id) || "Usuário",
        likesCount: comment.likes_count,
      });
    }
  });

  return postsData.map(post => {
    const profile = profilesMap.get(post.user_id);
    const item = post.collection_item_id ? itemsMap.get(post.collection_item_id) : null;
    const topComment = topCommentMap.get(post.id) || null;

    return {
      id: post.id,
      user: {
        id: post.user_id,
        username: profile?.username || "Usuário",
        avatar: profile?.avatar_url || "",
      },
      image: post.image_url,
      caption: post.caption,
      historicalFact: item?.historical_fact || null,
      likes: post.likes_count,
      comments: post.comments_count,
      item: item ? {
        brand: item.real_car_brand,
        model: item.real_car_model,
        year: item.real_car_year,
        scale: item.collectible_scale,
        manufacturer: item.collectible_manufacturer,
      } : null,
      createdAt: formatRelativeTime(post.created_at),
      topComment,
      isFromFollowing: followingIds.includes(post.user_id),
    };
  });
};

export const useFeedPosts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Cache following IDs
  const { data: followingIds = [] } = useQuery({
    queryKey: ["following-ids", user?.id],
    queryFn: () => fetchFollowingIds(user?.id),
    staleTime: 1000 * 60 * 5, // 5 min
    enabled: !!user?.id,
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["feed-posts", user?.id],
    queryFn: ({ pageParam }) => fetchPostsPage(pageParam, followingIds),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 1000 * 60 * 5, // 5 min - keeps data across navigations
    gcTime: 1000 * 60 * 30, // 30 min garbage collection
    enabled: !!user?.id,
  });

  // Flatten all pages into a single posts array
  const posts: FeedPost[] = data?.pages.flatMap(page => page.posts) || [];

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handleRefetch = useCallback(async () => {
    // Invalidate to force fresh data on pull-to-refresh
    await queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["following-ids"] });
  }, [queryClient]);

  return {
    posts,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    error: error ? "Erro ao carregar posts" : null,
    hasMore: !!hasNextPage,
    loadMore,
    refetch: handleRefetch,
  };
};
