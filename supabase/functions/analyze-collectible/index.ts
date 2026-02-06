import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_PRICING = { "gpt-4o": { input: 2.50, output: 10.00 } };

function estimateTokens(content: string, isImage = false, isVideo = false): number {
  const t = Math.ceil(content.length / 4);
  return isVideo ? t + 8000 : isImage ? t + 2500 : t;
}

function calculateCost(i: number, o: number): number {
  const p = MODEL_PRICING["gpt-4o"];
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

const PROMPT = `Especialista em carrinhos colecionáveis diecast E veículos reais.

🚨 REGRA OBRIGATÓRIA DE IDIOMA: TODO o conteúdo gerado DEVE estar em PORTUGUÊS BRASILEIRO.
- historicalFact: fato histórico em português
- musicSuggestion: "Nome da Música - Artista" 
- musicSelectionReason: explicação em português sobre por que essa música combina
- musicListeningTip: dica nostálgica/sensorial em português de como curtir a música
- notes: observações em português
- condition: "Excelente", "Muito Bom", "Bom", "Regular", "Ruim"
- origin: "Brasil", "EUA", "China", "Japão", "Tailândia", etc.

PASSO 0: Determinar tipo:
A) COLECIONÁVEL: Modelo em escala (1:64/1:43/1:24), miniatura diecast/plástico
B) CARRO_REAL: Veículo em tamanho real em ambiente real (estacionamento, rua, garagem)

---
SE COLECIONÁVEL:

🚨 REGRAS ABSOLUTAS - SEMPRE IDENTIFICAR:
1. Se você vê QUALQUER formato de carro miniatura → identified=true, forneça sua MELHOR ESTIMATIVA
2. NUNCA rejeite por: reflexos, brilho, sombras, desfoque, pouca luz, embalagem blister
3. Reflexos em blisters, vitrines ou pintura brilhante são condições NORMAIS
4. Mesmo com visibilidade parcial → IDENTIFIQUE com as informações disponíveis
5. "Baixa confiança" NÃO é motivo para rejeitar - dê seu melhor palpite com identified=true
6. Só defina identified=false se a imagem não mostrar NENHUMA parte de veículo reconhecível

Conte apenas carros físicos separados (máx 7). Ignore reflexos/sombras como duplicados.

🚨 ANÁLISE INDEPENDENTE CRÍTICA:
- Analise CADA carro separadamente - fabricantes diferentes podem estar na mesma foto!
- Verifique a BASE de cada carro individualmente
- NUNCA assuma que todos os carros têm o mesmo fabricante

Fabricantes: GREENLIGHT (realista, pneus de borracha), HOT WHEELS (fantasia, cores vibrantes, frequentemente com chamas/gráficos), MATCHBOX (realista funcional), M2 (americanos clássicos), MAJORETTE (europeus), TOMICA (JDM), MINI GT (premium 1:64), AUTO WORLD, JOHNNY LIGHTNING, MAISTO/JADA/WELLY.

Para cada (máx 7): boundingBox{x,y,width,height em %}, realCar{brand,model,year,historicalFact}, collectible{manufacturer,scale,year,origin,series,condition,color,notes}, priceIndex{score,tier,breakdown}, musicSuggestion, musicSelectionReason, musicListeningTip.

priceIndex (apenas Brasil, 100pts): rarity(máx 45)-carros BR ultra raros; condition(máx 20); manufacturer(máx 15); scale(máx 10); age(máx 10).
Tiers: ultra_rare(85+), super_rare(70-84), rare(50-69), uncommon(30-49), common(<30).

---
SE CARRO_REAL: Retorne {identified:true, detectedType:"real_car", car:{brand,model,year,variant,bodyStyle,color}, searchTerms[], confidence}.

VERIFICAÇÃO FINAL CRÍTICA:
- Você definiu identified=true? Se pode ver QUALQUER veículo → SIM
- Você forneceu array items com pelo menos 1 item? Se colecionável → SIM
- NUNCA retorne array items vazio se você viu um carro

Apenas JSON, sem markdown.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return new Response(JSON.stringify({ error: "Image required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let uid: string | null = null;
    const auth = req.headers.get("authorization");
    if (auth) try { uid = (await sb.auth.getUser(auth.replace("Bearer ", ""))).data.user?.id || null; } catch {}

    const isVid = imageBase64.startsWith("data:video/");
    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const uPrompt = isVid
      ? "Analyze video of collectible cars (max 7)."
      : "Analyze image. Determine if collectible or real vehicle.";

    const PRIMARY_MODEL = "gpt-4o";
    const FALLBACK_MODEL = "gpt-4o"; // Same model for retry

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
      const messages = [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: isVid
            ? [
                { type: "text", text: uPrompt },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
              ]
            : [
                { type: "text", text: uPrompt },
                { type: "image_url", image_url: { url: imageUrl, detail: "high" } }
              ],
        },
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[OpenAI] Error ${res.status}:`, errorText);
        
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
        if (res.status === 402 || res.status === 401) {
          return {
            ok: false as const,
            httpResponse: new Response(
              JSON.stringify({ error: "OpenAI API key invalid or quota exceeded." }),
              {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            ),
          };
        }
        return { ok: false as const, error: new Error(`OpenAI error: ${res.status}`) };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return { ok: false as const, error: new Error("No AI response") };

      const usage = data.usage || {};
      await logUsage(
        sb,
        uid,
        "analyze-collectible",
        model,
        usage.prompt_tokens || estimateTokens(PROMPT + uPrompt, !isVid, isVid),
        usage.completion_tokens || estimateTokens(content),
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

    // If identification failed, retry once
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
