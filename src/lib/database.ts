import { supabase } from "@/integrations/supabase/client";
import { PriceIndexBreakdown } from "./priceIndex";
import { Json } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  real_car_brand: string;
  real_car_model: string;
  real_car_year: string | null;
  historical_fact: string | null;
  collectible_manufacturer: string | null;
  collectible_scale: string | null;
  collectible_year: string | null;
  collectible_origin: string | null;
  collectible_series: string | null;
  collectible_condition: string | null;
  collectible_notes: string | null;
  collectible_color: string | null;
  price_index: number | null;
  rarity_tier: string | null;
  index_breakdown: PriceIndexBreakdown | null;
  music_suggestion: string | null;
  music_selection_reason: string | null;
  real_car_photos: string[] | null;
  created_at: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingItemId?: string;
  existingItemImage?: string;
}

export interface CollectionItem {
  id: string;
  user_id: string;
  item_id: string;
  image_url: string | null;
  notes: string | null;
  acquired_at: string | null;
  created_at: string;
  item?: Item;
}

export interface CollectionItemWithIndex {
  id: string;
  image_url: string | null;
  item: {
    real_car_brand: string;
    real_car_model: string;
    real_car_year?: string | null;
    collectible_scale?: string | null;
    collectible_manufacturer: string | null;
    collectible_series: string | null;
    collectible_origin?: string | null;
    collectible_condition?: string | null;
    collectible_year?: string | null;
    collectible_notes?: string | null;
    historical_fact?: string | null;
    price_index: number | null;
    rarity_tier: string | null;
    index_breakdown: PriceIndexBreakdown | null;
    music_suggestion?: string | null;
    music_selection_reason?: string | null;
    real_car_photos?: string[] | null;
  } | null;
}

const parseIndexBreakdown = (json: Json | null): PriceIndexBreakdown | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as PriceIndexBreakdown;
};

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const getProfileByUsername = async (username: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", username)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

export const searchProfiles = async (query: string, limit: number = 20): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,city.ilike.%${query}%`)
    .limit(limit);
  
  if (error) throw error;
  return data || [];
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getUserCollection = async (userId: string): Promise<CollectionItem[]> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      *,
      item:items(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    ...item,
    item: item.item ? {
      ...item.item,
      index_breakdown: parseIndexBreakdown(item.item.index_breakdown),
      real_car_photos: item.item.real_car_photos as string[] | null
    } : undefined
  }));
};

export const getCollectionWithIndex = async (userId: string): Promise<CollectionItemWithIndex[]> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items(
        real_car_brand,
        real_car_model,
        real_car_year,
        collectible_scale,
        collectible_manufacturer,
        collectible_series,
        collectible_origin,
        collectible_condition,
        collectible_year,
        collectible_notes,
        historical_fact,
        price_index,
        rarity_tier,
        index_breakdown,
        music_suggestion,
        music_selection_reason,
        real_car_photos
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    image_url: item.image_url,
    item: item.item ? {
      real_car_brand: item.item.real_car_brand,
      real_car_model: item.item.real_car_model,
      real_car_year: item.item.real_car_year,
      collectible_scale: item.item.collectible_scale,
      collectible_manufacturer: item.item.collectible_manufacturer,
      collectible_series: item.item.collectible_series,
      collectible_origin: item.item.collectible_origin,
      collectible_condition: item.item.collectible_condition,
      collectible_year: item.item.collectible_year,
      collectible_notes: item.item.collectible_notes,
      historical_fact: item.item.historical_fact,
      price_index: item.item.price_index,
      rarity_tier: item.item.rarity_tier,
      index_breakdown: parseIndexBreakdown(item.item.index_breakdown),
      music_suggestion: item.item.music_suggestion,
      music_selection_reason: item.item.music_selection_reason,
      real_car_photos: item.item.real_car_photos as string[] | null
    } : null
  }));
};

// Get public collection (for viewing other users' collections)
export const getPublicCollection = async (userId: string): Promise<CollectionItemWithIndex[]> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items(
        real_car_brand,
        real_car_model,
        real_car_year,
        collectible_scale,
        collectible_manufacturer,
        collectible_series,
        collectible_origin,
        collectible_condition,
        collectible_year,
        collectible_notes,
        historical_fact,
        price_index,
        rarity_tier,
        index_breakdown,
        music_suggestion,
        music_selection_reason,
        real_car_photos
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    image_url: item.image_url,
    item: item.item ? {
      real_car_brand: item.item.real_car_brand,
      real_car_model: item.item.real_car_model,
      real_car_year: item.item.real_car_year,
      collectible_scale: item.item.collectible_scale,
      collectible_manufacturer: item.item.collectible_manufacturer,
      collectible_series: item.item.collectible_series,
      collectible_origin: item.item.collectible_origin,
      collectible_condition: item.item.collectible_condition,
      collectible_year: item.item.collectible_year,
      collectible_notes: item.item.collectible_notes,
      historical_fact: item.item.historical_fact,
      price_index: item.item.price_index,
      rarity_tier: item.item.rarity_tier,
      index_breakdown: parseIndexBreakdown(item.item.index_breakdown),
      music_suggestion: item.item.music_suggestion,
      music_selection_reason: item.item.music_selection_reason,
      real_car_photos: item.item.real_car_photos as string[] | null
    } : null
  }));
};

export const getTopIndexItems = async (userId: string, limit: number = 10): Promise<CollectionItemWithIndex[]> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items!inner(
        real_car_brand,
        real_car_model,
        collectible_manufacturer,
        collectible_series,
        price_index,
        rarity_tier,
        index_breakdown
      )
    `)
    .eq("user_id", userId)
    .not("items.price_index", "is", null)
    .order("items(price_index)", { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    id: item.id,
    image_url: item.image_url,
    item: item.item ? {
      real_car_brand: item.item.real_car_brand,
      real_car_model: item.item.real_car_model,
      collectible_manufacturer: item.item.collectible_manufacturer,
      collectible_series: item.item.collectible_series,
      price_index: item.item.price_index,
      rarity_tier: item.item.rarity_tier,
      index_breakdown: parseIndexBreakdown(item.item.index_breakdown)
    } : null
  }));
};

export const addToCollection = async (
  userId: string,
  itemData: Omit<Item, "id" | "created_at">,
  imageUrl?: string
): Promise<CollectionItem> => {
  // First create the item
  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      real_car_brand: itemData.real_car_brand,
      real_car_model: itemData.real_car_model,
      real_car_year: itemData.real_car_year,
      historical_fact: itemData.historical_fact,
      collectible_manufacturer: itemData.collectible_manufacturer,
      collectible_scale: itemData.collectible_scale,
      collectible_year: itemData.collectible_year,
      collectible_origin: itemData.collectible_origin,
      collectible_series: itemData.collectible_series,
      collectible_condition: itemData.collectible_condition,
      collectible_notes: itemData.collectible_notes,
      price_index: itemData.price_index,
      rarity_tier: itemData.rarity_tier,
      index_breakdown: itemData.index_breakdown as unknown as Json,
      music_suggestion: itemData.music_suggestion,
      music_selection_reason: itemData.music_selection_reason,
      real_car_photos: itemData.real_car_photos as unknown as Json,
    })
    .select()
    .single();

  if (itemError) throw itemError;

  // Then add to user's collection
  const { data: collectionItem, error: collectionError } = await supabase
    .from("user_collection")
    .insert({
      user_id: userId,
      item_id: item.id,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (collectionError) throw collectionError;

  return { 
    ...collectionItem, 
    item: {
      ...item,
      index_breakdown: parseIndexBreakdown(item.index_breakdown),
      real_car_photos: item.real_car_photos as string[] | null
    }
  };
};

export const checkItemInCollection = async (
  userId: string,
  brand: string,
  model: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      item:items!inner(real_car_brand, real_car_model)
    `)
    .eq("user_id", userId);

  if (error) throw error;
  
  return (data || []).some(
    (c: any) => 
      c.item.real_car_brand.toLowerCase() === brand.toLowerCase() &&
      c.item.real_car_model.toLowerCase() === model.toLowerCase()
  );
};

export const checkDuplicateInCollection = async (
  userId: string,
  brand: string,
  model: string,
  color?: string | null
): Promise<DuplicateCheckResult> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items!inner(
        real_car_brand,
        real_car_model,
        collectible_color
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  
  const match = (data || []).find((c: any) => {
    const brandMatch = c.item.real_car_brand.toLowerCase() === brand.toLowerCase();
    const modelMatch = c.item.real_car_model.toLowerCase() === model.toLowerCase();
    
    // If color was provided, also check color match
    let colorMatch = true;
    if (color && c.item.collectible_color) {
      colorMatch = c.item.collectible_color.toLowerCase() === color.toLowerCase();
    }
    
    return brandMatch && modelMatch && colorMatch;
  });
  
  return {
    isDuplicate: !!match,
    existingItemId: match?.id,
    existingItemImage: match?.image_url
  };
};

// Check if item exists in a specific user's collection
export const checkItemInUserCollection = async (
  userId: string,
  brand: string,
  model: string,
  color?: string | null
): Promise<{ found: boolean; item?: CollectionItemWithIndex }> => {
  const { data, error } = await supabase
    .from("user_collection")
    .select(`
      id,
      image_url,
      item:items!inner(
        real_car_brand,
        real_car_model,
        real_car_year,
        collectible_scale,
        collectible_manufacturer,
        collectible_series,
        collectible_origin,
        collectible_condition,
        collectible_year,
        collectible_notes,
        historical_fact,
        collectible_color,
        price_index,
        rarity_tier,
        index_breakdown,
        music_suggestion,
        music_selection_reason,
        real_car_photos
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  
  const match = (data || []).find((c: any) => {
    const brandMatch = c.item.real_car_brand.toLowerCase() === brand.toLowerCase();
    const modelMatch = c.item.real_car_model.toLowerCase() === model.toLowerCase();
    
    // If color was provided, also check color match
    let colorMatch = true;
    if (color && c.item.collectible_color) {
      colorMatch = c.item.collectible_color.toLowerCase() === color.toLowerCase();
    }
    
    return brandMatch && modelMatch && colorMatch;
  });
  
  if (!match) {
    return { found: false };
  }
  
  return {
    found: true,
    item: {
      id: match.id,
      image_url: match.image_url,
      item: match.item ? {
        real_car_brand: match.item.real_car_brand,
        real_car_model: match.item.real_car_model,
        real_car_year: match.item.real_car_year,
        collectible_scale: match.item.collectible_scale,
        collectible_manufacturer: match.item.collectible_manufacturer,
        collectible_series: match.item.collectible_series,
        collectible_origin: match.item.collectible_origin,
        collectible_condition: match.item.collectible_condition,
        collectible_year: match.item.collectible_year,
        collectible_notes: match.item.collectible_notes,
        historical_fact: match.item.historical_fact,
        price_index: match.item.price_index,
        rarity_tier: match.item.rarity_tier,
        index_breakdown: parseIndexBreakdown(match.item.index_breakdown),
        music_suggestion: match.item.music_suggestion,
        music_selection_reason: match.item.music_selection_reason,
        real_car_photos: match.item.real_car_photos as string[] | null
      } : null
    }
  };
};

export const getFollowCounts = async (userId: string) => {
  const [followersResult, followingResult] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact" }).eq("following_id", userId),
    supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", userId),
  ]);

  return {
    followers: followersResult.count || 0,
    following: followingResult.count || 0,
  };
};

export const getCollectionCount = async (userId: string) => {
  const { count, error } = await supabase
    .from("user_collection")
    .select("id", { count: "exact" })
    .eq("user_id", userId);

  if (error) throw error;
  return count || 0;
};

// Follow/Unfollow functions
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

export const followUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase
    .from("follows")
    .insert({
      follower_id: followerId,
      following_id: followingId,
    });

  if (error) throw error;
};

export const unfollowUser = async (followerId: string, followingId: string): Promise<void> => {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;
};
