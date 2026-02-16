import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_PRICING = { "gpt-4o": { input: 2.50, output: 10.00 }, "gpt-4o-mini": { input: 0.15, output: 0.60 } };

function estimateTokens(content: string, isImage = false, isVideo = false): number {
  const t = Math.ceil(content.length / 4);
  return isVideo ? t + 8000 : isImage ? t + 2500 : t;
}

function calculateCost(i: number, o: number, model = "gpt-4o"): number {
  const p = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["gpt-4o"];
  return (i / 1e6) * p.input + (o / 1e6) * p.output;
}

// deno-lint-ignore no-explicit-any
function logUsage(sb: any, uid: string | null, fn: string, m: string, i: number, o: number, meta: Record<string, unknown> = {}) {
  // Fire-and-forget — do NOT await
  sb.from("ai_usage_logs").insert({
    user_id: uid, function_name: fn, model: m,
    input_tokens: i, output_tokens: o,
    cost_estimate_usd: calculateCost(i, o, m), metadata: meta,
  }).then(null, (e: unknown) => console.error("[Log]", e));
}

// =====================================================
// COMPACT PROMPT — optimised for speed (~2500 tokens)
// =====================================================
const BASE_PROMPT = `Especialista em carrinhos colecionáveis diecast E veículos reais. Historiador automotivo e DJ nostálgico.

🚨 IDIOMA: TODO conteúdo em PORTUGUÊS BRASILEIRO.

PASSO 0 — Tipo:
A) COLECIONÁVEL: Miniatura diecast/plástico (1:64/1:43/1:24)
B) CARRO_REAL: Veículo real em ambiente real

---
SE COLECIONÁVEL:

REGRAS:
1. Qualquer formato de carro miniatura → identified=true, forneça melhor estimativa
2. NUNCA rejeite por reflexos, brilho, sombras, desfoque, pouca luz, blister
3. Mesmo com visibilidade parcial → IDENTIFIQUE
4. Só identified=false se NENHUM veículo reconhecível
5. Analise CADA carro independentemente (fabricantes podem diferir)
6. Conte apenas carros físicos separados (máx 7)

Fabricantes: HOT WHEELS, MATCHBOX, GREENLIGHT, M2, MAJORETTE, TOMICA, MINI GT, AUTO WORLD, JOHNNY LIGHTNING, MAISTO, JADA, WELLY.

Para cada (máx 7): boundingBox{x,y,width,height %}, realCar{brand,model,year,historicalFact}, collectible{manufacturer,scale,year,origin,series,condition,color,notes}, priceIndex{score,tier,breakdown}, musicSuggestion, musicSelectionReason, musicListeningTip.

historicalFact: 2-3 frases fascinantes sobre o carro real (bastidores, recordes, cultura pop, curiosidades).

musicSuggestion: "Nome - Artista (Ano)". Conexão profunda com o veículo (trilha sonora, época, cultura).
musicSelectionReason: 2-4 frases emocionais conectando música ao carro.
musicListeningTip: 2-3 frases sensoriais/nostálgicas (aromas, cenários, memórias).

priceIndex (Brasil, 100pts):
Breakdown com "score", "max", "reason" para CADA:
- rarity (máx 45): disponibilidade real no Brasil
- condition (máx 20): estado visual
- manufacturer (máx 15): reputação da marca
- scale (máx 10): raridade da escala
- age (máx 10): idade e impacto
Tiers: ultra_rare(85+), super_rare(70-84), rare(50-69), uncommon(30-49), common(<30).

condition: "Excelente"|"Muito Bom"|"Bom"|"Regular"|"Ruim"
origin: "Brasil"|"EUA"|"China"|"Japão"|"Tailândia"|etc.

---
SE CARRO_REAL: {identified:true, detectedType:"real_car", car:{brand,model,year,variant,bodyStyle,color}, searchTerms[], confidence}.

VERIFICAÇÃO: identified=true se QUALQUER veículo visível. NUNCA array items vazio se viu um carro.
Apenas JSON, sem markdown.

FORMATO OBRIGATÓRIO DE RESPOSTA (use EXATAMENTE estas chaves):
Para colecionáveis:
{"identified":true, "detectedType":"collectible", "count":N, "items":[{boundingBox, realCar, collectible, priceIndex, musicSuggestion, musicSelectionReason, musicListeningTip}]}

Para carros reais:
{"identified":true, "detectedType":"real_car", "car":{"brand":"...","model":"...","year":"...","variant":"...","bodyStyle":"...","color":"..."}, "searchTerms":["..."], "confidence":"high"|"medium"|"low"}

Se NENHUM veículo reconhecível:
{"identified":false, "detectedType":"collectible", "count":0, "items":[]}

NUNCA use chaves diferentes de "items" para a lista. NUNCA use "vehicles", "carros", "results", "data".`;

// Detailed prompt additions for fallback (richer examples)
const FALLBACK_PROMPT_EXTRA = `

DETALHAMENTO EXTRA (fallback):
- rarity reason: mencione lojas, feiras, OLX, ML; compare disponibilidade com outros países; cite séries limitadas.
- condition reason: detalhe pintura, rodas, chassi, embalagem.
- manufacturer reason: posição no mercado, acabamento, materiais.
- scale reason: raridade da escala, demanda.
- age reason: década, relevância histórica.`;

// =====================================================
// ML SYSTEM
// =====================================================
interface PromptVariant { variant_id: string; variant_name: string; prompt_snippet: string; }
interface LearnedPattern { pattern_type: string; trigger_condition: string; correction_prompt: string; effectiveness_score: number; }
interface RAGCorrection { original_brand: string; original_model: string; original_manufacturer: string; corrected_brand: string; corrected_model: string; corrected_manufacturer: string; visual_cues: string; }

// deno-lint-ignore no-explicit-any
async function getMLEnhancements(sb: any): Promise<{ variant: PromptVariant | null; patterns: LearnedPattern[]; corrections: RAGCorrection[]; }> {
  const safeRpc = async <T>(promise: Promise<{ data: T | null }>): Promise<T | null> => {
    try { return (await promise).data; } catch { return null; }
  };
  try {
    const [variantData, patternsData, correctionsData] = await Promise.all([
      safeRpc(sb.rpc('select_prompt_variant')),
      safeRpc(sb.rpc('get_active_patterns', { p_limit: 3 })),
      safeRpc(sb.rpc('get_relevant_corrections', { p_limit: 3 }))
    ]);
    return {
      variant: (variantData as PromptVariant[] | null)?.[0] || null,
      patterns: (patternsData as LearnedPattern[] | null) || [],
      corrections: (correctionsData as RAGCorrection[] | null) || []
    };
  } catch (e) {
    console.error("[ML] Error:", e);
    return { variant: null, patterns: [], corrections: [] };
  }
}

function buildDynamicPrompt(basePrompt: string, variant: PromptVariant | null, patterns: LearnedPattern[], corrections: RAGCorrection[]): string {
  let p = basePrompt;
  if (variant?.prompt_snippet) p += `\n\n🔬 MELHORIA:\n${variant.prompt_snippet}`;
  if (patterns.length > 0) p += `\n\n📊 PADRÕES:\n${patterns.map(x => `- ${x.correction_prompt}`).join('\n')}`;
  if (corrections.length > 0) {
    const ex = corrections.filter(c => c.original_manufacturer && c.corrected_manufacturer)
      .map(c => `- "${c.original_manufacturer}" → "${c.corrected_manufacturer}"${c.visual_cues ? ` (${c.visual_cues})` : ''}`).slice(0, 3).join('\n');
    if (ex) p += `\n\n🎯 CORREÇÕES:\n${ex}`;
  }
  return p;
}

// deno-lint-ignore no-explicit-any
function recordABResult(sb: any, variantId: string, itemId: string | null, userId: string | null, responseTimeMs: number, model: string) {
  // Fire-and-forget
  sb.rpc('record_ab_result', {
    p_variant_id: variantId, p_item_id: itemId, p_user_id: userId,
    p_was_successful: true, p_response_time_ms: responseTimeMs, p_model_used: model
  }).then(null, (e: unknown) => console.error("[ML] AB error:", e));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const { imageBase64, skipML } = await req.json();
    if (!imageBase64) return new Response(JSON.stringify({ error: "Image required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth check and ML enhancements in parallel
    const authPromise = (async () => {
      const auth = req.headers.get("authorization");
      if (auth) try { return (await sb.auth.getUser(auth.replace("Bearer ", ""))).data.user?.id || null; } catch {}
      return null;
    })();

    const mlPromise = skipML
      ? Promise.resolve({ variant: null, patterns: [], corrections: [] })
      : getMLEnhancements(sb);

    const [uid, { variant, patterns, corrections }] = await Promise.all([authPromise, mlPromise]);

    const dynamicPrompt = buildDynamicPrompt(BASE_PROMPT, variant, patterns, corrections);

    const isVid = imageBase64.startsWith("data:video/");

    // Sanitize and validate image data
    let imageUrl: string;
    if (imageBase64.startsWith("data:image/") || imageBase64.startsWith("data:video/")) {
      imageUrl = imageBase64;
    } else if (imageBase64.startsWith("data:")) {
      const base64Part = imageBase64.split(",")[1] || imageBase64;
      imageUrl = `data:image/jpeg;base64,${base64Part}`;
    } else {
      imageUrl = `data:image/jpeg;base64,${imageBase64}`;
    }

    // Validate base64 image is not corrupted/empty
    const commaIdx = imageUrl.indexOf(",");
    const base64Content = commaIdx >= 0 ? imageUrl.substring(commaIdx + 1) : "";
    if (base64Content.length < 100) {
      console.error("[Image] Base64 content too short:", base64Content.length, "chars. First 50:", imageUrl.substring(0, 50));
      return new Response(JSON.stringify({ error: "Image data is too small or corrupted. Please try capturing again." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.log(`[Image] Format OK. Base64 length: ${base64Content.length}, prefix: ${imageUrl.substring(0, 30)}`);

    const uPrompt = isVid
      ? "Analyze video of collectible cars (max 7)."
      : "Analyze image. Determine if collectible or real vehicle.";

    const PRIMARY_MODEL = "gpt-4o-mini";
    const FALLBACK_MODEL = "gpt-4o";

    const stripFences = (s: string) => s.replace(/```json\n?|\n?```/g, "").trim();

    // deno-lint-ignore no-explicit-any
    const shouldRetry = (r: any): boolean => {
      const detectedType = r?.detectedType || "collectible";
      if (detectedType === "real_car") return !r?.identified || !r?.car;
      const itemsLen = Array.isArray(r?.items) ? r.items.length : 0;
      const count = typeof r?.count === "number" ? r.count : itemsLen;
      if (!r?.identified || count === 0 || itemsLen === 0) return true;
      // Check if identification quality is poor (all "Desconhecido" or empty)
      const firstItem = r.items[0];
      const brand = firstItem?.realCar?.brand || firstItem?.car?.brand || "";
      const model = firstItem?.realCar?.model || firstItem?.car?.model || "";
      const unknowns = ["desconhecido", "unknown", "n/a", ""];
      if (unknowns.includes(brand.toLowerCase()) && unknowns.includes(model.toLowerCase())) return true;
      return false;
    };

    const fetchAndParse = async (model: string, attempt: number, reason: string) => {
      const isFallback = model === FALLBACK_MODEL;
      // Primary (gpt-4o-mini): use "low" for speed (~2-3s). Fallback (gpt-4o): use "auto" for quality.
      const imageDetail = isFallback ? "auto" : "low";
      const maxTokens = isFallback ? 3072 : 2048;
      const systemPrompt = isFallback ? dynamicPrompt + FALLBACK_PROMPT_EXTRA : dynamicPrompt;

      const messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: uPrompt },
            { type: "image_url", image_url: { url: imageUrl, detail: imageDetail } }
          ],
        },
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, response_format: { type: "json_object" } }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[OpenAI] Error ${res.status}:`, errorText);
        
        // Check for image_parse_error specifically
        try {
          const errJson = JSON.parse(errorText);
          if (errJson?.error?.code === "image_parse_error") {
            console.error(`[OpenAI] Image parse error. Image URL prefix: ${imageUrl.substring(0, 40)}, base64 length: ${base64Content.length}`);
            return { ok: false as const, httpResponse: new Response(JSON.stringify({ error: "A imagem não pôde ser processada. Tente capturar novamente com melhor iluminação." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
          }
        } catch { /* not JSON */ }
        
        if (res.status === 429) {
          return { ok: false as const, httpResponse: new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
        }
        if (res.status === 402 || res.status === 401) {
          return { ok: false as const, httpResponse: new Response(JSON.stringify({ error: "OpenAI API key invalid or quota exceeded." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
        }
        return { ok: false as const, error: new Error(`OpenAI error: ${res.status}`) };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      console.log(`[AI] Model=${model} Attempt=${attempt} Len=${content?.length || 0}`);
      if (!content) return { ok: false as const, error: new Error("No AI response") };

      const usage = data.usage || {};
      // Fire-and-forget logging
      logUsage(sb, uid, "analyze-collectible", model,
        usage.prompt_tokens || estimateTokens(systemPrompt + uPrompt, !isVid, isVid),
        usage.completion_tokens || estimateTokens(content),
        { type: isVid ? "video" : "image", attempt, reason, variant_id: variant?.variant_id || null }
      );

      try {
        return { ok: true as const, parsed: JSON.parse(stripFences(content)) };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e : new Error("Failed to parse") };
      }
    };

    let result: unknown;

    const primary = await fetchAndParse(PRIMARY_MODEL, 1, "primary");
    if (!primary.ok) {
      if ("httpResponse" in primary) return primary.httpResponse;
      console.error("[AI] Primary failed:", primary.error);
      const fallback = await fetchAndParse(FALLBACK_MODEL, 2, "primary_failed");
      if (!fallback.ok) {
        if ("httpResponse" in fallback) return fallback.httpResponse;
        throw fallback.error;
      }
      result = fallback.parsed;
    } else {
      result = primary.parsed;
      if (shouldRetry(result)) {
        const fallback = await fetchAndParse(FALLBACK_MODEL, 2, "not_identified");
        if (!fallback.ok) {
          if ("httpResponse" in fallback) return fallback.httpResponse;
        } else {
          // Always prefer fallback result (gpt-4o, higher quality) when primary failed shouldRetry
          result = fallback.parsed;
        }
      }
    }

    // Fire-and-forget A/B recording
    const responseTime = Date.now() - startTime;
    if (variant?.variant_id) {
      // deno-lint-ignore no-explicit-any
      const firstItemId = (result as any)?.items?.[0]?.id || null;
      recordABResult(sb, variant.variant_id, firstItemId, uid, responseTime, PRIMARY_MODEL);
    }

    // Server-side normalization: ensure standard keys exist
    // deno-lint-ignore no-explicit-any
    const r = result as any;
    
    // Map alternative keys to standard "items"
    if (!Array.isArray(r.items)) {
      const altKeys = ["vehicles", "carros", "results", "data", "collectibles", "miniatures"];
      for (const key of altKeys) {
        if (Array.isArray(r[key])) {
          r.items = r[key];
          delete r[key];
          break;
        }
      }
    }
    
    // Ensure required fields
    if (r.items && Array.isArray(r.items)) {
      r.count = r.count || r.items.length;
      r.identified = r.identified !== false && r.items.length > 0;
      r.detectedType = r.detectedType || "collectible";
    } else if (r.car && typeof r.car === "object") {
      r.identified = r.identified !== false;
      r.detectedType = "real_car";
    }

    const responseWithMeta = {
      ...(r as object),
      _ml_metadata: {
        variant_name: variant?.variant_name || "none",
        patterns_applied: patterns.length,
        corrections_used: corrections.length,
        response_time_ms: responseTime
      }
    };

    return new Response(JSON.stringify(responseWithMeta), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
