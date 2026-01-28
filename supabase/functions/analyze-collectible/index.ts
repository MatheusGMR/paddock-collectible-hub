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
    "origin": "Country of manufacture (e.g., Malaysia, Thailand, China)",
    "series": "Series or collection name if identifiable",
    "condition": "Condition assessment (Mint, Near Mint, Good, Fair)",
    "notes": "Any additional notes about the collectible"
  }
}

If you cannot identify the item or it's not a collectible car, set "identified" to false and provide empty objects for realCar and collectible.
Only respond with the JSON, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this collectible car image and provide detailed information about both the real car it represents and the collectible item itself.",
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
