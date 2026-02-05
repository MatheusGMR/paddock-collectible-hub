import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_PRICING = { "google/gemini-3-flash-preview": { input: 0.50, output: 3.00 } };

function estimateTokens(content: string, isImage = false, isVideo = false): number {
  const t = Math.ceil(content.length / 4);
  return isVideo ? t + 8000 : isImage ? t + 2500 : t;
}

function calculateCost(i: number, o: number): number {
  const p = MODEL_PRICING["google/gemini-3-flash-preview"];
  return (i / 1e6) * p.input + (o / 1e6) * p.output;
}

// deno-lint-ignore no-explicit-any
async function logUsage(sb: any, uid: string | null, fn: string, m: string, i: number, o: number, meta: Record<string, unknown> = {}) {
  try {
    await sb.from("ai_usage_logs").insert({
      user_id: uid, function_name: fn, model: m,
      input_tokens: i, output_tokens: o,
      cost_estimate_usd: calculateCost(i, o), metadata: meta,
    });
  } catch (e) { console.error("[Log]", e); }
}

const PROMPT = `Expert in collectible diecast cars AND real vehicles. ALL TEXT IN BRAZILIAN PORTUGUESE.

STEP 0: Determine type:
A) COLLECTIBLE: Small scale model (1:64/1:43/1:24), diecast/plastic
B) REAL_CAR: Full-size vehicle in real environment

---
IF COLLECTIBLE:

🚨 QUALITY RULES - ALWAYS IDENTIFY, NEVER REJECT:
- ALWAYS attempt identification even with reflections, shadows, blur, or suboptimal lighting
- Reflections on blister packs, glass cases, or car paint are NORMAL and must NOT prevent analysis
- Only set identified=false if the image shows NO recognizable vehicle whatsoever
- If you can see ANY car shape, color, or feature → IDENTIFY IT with your best estimate
- NEVER use image quality as reason to reject. Be tolerant and make your best guess.

Count only separate physical cars (max 7). Ignore reflections/shadows as duplicate cars.

🚨 CRITICAL: Analyze EACH car INDEPENDENTLY - different manufacturers may be in same photo!
Check BASE of each car. NEVER assume same manufacturer for all.

Manufacturers: GREENLIGHT (realistic,rubber tires), HOT WHEELS (fantasy,bright), MATCHBOX (realistic working), M2 (classic American), MAJORETTE (European), TOMICA (JDM), MINI GT (premium 1:64), AUTO WORLD, JOHNNY LIGHTNING, MAISTO/JADA/WELLY.

For each (max 7): boundingBox, realCar{brand,model,year,historicalFact}, collectible{manufacturer,scale,year,origin,series,condition,color,notes}, priceIndex{score,tier,breakdown}, musicSuggestion, musicSelectionReason, musicListeningTip.

priceIndex (Brazil only,100pts): rarity(45max)-BR cars ultra rare; condition(20max); manufacturer(15max); scale(10max); age(10max).
Tiers: ultra_rare(85+), super_rare(70-84), rare(50-69), uncommon(30-49), common(<30).

---
IF REAL_CAR: Return {brand,model,year,variant,bodyStyle,color,searchTerms[],confidence}.

CRITICAL: Set identified=true if you can see ANY vehicle. Never reject due to reflections/lighting.

JSON only, no markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return new Response(JSON.stringify({ error: "Image required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let uid: string | null = null;
    const auth = req.headers.get("authorization");
    if (auth) try { uid = (await sb.auth.getUser(auth.replace("Bearer ", ""))).data.user?.id || null; } catch {}

    const isVid = imageBase64.startsWith("data:video/");
    const media = isVid
      ? { type: "video_url" as const, video_url: { url: imageBase64 } }
      : { type: "image_url" as const, image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } };

    const uPrompt = isVid
      ? "Analyze video of collectible cars (max 7)."
      : "Analyze image. Determine if collectible or real vehicle.";

    const PRIMARY_MODEL = "google/gemini-3-flash-preview";
    const FALLBACK_MODEL = "google/gemini-3-pro-preview";

    const stripFences = (s: string) => s.replace(/```json\n?|\n?```/g, "").trim();

    // deno-lint-ignore no-explicit-any
    const shouldRetry = (r: any): boolean => {
      const detectedType = r?.detectedType || "collectible";

      if (detectedType === "real_car") {
        return !r?.identified || !r?.car;
      }

      const itemsLen = Array.isArray(r?.items) ? r.items.length : 0;
      const count = typeof r?.count === "number" ? r.count : itemsLen;
      return !r?.identified || count === 0 || itemsLen === 0;
    };

    const fetchAndParse = async (model: string, attempt: number, reason: string) => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: PROMPT },
            {
              role: "user",
              content: [{ type: "text", text: uPrompt }, media],
            },
          ],
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          return {
            ok: false as const,
            httpResponse: new Response(
              JSON.stringify({ error: "Rate limit. Try again." }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            ),
          };
        }
        if (res.status === 402) {
          return {
            ok: false as const,
            httpResponse: new Response(
              JSON.stringify({ error: "Credits exhausted." }),
              {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            ),
          };
        }
        return { ok: false as const, error: new Error(`AI error: ${res.status}`) };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return { ok: false as const, error: new Error("No AI response") };

      await logUsage(
        sb,
        uid,
        "analyze-collectible",
        model,
        estimateTokens(PROMPT + uPrompt, !isVid, isVid),
        estimateTokens(content),
        { type: isVid ? "video" : "image", attempt, reason }
      );

      try {
        const parsed = JSON.parse(stripFences(content));
        return { ok: true as const, parsed };
      } catch (e) {
        return {
          ok: false as const,
          error: e instanceof Error ? e : new Error("Failed to parse AI response"),
        };
      }
    };

    let result: unknown;

    const primary = await fetchAndParse(PRIMARY_MODEL, 1, "primary");
    if (!primary.ok) {
      if ("httpResponse" in primary) return primary.httpResponse;
      console.error("[AI] Primary attempt failed:", primary.error);

      const fallback = await fetchAndParse(FALLBACK_MODEL, 2, "primary_failed");
      if (!fallback.ok) {
        if ("httpResponse" in fallback) return fallback.httpResponse;
        throw fallback.error;
      }

      result = fallback.parsed;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    result = primary.parsed;

    // If identification failed, retry once with a stronger model
    if (shouldRetry(result)) {
      const fallback = await fetchAndParse(FALLBACK_MODEL, 2, "not_identified");
      if (!fallback.ok) {
        if ("httpResponse" in fallback) return fallback.httpResponse;
        console.error("[AI] Fallback attempt failed:", fallback.error);
      } else if (!shouldRetry(fallback.parsed)) {
        result = fallback.parsed;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
