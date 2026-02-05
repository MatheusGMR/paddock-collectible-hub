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

Quality: Accept by default. Reject only if impossible. Count only separate physical cars (max 7).

🚨 CRITICAL: Analyze EACH car INDEPENDENTLY - different manufacturers may be in same photo!
Check BASE of each car. NEVER assume same manufacturer for all.

Manufacturers: GREENLIGHT (realistic,rubber tires), HOT WHEELS (fantasy,bright), MATCHBOX (realistic working), M2 (classic American), MAJORETTE (European), TOMICA (JDM), MINI GT (premium 1:64), AUTO WORLD, JOHNNY LIGHTNING, MAISTO/JADA/WELLY.

For each (max 7): boundingBox, realCar{brand,model,year,historicalFact}, collectible{manufacturer,scale,year,origin,series,condition,color,notes}, priceIndex{score,tier,breakdown}, musicSuggestion, musicSelectionReason, musicListeningTip.

priceIndex (Brazil only,100pts): rarity(45max)-BR cars ultra rare; condition(20max); manufacturer(15max); scale(10max); age(10max).
Tiers: ultra_rare(85+), super_rare(70-84), rare(50-69), uncommon(30-49), common(<30).

---
IF REAL_CAR: Return {brand,model,year,variant,bodyStyle,color,searchTerms[],confidence}.

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

    const uPrompt = isVid ? "Analyze video of collectible cars (max 7)." : "Analyze image. Determine if collectible or real vehicle.";
    const model = "google/gemini-3-flash-preview";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: PROMPT }, { role: "user", content: [{ type: "text", text: uPrompt }, media] }] }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    await logUsage(sb, uid, "analyze-collectible", model, estimateTokens(PROMPT + uPrompt, !isVid, isVid), estimateTokens(content), { type: isVid ? "video" : "image" });

    const result = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
