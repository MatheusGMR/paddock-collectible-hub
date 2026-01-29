import { supabase } from "@/integrations/supabase/client";

export interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string;
  source: string;
  source_name: string;
  source_country: string;
  external_url: string;
}

export interface FetchListingsResponse {
  success: boolean;
  listings: Listing[];
  total: number;
  has_more: boolean;
  sources_status: Record<string, "success" | "error" | "skipped">;
  error?: string;
  message?: string;
}

export interface FetchListingsOptions {
  query?: string;
  sources?: string[];
  country?: string;
  limit?: number;
}

export const fetchExternalListings = async (
  options: FetchListingsOptions = {}
): Promise<FetchListingsResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke<FetchListingsResponse>(
      "fetch-listings",
      { body: options }
    );

    if (error) {
      console.error("Error fetching listings:", error);
      return {
        success: false,
        listings: [],
        total: 0,
        has_more: false,
        sources_status: {},
        error: error.message,
      };
    }

    return data || {
      success: false,
      listings: [],
      total: 0,
      has_more: false,
      sources_status: {},
      error: "No data returned",
    };
  } catch (error) {
    console.error("Error calling fetch-listings:", error);
    return {
      success: false,
      listings: [],
      total: 0,
      has_more: false,
      sources_status: {},
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getInternalListings = async (
  options: { limit?: number; offset?: number } = {}
): Promise<Listing[]> => {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching internal listings:", error);
    return [];
  }

  return (data || []).map((listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    image_url: listing.image_url,
    source: listing.source,
    source_name: listing.source_name,
    source_country: listing.source_country,
    external_url: listing.external_url || "",
  }));
};
