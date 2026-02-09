import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CURIOSITY_STORAGE_KEY = "paddock_curiosity_of_day";

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

interface StoredCuriosity {
  date: string; // YYYY-MM-DD
  data: FeaturedCuriosity;
}

/** Get today's date string in YYYY-MM-DD format */
const getTodayKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** Try to load today's cached curiosity from localStorage */
const loadCachedCuriosity = (): FeaturedCuriosity | null => {
  try {
    const stored = localStorage.getItem(CURIOSITY_STORAGE_KEY);
    if (!stored) return null;
    const parsed: StoredCuriosity = JSON.parse(stored);
    if (parsed.date === getTodayKey() && parsed.data) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
};

/** Save curiosity to localStorage with today's date */
const saveCuriosity = (data: FeaturedCuriosity) => {
  try {
    const stored: StoredCuriosity = { date: getTodayKey(), data };
    localStorage.setItem(CURIOSITY_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
};

export const useFeaturedCuriosity = () => {
  const cached = loadCachedCuriosity();
  const [curiosity, setCuriosity] = useState<FeaturedCuriosity | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRandomCuriosity = useCallback(async (forceRefresh = false) => {
    // If we already have today's cached curiosity and not forcing, skip fetch
    if (!forceRefresh && curiosity) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: collectionItems, error: collectionError } = await supabase
        .from("user_collection")
        .select(`
          id,
          image_url,
          user_id,
          item:items!inner (
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
        .not("items.historical_fact", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);

      if (collectionError) throw collectionError;

      if (!collectionItems || collectionItems.length === 0) {
        setCuriosity(null);
        return;
      }

      // Sort: prefer other users' items, then by rarity
      const sortedItems = [...collectionItems].sort((a, b) => {
        const isOwnA = user?.id && a.user_id === user.id ? 0 : 1;
        const isOwnB = user?.id && b.user_id === user.id ? 0 : 1;
        if (isOwnA !== isOwnB) return isOwnB - isOwnA;
        const scoreA = a.item?.price_index || 0;
        const scoreB = b.item?.price_index || 0;
        return scoreB - scoreA;
      });

      const itemsToChooseFrom = sortedItems.slice(0, Math.min(10, sortedItems.length));
      if (itemsToChooseFrom.length === 0) {
        setCuriosity(null);
        return;
      }

      // Use today's date as seed for deterministic daily selection
      const todayHash = getTodayKey().split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const randomItem = itemsToChooseFrom[todayHash % itemsToChooseFrom.length];

      if (!randomItem.item) {
        setCuriosity(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .eq("user_id", randomItem.user_id)
        .single();

      const result: FeaturedCuriosity = {
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
      };

      setCuriosity(result);
      saveCuriosity(result);
    } catch (err) {
      console.error("Error fetching featured curiosity:", err);
      setError("Erro ao carregar curiosidade");
      setCuriosity(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id, curiosity]);

  const refresh = useCallback(() => {
    fetchRandomCuriosity(true);
  }, [fetchRandomCuriosity]);

  useEffect(() => {
    fetchRandomCuriosity();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { curiosity, loading, error, refresh };
};
