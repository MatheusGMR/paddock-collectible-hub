import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch images from Wikimedia Commons API (free, no API key required)
async function searchWikimediaCommons(query: string, limit: number = 5): Promise<string[]> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=${limit * 2}&format=json&origin=*`;
    
    console.log("[fetch-car-photos] Searching Wikimedia for:", query);
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      console.error("[fetch-car-photos] Wikimedia search failed:", searchResponse.status);
      return [];
    }
    
    const searchData = await searchResponse.json();
    const results = searchData.query?.search || [];
    
    if (results.length === 0) {
      console.log("[fetch-car-photos] No results from Wikimedia");
      return [];
    }
    
    // Get image info for each result
    const titles = results
      .slice(0, limit * 2)
      .map((r: { title: string }) => r.title)
      .join("|");
    
    const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
    
    const imageResponse = await fetch(imageInfoUrl);
    if (!imageResponse.ok) {
      console.error("[fetch-car-photos] Wikimedia image info failed:", imageResponse.status);
      return [];
    }
    
    const imageData = await imageResponse.json();
    const pages = imageData.query?.pages || {};
    
    const urls: string[] = [];
    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageinfo = page.imageinfo?.[0];
      if (imageinfo?.thumburl || imageinfo?.url) {
        // Filter for actual car images (avoid logos, diagrams, etc.)
        const url = imageinfo.thumburl || imageinfo.url;
        if (url && !url.includes("logo") && !url.includes("icon") && !url.includes("svg")) {
          urls.push(url);
        }
      }
      if (urls.length >= limit) break;
    }
    
    console.log("[fetch-car-photos] Found", urls.length, "images from Wikimedia");
    return urls;
  } catch (error) {
    console.error("[fetch-car-photos] Wikimedia error:", error);
    return [];
  }
}

// Fetch images from Pexels API (free with API key, but we'll use public endpoint)
async function searchPexels(query: string, limit: number = 5): Promise<string[]> {
  try {
    // Use a curated endpoint for car-related images
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " car")}&per_page=${limit}&orientation=landscape`;
    
    // Note: Pexels requires an API key, skip if not available
    console.log("[fetch-car-photos] Pexels would require API key, skipping");
    return [];
  } catch (error) {
    console.error("[fetch-car-photos] Pexels error:", error);
    return [];
  }
}

// Fallback: Generate reliable Wikipedia image URLs based on car model
async function searchWikipediaImages(brand: string, model: string, year: string): Promise<string[]> {
  try {
    // Try to find the Wikipedia page for the car
    const searchTerms = [
      `${brand} ${model}`,
      `${brand} ${model} ${year}`,
      `${brand} ${model} car`
    ];
    
    for (const term of searchTerms) {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
      
      const response = await fetch(wikiUrl);
      if (!response.ok) continue;
      
      const data = await response.json();
      const results = data.query?.search || [];
      
      if (results.length > 0) {
        const pageTitle = results[0].title;
        
        // Get images from the Wikipedia page
        const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&origin=*`;
        
        const imagesResponse = await fetch(imagesUrl);
        if (!imagesResponse.ok) continue;
        
        const imagesData = await imagesResponse.json();
        const pages = imagesData.query?.pages || {};
        
        const imageNames: string[] = [];
        for (const pageId of Object.keys(pages)) {
          const images = pages[pageId].images || [];
          for (const img of images) {
            const name = img.title;
            // Filter for likely car photos
            if (name && 
                (name.toLowerCase().includes(model.toLowerCase()) || 
                 name.toLowerCase().includes(brand.toLowerCase())) &&
                !name.includes("logo") && 
                !name.includes("icon") &&
                !name.includes(".svg")) {
              imageNames.push(name);
            }
          }
        }
        
        if (imageNames.length > 0) {
          // Get URLs for these images
          const urls: string[] = [];
          for (const imageName of imageNames.slice(0, 5)) {
            const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(imageName)}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
            
            const infoResponse = await fetch(infoUrl);
            if (infoResponse.ok) {
              const infoData = await infoResponse.json();
              const infoPages = infoData.query?.pages || {};
              for (const pid of Object.keys(infoPages)) {
                const thumbUrl = infoPages[pid].imageinfo?.[0]?.thumburl;
                if (thumbUrl) {
                  urls.push(thumbUrl);
                }
              }
            }
          }
          
          if (urls.length > 0) {
            console.log("[fetch-car-photos] Found", urls.length, "images from Wikipedia");
            return urls;
          }
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error("[fetch-car-photos] Wikipedia error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, model, year } = await req.json();

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: "Brand and model are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-car-photos] Searching for: ${brand} ${model} ${year || ""}`);

    // Build search queries with variations
    const queries = [
      `${brand} ${model} ${year || ""} car`,
      `${brand} ${model} automobile`,
      `${brand} ${model}`
    ];

    let allPhotos: string[] = [];

    // Try Wikimedia Commons first (most reliable, free)
    for (const query of queries) {
      const wikimediaPhotos = await searchWikimediaCommons(query, 5);
      allPhotos = [...allPhotos, ...wikimediaPhotos];
      if (allPhotos.length >= 5) break;
    }

    // If not enough photos, try Wikipedia page images
    if (allPhotos.length < 3) {
      const wikiPhotos = await searchWikipediaImages(brand, model, year || "");
      allPhotos = [...allPhotos, ...wikiPhotos];
    }

    // Remove duplicates and limit to 5
    const uniquePhotos = [...new Set(allPhotos)].slice(0, 5);

    console.log(`[fetch-car-photos] Returning ${uniquePhotos.length} photos`);

    return new Response(
      JSON.stringify({ 
        photos: uniquePhotos,
        source: "wikimedia",
        count: uniquePhotos.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[fetch-car-photos] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", photos: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
