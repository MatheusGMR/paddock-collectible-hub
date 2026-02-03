import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeedPost {
  id: string;
  user: {
    id: string;
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
}

const PAGE_SIZE = 10;

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

export const useFeedPosts = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchPosts = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch posts with pagination
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
        .order("created_at", { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;

      // Check if there's more data
      if (!postsData || postsData.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (!postsData || postsData.length === 0) {
        if (!append) setPosts([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        profiles?.map(p => [p.user_id, p]) || []
      );

      // Get collection item IDs that are not null
      const collectionItemIds = postsData
        .filter(p => p.collection_item_id)
        .map(p => p.collection_item_id!);

      // Fetch collection items with their item details
      let itemsMap = new Map<string, any>();
      
      if (collectionItemIds.length > 0) {
        const { data: collectionItems } = await supabase
          .from("user_collection")
          .select(`
            id,
            item:items (
              real_car_brand,
              real_car_model,
              real_car_year,
              collectible_scale,
              collectible_manufacturer,
              historical_fact
            )
          `)
          .in("id", collectionItemIds);

        if (collectionItems) {
          collectionItems.forEach(ci => {
            itemsMap.set(ci.id, ci.item);
          });
        }
      }

      // Fetch top comment for each post (most liked)
      const postIds = postsData.map(p => p.id);
      const { data: topComments } = await supabase
        .from("post_comments")
        .select("id, post_id, content, user_id, likes_count")
        .in("post_id", postIds)
        .order("likes_count", { ascending: false });

      // Get unique commenter user IDs
      const commenterIds = [...new Set(topComments?.map(c => c.user_id) || [])];
      let commenterProfilesMap = new Map<string, { username: string }>();
      
      if (commenterIds.length > 0) {
        const { data: commenterProfiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", commenterIds);
        
        commenterProfilesMap = new Map(
          commenterProfiles?.map(p => [p.user_id, { username: p.username }]) || []
        );
      }

      // Build top comment map (only first/top comment per post)
      const topCommentMap = new Map<string, { id: string; content: string; username: string; likesCount: number }>();
      topComments?.forEach(comment => {
        if (!topCommentMap.has(comment.post_id)) {
          const commenter = commenterProfilesMap.get(comment.user_id);
          topCommentMap.set(comment.post_id, {
            id: comment.id,
            content: comment.content,
            username: commenter?.username || "Usuário",
            likesCount: comment.likes_count,
          });
        }
      });

      // Map posts to FeedPost format
      const mappedPosts: FeedPost[] = postsData.map(post => {
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
        };
      });

      if (append) {
        setPosts(prev => [...prev, ...mappedPosts]);
      } else {
        setPosts(mappedPosts);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Erro ao carregar posts");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  }, [loadingMore, hasMore, page, fetchPosts]);

  const refetch = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchPosts(0, false);
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts(0, false);
  }, [fetchPosts]);

  return { 
    posts, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    loadMore,
    refetch 
  };
};
