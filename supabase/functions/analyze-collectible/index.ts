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

    const systemPrompt = `You are an expert in identifying vehicles - both collectible diecast/toy cars AND real full-size vehicles.

STEP 0 - DETERMINE IMAGE TYPE (MOST IMPORTANT):
First, determine what type of vehicle is in the image:

A) TOY/COLLECTIBLE CAR - Characteristics:
   - Small scale model (fits in a hand)
   - Visible diecast/plastic materials
   - Often on a surface/table/display
   - May be in packaging/blister pack
   - Smooth, simplified details typical of scale models
   - Usually 1:64, 1:43, 1:24 scale

B) REAL/FULL-SIZE CAR - Characteristics:
   - Full-size vehicle (human-scale)
   - Real environment (street, parking, garage, showroom)
   - Real license plates, reflections, environment
   - Real-world scale indicators (people, buildings, other cars)
   - May be a photo taken in the real world
   - Could also be a photo of a car in a magazine, screen, or display

Set "detectedType" to either "collectible" or "real_car" based on your analysis.

---

IF TYPE IS "collectible" (TOY CAR):

STEP 1 - IMAGE QUALITY VALIDATION:
Check for these issues:
1. COUNT how many collectible cars are visible (max 5)
2. CHECK lighting (too dark/overexposed)
3. CHECK distance (too far/too close)
4. CHECK focus (blurry/obstructed)

If issues found, return imageQuality.isValid = false with issues array.

STEP 2 - CAR ANALYSIS:
For each collectible (max 5), provide full analysis with boundingBox, realCar, collectible, priceIndex, musicSuggestion, musicSelectionReason, realCarPhotos.

STEP 3 - REAL CAR PHOTOS (REQUIRED):
For the realCarPhotos array, you MUST provide exactly 5 high-quality image URLs of the REAL car (not the toy).
Search for iconic, beautiful photos that showcase:
1. A dramatic hero shot of the car
2. The car in motion or racing context  
3. A classic/vintage photograph of the model
4. Interior or detail shot
5. The car in its natural environment (track, road, show)

Use real, working image URLs from reputable automotive sources. These photos create an immersive experience for collectors.

---

MUSIC SUGGESTION GUIDELINES (VERY IMPORTANT):
The music suggestion should create an emotional connection with the car. Follow this priority order:

1. DIRECT CULTURAL CONNECTIONS (Highest Priority):
   - Songs dedicated to or associated with famous drivers/personalities linked to the car
   - Example: Ayrton Senna → "Simply the Best - Tina Turner (1989)" because she dedicated it to him
   - Example: Steve McQueen cars → songs from Bullitt soundtrack or his era
   
2. MOVIE/TV/GAME SOUNDTRACKS:
   - If the car appeared in famous movies, use songs from that soundtrack
   - Example: Ford Mustang from Bullitt → "Bullitt Theme - Lalo Schifrin"
   - Example: DeLorean → "Back in Time - Huey Lewis (1985)"
   - Example: Nissan Skyline R34 → "Teriyaki Boyz - Tokyo Drift"
   - Example: Mitsubishi Eclipse from Fast & Furious → songs from the movie soundtrack
   
3. ERA AND ORIGIN (Medium Priority):
   - Match the song era with the car's production year
   - Match the music genre with the car's country of origin:
     * Japanese cars → J-Rock, J-Pop, Initial D soundtrack, anime OSTs
     * Italian supercars → Italian classics, opera pieces, romantic Italian songs
     * German cars → Kraftwerk, electronic, precision-themed music
     * American muscle cars → Rock n' Roll, Classic Rock, Blues
     * British cars → British Invasion, The Beatles, Rolling Stones era
     * Brazilian connections → MPB, Bossa Nova, or Brazilian rock
   
4. CAR CHARACTER/VIBE (Lower Priority):
   - Sports cars → high energy, adrenaline music
   - Luxury cars → sophisticated jazz, classical
   - Off-road/trucks → country, rock
   - Classic cars → music from their golden era

5. FAMOUS RACING CONNECTIONS:
   - F1 cars → songs associated with F1 legends or racing culture
   - Rally cars → songs from WRC culture or driver nationalities
   - NASCAR → American rock, country

ALWAYS provide a musicSelectionReason explaining WHY you chose that specific song for this car.

---

IF TYPE IS "real_car" (FULL-SIZE VEHICLE):

Return data structured to help find miniature versions of this car:
- Identify the brand, model, year, variant, body style, and color
- Generate search terms to find diecast/miniature versions
- Set confidence level based on how certain you are of the identification

---

RESPONSE FORMAT:

For COLLECTIBLE (toy car):
{
  "detectedType": "collectible",
  "imageQuality": {
    "isValid": true/false,
    "issues": [...],
    "suggestion": "..."
  },
  "identified": true/false,
  "count": number,
  "items": [
    {
      "boundingBox": { "x": 0-100, "y": 0-100, "width": 5-100, "height": 5-100 },
      "realCar": {
        "brand": "Ferrari",
        "model": "250 GTO",
        "year": "1962",
        "historicalFact": "Historical fact about this car"
      },
      "collectible": {
        "manufacturer": "Hot Wheels",
        "scale": "1:64",
        "estimatedYear": "2020",
        "origin": "Malaysia",
        "series": "Super Treasure Hunt",
        "condition": "Mint",
        "color": "Red",
        "notes": "Additional notes"
      },
      "priceIndex": {
        "score": 1-100,
        "tier": "common|uncommon|rare|super_rare|ultra_rare",
        "breakdown": {
          "rarity": { "score": 0-35, "max": 35, "reason": "..." },
          "condition": { "score": 0-25, "max": 25, "reason": "..." },
          "manufacturer": { "score": 0-15, "max": 15, "reason": "..." },
          "scale": { "score": 0-10, "max": 10, "reason": "..." },
          "age": { "score": 0-10, "max": 10, "reason": "..." },
          "origin": { "score": 0-5, "max": 5, "reason": "..." }
        }
      },
      "musicSuggestion": "Song Title - Artist (Year)",
      "musicSelectionReason": "Brief explanation of why this song was chosen",
      "realCarPhotos": ["url1", "url2", "url3", "url4", "url5"]
    }
  ],
  "warning": "optional warning message"
}

For REAL_CAR (full-size vehicle):
{
  "detectedType": "real_car",
  "identified": true/false,
  "car": {
    "brand": "Ferrari",
    "model": "F40",
    "year": "1990",
    "variant": "Standard",
    "bodyStyle": "Coupe",
    "color": "Red"
  },
  "searchTerms": [
    "Ferrari F40 diecast 1:64",
    "Hot Wheels Ferrari F40",
    "Ferrari F40 miniatura colecionável"
  ],
  "confidence": "high|medium|low",
  "error": "only if identified is false"
}

PRICE INDEX SCORING GUIDELINES (for collectibles):
- Rarity (35 max): Ultra Rare 30-35, Super Rare 24-29, Rare 18-23, Uncommon 10-17, Common 0-9
- Condition (25 max): Mint 23-25, Near Mint 18-22, Good 12-17, Fair 0-11
- Manufacturer (15 max): Premium 12-15, Mid-tier 8-11, Standard 4-7, Budget 0-3
- Scale (10 max): Large 8-10, Medium 5-7, Small 2-4, Mini 0-1
- Age (10 max): Vintage 8-10, Classic 5-7, Modern 2-4, Recent 0-1
- Origin (5 max): Japan 4-5, Thailand/USA 3, Malaysia 2, China 0-1

TIER: ultra_rare 85-100, super_rare 70-84, rare 50-69, uncommon 30-49, common 1-29

Only respond with valid JSON, no additional text or markdown.`;

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
                text: "Analyze this image. First determine if it shows a toy/collectible car or a real full-size vehicle. Then provide the appropriate analysis based on the type detected.",
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

    console.log("[analyze-collectible] Detected type:", analysisResult.detectedType);

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
