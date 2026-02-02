import { useState, useEffect } from "react";
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
}

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
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch posts with user profiles and collection items
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
        .limit(20);

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
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

      // Map posts to FeedPost format
      const mappedPosts: FeedPost[] = postsData.map(post => {
        const profile = profilesMap.get(post.user_id);
        const item = post.collection_item_id ? itemsMap.get(post.collection_item_id) : null;

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
        };
      });

      setPosts(mappedPosts);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Erro ao carregar posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return { posts, loading, error, refetch: fetchPosts };
};
