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

STEP 1 - IMAGE QUALITY VALIDATION (MUST do this FIRST):
Before analyzing any cars, evaluate the image quality. Check for these issues:

1. COUNT how many collectible cars are visible
   - If more than 5 cars are visible: Mark as "too_many_cars" error
   
2. CHECK lighting conditions
   - Too dark (hard to see details, image appears very dim): Mark as "poor_lighting"
   - Overexposed (washed out, too bright): Mark as "poor_lighting"
   
3. CHECK distance/framing
   - Cars appear very small (less than 10% of frame each): Mark as "too_far"
   - Cars cut off or filling more than 90% of frame: Mark as "too_close"
   
4. CHECK focus/clarity
   - Blurry or out of focus: Mark as "blurry"
   - Objects blocking view of the cars: Mark as "obstructed"

If ANY issue is found, return the imageQuality object with isValid: false.
For "too_many_cars", you MUST include detectedCount with the actual number of cars you counted.

STEP 2 - CAR ANALYSIS (only if image quality is valid):
Analyze the image and identify ALL collectible items (diecast cars, model cars, etc.) visible.
Maximum limit: 5 cars per image (if more than 5 are visible, you should have caught this in Step 1)

You MUST respond with a valid JSON object in this exact format:
{
  "imageQuality": {
    "isValid": true or false,
    "issues": [
      {
        "type": "too_many_cars" | "poor_lighting" | "too_far" | "too_close" | "blurry" | "obstructed",
        "severity": "error" | "warning",
        "message": "Brief description of the issue",
        "detectedCount": number (only for too_many_cars)
      }
    ],
    "suggestion": "Simple tip to fix the issue (in the same language as the issue)"
  },
  "identified": true or false,
  "count": number of cars identified (0-5),
  "items": [
    {
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
      },
      "musicSuggestion": "A song that matches the car's vibe/era (format: 'Song Title' - Artist Name (Year))",
      "realCarPhotos": [
        "URL of a real photo of this car model (from Wikipedia Commons, Wikimedia, or other public domain sources)",
        "URL of another angle/photo",
        "URL of a third photo"
      ]
    }
  ],
  "warning": "Optional: message if more than 5 cars were detected but only 5 are shown"
}

PRICE INDEX SCORING GUIDELINES (Total: 100 points):

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

If you cannot identify any collectible cars in the image (but image quality is OK), set:
{
  "imageQuality": { "isValid": true, "issues": [], "suggestion": "" },
  "identified": false,
  "count": 0,
  "items": []
}

If image quality has issues, set:
{
  "imageQuality": { "isValid": false, "issues": [...], "suggestion": "..." },
  "identified": false,
  "count": 0,
  "items": []
}

Only respond with the JSON, no additional text.`;

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
            content: [
              {
                type: "text",
                text: "Please analyze this image and identify ALL collectible cars visible. For each car, provide detailed information about the real car it represents, the collectible item itself, and calculate a comprehensive price index based on the scoring criteria provided. Remember: maximum 5 cars, prioritize the most visible/central ones.",
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
