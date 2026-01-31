import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ListingToValidate {
  id: string;
  title: string;
  image_url?: string;
}

interface CarData {
  brand: string;
  model: string;
  year?: string;
  variant?: string;
  bodyStyle?: string;
}

interface ValidationResult {
  id: string;
  isRelevant: boolean;
  confidence: number;
  matchReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listings, car }: { listings: ListingToValidate[]; car: CarData } = await req.json();

    if (!listings || listings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, validatedListings: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!car || !car.brand || !car.model) {
      return new Response(
        JSON.stringify({ success: false, error: "Car data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      // Return all listings as potentially valid if AI is not available
      return new Response(
        JSON.stringify({
          success: true,
          validatedListings: listings.map(l => ({
            id: l.id,
            isRelevant: true,
            confidence: 0.5,
            matchReason: "AI validation unavailable"
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare listings data for validation (limit to first 20 to avoid token limits)
    const listingsToCheck = listings.slice(0, 20);
    const listingsText = listingsToCheck.map((l, i) => 
      `${i + 1}. ID: ${l.id} | Title: "${l.title}"`
    ).join("\n");

    const systemPrompt = `You are an expert at matching diecast/miniature car listings to real vehicles.

Given a target vehicle and a list of marketplace listings, determine which listings are RELEVANT miniatures of the target vehicle.

TARGET VEHICLE:
- Brand: ${car.brand}
- Model: ${car.model}
${car.year ? `- Year: ${car.year}` : ""}
${car.variant ? `- Variant: ${car.variant}` : ""}
${car.bodyStyle ? `- Body Style: ${car.bodyStyle}` : ""}

MATCHING RULES:
1. EXACT MATCH: Brand AND Model must match (highest priority)
2. MODEL MATCH: Same model name from the same brand (even if year differs)
3. VARIANT MATCH: Same base model but different variant (e.g., "911 Turbo" matches "911 GT3")
4. REJECT: Different brand, completely different model, or generic "assorted" listings

Consider these equivalences:
- "VW" = "Volkswagen"
- "Chevy" = "Chevrolet" 
- "HW" often means "Hot Wheels" (brand of the miniature, not the car brand)
- Portuguese/English model names (e.g., "Fusca" = "Beetle")
- Scale variations (1:64, 1:43, 1:24) are all valid

RESPOND WITH JSON ONLY:
{
  "results": [
    {
      "id": "listing_id",
      "isRelevant": true/false,
      "confidence": 0.0-1.0,
      "matchReason": "brief explanation"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Validate these ${listingsToCheck.length} listings for the target vehicle ${car.brand} ${car.model}:\n\n${listingsText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI validation error:", response.status, errorText);
      
      // Return basic matching on failure
      const basicResults = listingsToCheck.map(l => {
        const titleLower = l.title.toLowerCase();
        const brandMatch = titleLower.includes(car.brand.toLowerCase());
        const modelMatch = titleLower.includes(car.model.toLowerCase());
        
        return {
          id: l.id,
          isRelevant: brandMatch && modelMatch,
          confidence: brandMatch && modelMatch ? 0.7 : 0.3,
          matchReason: "Basic text matching (AI unavailable)"
        };
      });
      
      return new Response(
        JSON.stringify({ success: true, validatedListings: basicResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty AI response");
      return new Response(
        JSON.stringify({
          success: true,
          validatedListings: listings.map(l => ({
            id: l.id,
            isRelevant: true,
            confidence: 0.5,
            matchReason: "AI response empty"
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let parsedResults: ValidationResult[] = [];
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const parsed = JSON.parse(cleanContent);
      parsedResults = parsed.results || [];
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback to basic matching
      parsedResults = listingsToCheck.map(l => {
        const titleLower = l.title.toLowerCase();
        return {
          id: l.id,
          isRelevant: titleLower.includes(car.brand.toLowerCase()) || 
                      titleLower.includes(car.model.toLowerCase()),
          confidence: 0.5,
          matchReason: "Fallback text matching"
        };
      });
    }

    // Add any unchecked listings from the original list
    const checkedIds = new Set(parsedResults.map(r => r.id));
    for (const listing of listings) {
      if (!checkedIds.has(listing.id)) {
        parsedResults.push({
          id: listing.id,
          isRelevant: false,
          confidence: 0.3,
          matchReason: "Not validated (over limit)"
        });
      }
    }

    console.log(`[validate-listings] Validated ${parsedResults.length} listings for ${car.brand} ${car.model}`);
    console.log(`[validate-listings] Relevant: ${parsedResults.filter(r => r.isRelevant).length}`);

    return new Response(
      JSON.stringify({ success: true, validatedListings: parsedResults }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("validate-listings error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        validatedListings: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
