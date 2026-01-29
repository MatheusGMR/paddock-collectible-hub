import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchOptions {
  query?: string;
  sources?: string[];
  country?: string;
  limit?: number;
}

interface Listing {
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

// Store configurations for scraping
const STORE_CONFIGS: Record<string, { url: string; searchPath: string; name: string; country: string }> = {
  // Brazil
  olx: { url: "olx.com.br", searchPath: "/autos-e-pecas/miniaturas", name: "OLX", country: "BR" },
  mercadolivre: { url: "mercadolivre.com.br", searchPath: "/hot-wheels", name: "Mercado Livre", country: "BR" },
  escala_miniaturas: { url: "escalaminiaturas.com.br", searchPath: "/hot-wheels", name: "Escala Miniaturas", country: "BR" },
  orangebox: { url: "orangeboxminiaturas.com.br", searchPath: "/catalogsearch/result/?q=", name: "Orangebox", country: "BR" },
  shopee_br: { url: "shopee.com.br", searchPath: "/search?keyword=hot+wheels", name: "Shopee", country: "BR" },
  // USA
  ebay: { url: "ebay.com", searchPath: "/sch/i.html?_nkw=hot+wheels+diecast", name: "eBay", country: "US" },
  jcar_diecast: { url: "jcardiecast.com", searchPath: "/collections/all", name: "JCar Diecast", country: "US" },
  mattel_creations: { url: "creations.mattel.com", searchPath: "/products/hot-wheels", name: "Mattel Creations", country: "US" },
  // Asia
  aliexpress: { url: "aliexpress.com", searchPath: "/wholesale?SearchText=hot+wheels+diecast", name: "AliExpress", country: "CN" },
  amiami: { url: "amiami.com", searchPath: "/eng/search/list/?s_keywords=tomica", name: "AmiAmi", country: "JP" },
  plaza_japan: { url: "plazajapan.com", searchPath: "/collections/tomica", name: "Plaza Japan", country: "JP" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources, country, limit = 20 }: SearchOptions = await req.json();

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Firecrawl connector not configured",
          listings: [],
          sources_status: {}
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter stores based on request parameters
    let storesToScrape = Object.entries(STORE_CONFIGS);
    
    if (sources && sources.length > 0) {
      storesToScrape = storesToScrape.filter(([key]) => sources.includes(key));
    }
    
    if (country) {
      storesToScrape = storesToScrape.filter(([, config]) => config.country === country);
    }

    // Limit to 3 stores per request to avoid timeout
    storesToScrape = storesToScrape.slice(0, 3);

    const listings: Listing[] = [];
    const sourcesStatus: Record<string, "success" | "error" | "skipped"> = {};

    // Search using Firecrawl
    const searchQuery = query || "hot wheels diecast collectible";
    
    console.log(`Searching for: "${searchQuery}" across ${storesToScrape.length} stores`);

    // Use Firecrawl search for web results
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${searchQuery} site:${storesToScrape.map(([, c]) => c.url).join(" OR site:")}`,
        limit: limit,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errorText);
      
      // Return empty listings instead of error
      return new Response(
        JSON.stringify({
          success: true,
          listings: [],
          total: 0,
          has_more: false,
          sources_status: Object.fromEntries(storesToScrape.map(([key]) => [key, "error"])),
          message: "Search temporarily unavailable"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    console.log(`Firecrawl returned ${searchData.data?.length || 0} results`);

    // Parse search results into listings
    if (searchData.data && Array.isArray(searchData.data)) {
      for (const result of searchData.data) {
        // Determine which store this result is from
        const storeEntry = storesToScrape.find(([, config]) => 
          result.url?.includes(config.url)
        );

        if (storeEntry) {
          const [sourceCode, sourceConfig] = storeEntry;
          sourcesStatus[sourceCode] = "success";

          // Extract price from content (basic pattern matching)
          const priceMatch = result.markdown?.match(/(?:R\$|US\$|\$|¥)\s*([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 0;

          listings.push({
            id: `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: result.title || "Collectible Item",
            price: price,
            currency: sourceConfig.country === "BR" ? "BRL" : 
                     sourceConfig.country === "JP" ? "JPY" : "USD",
            image_url: result.metadata?.ogImage || 
                      "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&h=300&fit=crop",
            source: sourceCode,
            source_name: sourceConfig.name,
            source_country: sourceConfig.country,
            external_url: result.url || "",
          });
        }
      }
    }

    // Mark stores without results as skipped
    for (const [key] of storesToScrape) {
      if (!sourcesStatus[key]) {
        sourcesStatus[key] = "skipped";
      }
    }

    console.log(`Returning ${listings.length} listings`);

    return new Response(
      JSON.stringify({
        success: true,
        listings,
        total: listings.length,
        has_more: listings.length >= limit,
        sources_status: sourcesStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-listings error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        listings: [],
        sources_status: {}
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
