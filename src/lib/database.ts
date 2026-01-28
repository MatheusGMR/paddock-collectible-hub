import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
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
  created_at: string;
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

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
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
  return data || [];
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

  return { ...collectionItem, item };
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
