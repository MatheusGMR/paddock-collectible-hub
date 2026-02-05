import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeaturedCuriosity {
  id: string;
  imageUrl: string;
  carBrand: string;
  carModel: string;
  carYear: string | null;
  historicalFact: string | null;
  priceIndex: number | null;
  rarityTier: string | null;
  scale: string | null;
  manufacturer: string | null;
  owner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export const useFeaturedCuriosity = () => {
  const [curiosity, setCuriosity] = useState<FeaturedCuriosity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRandomCuriosity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query to get collectibles, prioritizing rare items
      // Include all users' collections to ensure content availability
      const { data: collectionItems, error: collectionError } = await supabase
        .from("user_collection")
        .select(`
          id,
          image_url,
          user_id,
          item:items (
            id,
            real_car_brand,
            real_car_model,
            real_car_year,
            historical_fact,
            price_index,
            rarity_tier,
            collectible_scale,
            collectible_manufacturer
          )
        `)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (collectionError) throw collectionError;

      if (!collectionItems || collectionItems.length === 0) {
        setCuriosity(null);
        return;
      }

      // Sort by rarity (prioritize rare items) and pick one randomly from top items
      // Prefer items from other users, but include own items if needed
      const sortedItems = collectionItems
        .filter(item => item.item && item.item.historical_fact) // Only items with curiosities
        .sort((a, b) => {
          // Prioritize other users' items
          const isOwnA = user?.id && a.user_id === user.id ? 0 : 1;
          const isOwnB = user?.id && b.user_id === user.id ? 0 : 1;
          if (isOwnA !== isOwnB) return isOwnB - isOwnA;
          
          // Then by rarity
          const scoreA = a.item?.price_index || 0;
          const scoreB = b.item?.price_index || 0;
          return scoreB - scoreA; // Higher score first
        });

      // If no items with historical facts, fall back to any items
      const itemsToChooseFrom = sortedItems.length > 0 
        ? sortedItems.slice(0, Math.min(10, sortedItems.length)) // Top 10 rarest
        : collectionItems.slice(0, 10);

      if (itemsToChooseFrom.length === 0) {
        setCuriosity(null);
        return;
      }

      // Pick a random item from the top ones
      const randomItem = itemsToChooseFrom[Math.floor(Math.random() * itemsToChooseFrom.length)];

      if (!randomItem.item) {
        setCuriosity(null);
        return;
      }

      // Fetch the owner's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .eq("user_id", randomItem.user_id)
        .single();

      setCuriosity({
        id: randomItem.id,
        imageUrl: randomItem.image_url!,
        carBrand: randomItem.item.real_car_brand,
        carModel: randomItem.item.real_car_model,
        carYear: randomItem.item.real_car_year,
        historicalFact: randomItem.item.historical_fact,
        priceIndex: randomItem.item.price_index,
        rarityTier: randomItem.item.rarity_tier,
        scale: randomItem.item.collectible_scale,
        manufacturer: randomItem.item.collectible_manufacturer,
        owner: {
          id: randomItem.user_id,
          username: profile?.username || "Colecionador",
          avatarUrl: profile?.avatar_url || null,
        },
      });
    } catch (err) {
      console.error("Error fetching featured curiosity:", err);
      setError("Erro ao carregar curiosidade");
      setCuriosity(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refresh = useCallback(() => {
    fetchRandomCuriosity();
  }, [fetchRandomCuriosity]);

  useEffect(() => {
    fetchRandomCuriosity();
  }, [fetchRandomCuriosity]);

  return { curiosity, loading, error, refresh };
};
