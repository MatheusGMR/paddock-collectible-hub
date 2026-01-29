import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert in collectible diecast cars and model vehicles. 
Analyze the image provided and identify the collectible item (diecast car, model car, etc.).

You MUST respond with a valid JSON object in this exact format:
{
  "identified": true or false,
  "realCar": {
    "brand": "Brand of the real car (e.g., Ferrari, Porsche, Toyota)",
    "model": "Model name (e.g., 250 GTO, 911 Turbo)",
    "year": "Year of the real car",
    "historicalFact": "An interesting historical fact about this car (2-3 sentences)"
  },
  "collectible": {
    "manufacturer": "Manufacturer of the diecast/model (e.g., Hot Wheels, Matchbox, Tomica, Majorette)",
    "scale": "Scale of the model (e.g., 1:64, 1:43, 1:18)",
    "estimatedYear": "Estimated year of production of the collectible",
    "origin": "Country of manufacture (e.g., Malaysia, Thailand, China, Japan)",
    "series": "Series or collection name if identifiable (e.g., Super Treasure Hunt, RLC, Premium, Mainline, Chase, Limited Edition)",
    "condition": "Condition assessment (Mint, Near Mint, Good, Fair)",
    "notes": "Any additional notes about the collectible"
  },
  "priceIndex": {
    "score": 1-100,
    "tier": "common" | "uncommon" | "rare" | "super_rare" | "ultra_rare",
    "breakdown": {
      "rarity": {
        "score": 0-35,
        "max": 35,
        "reason": "Explanation (e.g., Super Treasure Hunt, RLC Exclusive, Chase, Mainline, Limited Edition)"
      },
      "condition": {
        "score": 0-25,
        "max": 25,
        "reason": "Condition assessment"
      },
      "manufacturer": {
        "score": 0-15,
        "max": 15,
        "reason": "Manufacturer name"
      },
      "scale": {
        "score": 0-10,
        "max": 10,
        "reason": "Scale (larger scales generally worth more)"
      },
      "age": {
        "score": 0-10,
        "max": 10,
        "reason": "Year or vintage status"
      },
      "origin": {
        "score": 0-5,
        "max": 5,
        "reason": "Country of manufacture"
      }
    }
  }
}

PRICE INDEX SCORING GUIDELINES:

RARITY (35 points max):
- Ultra Rare (30-35): RLC Exclusive, Convention Exclusive, Error/Prototype, Super Treasure Hunt ($TH)
- Super Rare (24-29): Regular Treasure Hunt, Chase variants, Japan-only releases
- Rare (18-23): Premium lines (Car Culture, Team Transport), Limited editions, numbered series
- Uncommon (10-17): Special store exclusives, themed series, older mainlines (pre-2000)
- Common (0-9): Current mainline releases, basic series

CONDITION (25 points max):
- Mint (23-25): Perfect, unopened or like-new
- Near Mint (18-22): Excellent with minimal wear
- Good (12-17): Light wear, minor scratches
- Fair (0-11): Visible wear, missing parts

MANUFACTURER (15 points max):
- Premium (12-15): Tomica Limited Vintage, Kyosho, AutoArt, Greenlight
- Mid-tier (8-11): Hot Wheels Premium, Matchbox Premium, Majorette Premium
- Standard (4-7): Hot Wheels Mainline, Matchbox, Majorette, Maisto
- Budget (0-3): Generic brands, unknown manufacturers

SCALE (10 points max):
- Large (8-10): 1:18, 1:24
- Medium (5-7): 1:32, 1:43
- Small (2-4): 1:64
- Mini (0-1): 1:87, 1:144

AGE (10 points max):
- Vintage (8-10): Pre-1980
- Classic (5-7): 1980-1999
- Modern (2-4): 2000-2015
- Recent (0-1): 2016-present

ORIGIN (5 points max):
- Japan (4-5): Highest quality control
- Thailand/USA (3): Good quality
- Malaysia (2): Standard quality
- China (0-1): Variable quality

TIER CLASSIFICATION:
- ultra_rare: 85-100 points
- super_rare: 70-84 points
- rare: 50-69 points
- uncommon: 30-49 points
- common: 1-29 points

If you cannot identify the item or it's not a collectible car, set "identified" to false and provide empty objects for realCar, collectible, and priceIndex.
Only respond with the JSON, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this collectible car image and provide detailed information about both the real car it represents, the collectible item itself, and calculate a comprehensive price index based on the scoring criteria provided.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from the AI
    let analysisResult;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      analysisResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis");
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-collectible error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
