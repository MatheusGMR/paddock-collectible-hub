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

// Trusted domains for miniature/diecast listings
const TRUSTED_DOMAINS = [
  "mercadolivre.com.br",
  "olx.com.br",
  "shopee.com.br",
  "ebay.com",
  "aliexpress.com",
  "amazon.com",
  "amazon.com.br",
  "americanas.com.br",
  "magazineluiza.com.br",
  "casasbahia.com.br",
  "pontofrio.com.br",
  "kalunga.com.br",
  "walmart.com",
  "target.com",
  "hotwheelscollectors.mattel.com",
  "creations.mattel.com",
  "matchbox.mattel.com",
  "jcardiecast.com",
  "diecastcarsshop.com",
  "miniaturasbr.com.br",
  "escalaminiaturas.com.br",
  "orangeboxminiaturas.com.br",
  "bfrminiaturas.com.br",
  "miniaturasds.com.br",
  "carrinhosbr.com.br",
];

// Determine source info from URL
function getSourceFromUrl(url: string): { source: string; source_name: string; source_country: string } {
  const urlLower = url.toLowerCase();
  
  // Check known stores first
  for (const [code, config] of Object.entries(STORE_CONFIGS)) {
    if (urlLower.includes(config.url)) {
      return { source: code, source_name: config.name, source_country: config.country };
    }
  }
  
  // Try to detect from URL patterns
  if (urlLower.includes("mercadolivre") || urlLower.includes("mercadolibre")) {
    return { source: "mercadolivre", source_name: "Mercado Livre", source_country: "BR" };
  }
  if (urlLower.includes("amazon.com.br")) {
    return { source: "amazon_br", source_name: "Amazon Brasil", source_country: "BR" };
  }
  if (urlLower.includes("amazon.com")) {
    return { source: "amazon", source_name: "Amazon", source_country: "US" };
  }
  if (urlLower.includes("shopee.com.br")) {
    return { source: "shopee_br", source_name: "Shopee", source_country: "BR" };
  }
  if (urlLower.includes("ebay")) {
    return { source: "ebay", source_name: "eBay", source_country: "US" };
  }
  if (urlLower.includes("aliexpress")) {
    return { source: "aliexpress", source_name: "AliExpress", source_country: "CN" };
  }
  if (urlLower.includes(".com.br")) {
    return { source: "web_br", source_name: "Web Brasil", source_country: "BR" };
  }
  
  return { source: "web", source_name: "Web", source_country: "US" };
}

// Check if URL is from a trusted marketplace
function isTrustedDomain(url: string): boolean {
  const urlLower = url.toLowerCase();
  return TRUSTED_DOMAINS.some(domain => urlLower.includes(domain));
}

// Extract currency from country
function getCurrencyForCountry(country: string): string {
  switch (country) {
    case "BR": return "BRL";
    case "JP": return "JPY";
    case "CN": return "CNY";
    default: return "USD";
  }
}

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

    const listings: Listing[] = [];
    const sourcesStatus: Record<string, "success" | "error" | "skipped"> = {};

    // Base search query
    const baseQuery = query || "hot wheels diecast collectible";
    
    console.log(`[fetch-listings] Searching for: "${baseQuery}"`);

    // Strategy 1: General web search (Google results via Firecrawl)
    // This finds listings across ALL sites including those not in our store list
    const webSearchQuery = `${baseQuery} comprar miniatura diecast`;
    
    console.log(`[fetch-listings] Web search: "${webSearchQuery}"`);

    try {
      const webSearchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: webSearchQuery,
          limit: Math.min(limit * 2, 30), // Get more results for filtering
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
      });

      if (webSearchResponse.ok) {
        const webSearchData = await webSearchResponse.json();
        console.log(`[fetch-listings] Web search returned ${webSearchData.data?.length || 0} results`);

        if (webSearchData.data && Array.isArray(webSearchData.data)) {
          for (const result of webSearchData.data) {
            // Skip if no URL
            if (!result.url) continue;
            
            // Skip non-marketplace results (blogs, news, etc.)
            if (!isTrustedDomain(result.url)) {
              console.log(`[fetch-listings] Skipping non-marketplace: ${result.url}`);
              continue;
            }

            // Get real image from metadata
            const realImage = result.metadata?.ogImage || result.metadata?.image;
            
            if (!realImage) {
              console.log(`[fetch-listings] Skipping (no image): ${result.title}`);
              continue;
            }

            // Get source info from URL
            const sourceInfo = getSourceFromUrl(result.url);
            sourcesStatus[sourceInfo.source] = "success";

            // Extract price from content
            const priceMatch = result.markdown?.match(/(?:R\$|US\$|\$|¥|€)\s*([\d.,]+)/);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")) : 0;

            listings.push({
              id: `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: result.title || "Collectible Item",
              price: price,
              currency: getCurrencyForCountry(sourceInfo.source_country),
              image_url: realImage,
              source: sourceInfo.source,
              source_name: sourceInfo.source_name,
              source_country: sourceInfo.source_country,
              external_url: result.url,
            });
          }
        }
      } else {
        console.error("[fetch-listings] Web search failed:", await webSearchResponse.text());
      }
    } catch (error) {
      console.error("[fetch-listings] Web search error:", error);
    }

    // Strategy 2: If still need more results, try specific stores
    if (listings.length < limit) {
      // Filter stores based on request parameters
      let storesToScrape = Object.entries(STORE_CONFIGS);
      
      if (sources && sources.length > 0) {
        storesToScrape = storesToScrape.filter(([key]) => sources.includes(key));
      }
      
      if (country) {
        storesToScrape = storesToScrape.filter(([, config]) => config.country === country);
      }

      // Limit to 3 stores to avoid timeout
      storesToScrape = storesToScrape.slice(0, 3);

      if (storesToScrape.length > 0) {
        console.log(`[fetch-listings] Store search across ${storesToScrape.length} stores`);

        try {
          const storeSearchQuery = `${baseQuery} site:${storesToScrape.map(([, c]) => c.url).join(" OR site:")}`;
          
          const storeSearchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: storeSearchQuery,
              limit: limit - listings.length,
              scrapeOptions: {
                formats: ["markdown"],
              },
            }),
          });

          if (storeSearchResponse.ok) {
            const storeSearchData = await storeSearchResponse.json();
            console.log(`[fetch-listings] Store search returned ${storeSearchData.data?.length || 0} results`);

            if (storeSearchData.data && Array.isArray(storeSearchData.data)) {
              for (const result of storeSearchData.data) {
                // Skip duplicates
                if (listings.some(l => l.external_url === result.url)) continue;

                // Determine which store this result is from
                const storeEntry = storesToScrape.find(([, config]) => 
                  result.url?.includes(config.url)
                );

                if (storeEntry) {
                  const [sourceCode, sourceConfig] = storeEntry;
                  sourcesStatus[sourceCode] = "success";

                  const realImage = result.metadata?.ogImage || result.metadata?.image;
                  
                  if (!realImage) continue;

                  const priceMatch = result.markdown?.match(/(?:R\$|US\$|\$|¥|€)\s*([\d.,]+)/);
                  const price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, "").replace(",", ".")) : 0;

                  listings.push({
                    id: `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: result.title || "Collectible Item",
                    price: price,
                    currency: getCurrencyForCountry(sourceConfig.country),
                    image_url: realImage,
                    source: sourceCode,
                    source_name: sourceConfig.name,
                    source_country: sourceConfig.country,
                    external_url: result.url || "",
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("[fetch-listings] Store search error:", error);
        }
      }
    }

    // Mark stores without results as skipped
    for (const [key] of Object.entries(STORE_CONFIGS)) {
      if (!sourcesStatus[key]) {
        sourcesStatus[key] = "skipped";
      }
    }

    // Remove duplicates by URL
    const uniqueListings = listings.filter((listing, index, self) =>
      index === self.findIndex(l => l.external_url === listing.external_url)
    );

    console.log(`[fetch-listings] Returning ${uniqueListings.length} unique listings`);

    return new Response(
      JSON.stringify({
        success: true,
        listings: uniqueListings.slice(0, limit),
        total: uniqueListings.length,
        has_more: uniqueListings.length >= limit,
        sources_status: sourcesStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-listings] error:", error);
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
