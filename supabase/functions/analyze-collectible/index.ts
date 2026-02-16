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
async function logUsage(sb: any, uid: string | null, fn: string, m: string, i: number, o: number, meta: Record<string, unknown> = {}) {
  try {
    await sb.from("ai_usage_logs").insert({
      user_id: uid, function_name: fn, model: m,
      input_tokens: i, output_tokens: o,
      cost_estimate_usd: calculateCost(i, o, m), metadata: meta,
    });
  } catch (e) { console.error("[Log]", e); }
}

// =====================================================
// BASE PROMPT - Core identification instructions
// =====================================================
const BASE_PROMPT = `Especialista apaixonado em carrinhos colecionáveis diecast E veículos reais. Você é um historiador automotivo, curador de memórias e DJ nostálgico.

🚨 REGRA OBRIGATÓRIA DE IDIOMA: TODO o conteúdo gerado DEVE estar em PORTUGUÊS BRASILEIRO.

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

📜 FATO HISTÓRICO (historicalFact) - ESSENCIAL:
Escreva um fato histórico RICO e FASCINANTE sobre o carro real (2-3 frases). Explore:
- Histórias de bastidores: desenvolvimento secreto, protótipos rejeitados, apostas ousadas da montadora
- Recordes e conquistas: vitórias em corridas, marcos de produção, inovações tecnológicas pioneiras  
- Conexões culturais: aparições icônicas em filmes/séries, donos famosos, momentos históricos
- Curiosidades surpreendentes: apelidos populares, lendas urbanas, fatos pouco conhecidos
- Impacto social: como mudou a indústria, influenciou gerações, marcou uma época
Evite fatos genéricos. Busque o extraordinário, o inesperado, o que faz os olhos brilharem.

🎵 SUGESTÃO MUSICAL (musicSuggestion):
Formato EXATO: "Nome da Música - Artista (Ano)" ou "Nome da Música - Artista"
Escolha músicas que tenham conexão PROFUNDA com o veículo através de:
- Trilhas sonoras de filmes/séries onde o carro apareceu
- Músicas da época de lançamento do modelo que capturam o espírito da era
- Canções que mencionam o carro, a marca ou o estilo de vida associado
- Hits que tocavam nas rádios quando esse carro dominava as ruas
- Músicas de artistas do país de origem do veículo que combinam com sua personalidade

🎭 POR QUE ESSA MÚSICA (musicSelectionReason) - CONTE UMA HISTÓRIA:
Escreva uma explicação EMOCIONAL e ENVOLVENTE (2-4 frases) conectando a música ao carro. Explore:
- "Essa música tocava nas rádios em [ano] quando o [modelo] era o sonho de consumo..."
- "Na cena icônica de [filme], um [modelo] atravessa a tela enquanto [música] explode nos alto-falantes..."
- "[Artista] compôs essa música inspirado nos [muscle cars/esportivos] que via nas ruas de [cidade]..."
- "Os donos de [modelo] nos anos [década] tinham essa música como hino, tocando nas fitas K7..."
- "A batida de [música] captura perfeitamente a essência [rebelde/elegante/aventureira] do [modelo]..."
Faça o leitor SENTIR a conexão, não apenas entendê-la.

💫 COMO CURTIR (musicListeningTip) - TRANSPORTE O LEITOR:
Crie uma experiência SENSORIAL e NOSTÁLGICA (2-3 frases). Misture:
- Aromas: "...com cheiro de couro novo misturado com gasolina de posto antigo"
- Sabores: "...enquanto saboreia um guaraná gelado comprado na beira da estrada"
- Cenários: "...imaginando o vento batendo no rosto numa estrada vazia ao pôr do sol"
- Tácteis: "...sentindo o volante fino de madeira sob as mãos"
- Memórias afetivas: "...lembrando das viagens de família para a praia nos anos 80"
- Referências pop: "...como se estivesse dentro de um episódio de [série/filme]"
- Humor sutil: "...com óculos escuros mesmo dentro de casa, porque sim"
Seja criativo, poético e levemente humorístico. Evite clichês.

priceIndex (apenas Brasil, 100pts): rarity(máx 45)-carros BR ultra raros; condition(máx 20); manufacturer(máx 15); scale(máx 10); age(máx 10).
Tiers: ultra_rare(85+), super_rare(70-84), rare(50-69), uncommon(30-49), common(<30).

condition: "Excelente", "Muito Bom", "Bom", "Regular", "Ruim"
origin: "Brasil", "EUA", "China", "Japão", "Tailândia", etc.

---
SE CARRO_REAL: Retorne {identified:true, detectedType:"real_car", car:{brand,model,year,variant,bodyStyle,color}, searchTerms[], confidence}.

VERIFICAÇÃO FINAL CRÍTICA:
- Você definiu identified=true? Se pode ver QUALQUER veículo → SIM
- Você forneceu array items com pelo menos 1 item? Se colecionável → SIM
- NUNCA retorne array items vazio se você viu um carro

Apenas JSON, sem markdown.`;

// =====================================================
// ML SYSTEM - Build dynamic prompt with learned patterns
// =====================================================
interface PromptVariant {
  variant_id: string;
  variant_name: string;
  prompt_snippet: string;
}

interface LearnedPattern {
  pattern_type: string;
  trigger_condition: string;
  correction_prompt: string;
  effectiveness_score: number;
}

interface RAGCorrection {
  original_brand: string;
  original_model: string;
  original_manufacturer: string;
  corrected_brand: string;
  corrected_model: string;
  corrected_manufacturer: string;
  visual_cues: string;
}

// deno-lint-ignore no-explicit-any
async function getMLEnhancements(sb: any): Promise<{
  variant: PromptVariant | null;
  patterns: LearnedPattern[];
  corrections: RAGCorrection[];
}> {
  // Helper to safely execute RPC calls
  const safeRpc = async <T>(promise: Promise<{ data: T | null }>): Promise<T | null> => {
    try {
      const result = await promise;
      return result.data;
    } catch {
      return null;
    }
  };

  try {
    // OPTIMIZATION: Run all 3 ML queries in parallel
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
    console.error("[ML] Error fetching enhancements:", e);
    return { variant: null, patterns: [], corrections: [] };
  }
}

function buildDynamicPrompt(
  basePrompt: string,
  variant: PromptVariant | null,
  patterns: LearnedPattern[],
  corrections: RAGCorrection[]
): string {
  let enhancedPrompt = basePrompt;

  // Add A/B test variant snippet
  if (variant?.prompt_snippet) {
    enhancedPrompt += `\n\n🔬 MELHORIA EXPERIMENTAL:\n${variant.prompt_snippet}`;
  }

  // Add learned patterns
  if (patterns.length > 0) {
    const patternSnippets = patterns
      .map(p => `- ${p.correction_prompt}`)
      .join('\n');
    enhancedPrompt += `\n\n📊 PADRÕES APRENDIDOS (baseado em erros anteriores):\n${patternSnippets}`;
  }

  // Add RAG corrections as examples
  if (corrections.length > 0) {
    const correctionExamples = corrections
      .filter(c => c.original_manufacturer && c.corrected_manufacturer)
      .map(c => {
        const cues = c.visual_cues ? ` (${c.visual_cues})` : '';
        return `- "${c.original_manufacturer}" na verdade era "${c.corrected_manufacturer}"${cues}`;
      })
      .slice(0, 3)
      .join('\n');
    
    if (correctionExamples) {
      enhancedPrompt += `\n\n🎯 CORREÇÕES RECENTES DE USUÁRIOS (aprenda com esses erros!):\n${correctionExamples}`;
    }
  }

  return enhancedPrompt;
}

// deno-lint-ignore no-explicit-any
async function recordABResult(sb: any, variantId: string, itemId: string | null, userId: string | null, responseTimeMs: number, model: string) {
  try {
    await sb.rpc('record_ab_result', {
      p_variant_id: variantId,
      p_item_id: itemId,
      p_user_id: userId,
      p_was_successful: true, // Will be updated by feedback
      p_response_time_ms: responseTimeMs,
      p_model_used: model
    });
  } catch (e) {
    console.error("[ML] Error recording A/B result:", e);
  }
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

    // OPTIMIZATION: Auth check and ML enhancements in parallel
    const authPromise = (async () => {
      const auth = req.headers.get("authorization");
      if (auth) try { return (await sb.auth.getUser(auth.replace("Bearer ", ""))).data.user?.id || null; } catch {}
      return null;
    })();

    // Skip ML enhancements if requested (faster scan for subsequent scans)
    const mlPromise = skipML 
      ? Promise.resolve({ variant: null, patterns: [], corrections: [] })
      : getMLEnhancements(sb);

    const [uid, { variant, patterns, corrections }] = await Promise.all([authPromise, mlPromise]);
    
    const dynamicPrompt = buildDynamicPrompt(BASE_PROMPT, variant, patterns, corrections);

    const isVid = imageBase64.startsWith("data:video/");
    const imageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const uPrompt = isVid
      ? "Analyze video of collectible cars (max 7)."
      : "Analyze image. Determine if collectible or real vehicle.";

    const PRIMARY_MODEL = "gpt-4o-mini";
    const FALLBACK_MODEL = "gpt-4o";

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
      const imageDetail = model === "gpt-4o-mini" ? "auto" : "high";
      const messages = [
        { role: "system", content: dynamicPrompt },
        {
          role: "user",
          content: isVid
            ? [
                { type: "text", text: uPrompt },
                { type: "image_url", image_url: { url: imageUrl, detail: imageDetail } }
              ]
            : [
                { type: "text", text: uPrompt },
                { type: "image_url", image_url: { url: imageUrl, detail: imageDetail } }
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
          max_tokens: model === "gpt-4o-mini" ? 2048 : 4096,
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
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            ),
          };
        }
        if (res.status === 402 || res.status === 401) {
          return {
            ok: false as const,
            httpResponse: new Response(
              JSON.stringify({ error: "OpenAI API key invalid or quota exceeded." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            ),
          };
        }
        return { ok: false as const, error: new Error(`OpenAI error: ${res.status}`) };
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      console.log(`[AI] Model=${model} Attempt=${attempt} Response length=${content?.length || 0}`);
      if (content) {
        // Log first 500 chars to help debug identification issues
        console.log(`[AI] Response preview: ${content.substring(0, 500)}`);
      }
      if (!content) return { ok: false as const, error: new Error("No AI response") };

      const usage = data.usage || {};
      await logUsage(
        sb, uid, "analyze-collectible", model,
        usage.prompt_tokens || estimateTokens(dynamicPrompt + uPrompt, !isVid, isVid),
        usage.completion_tokens || estimateTokens(content),
        { 
          type: isVid ? "video" : "image", 
          attempt, 
          reason,
          variant_id: variant?.variant_id || null,
          variant_name: variant?.variant_name || "none",
          patterns_used: patterns.length,
          corrections_used: corrections.length
        }
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
    } else {
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
    }

    // =====================================================
    // ML: Record A/B test result
    // =====================================================
    const responseTime = Date.now() - startTime;
    if (variant?.variant_id) {
      // Get first item ID if available
      // deno-lint-ignore no-explicit-any
      const firstItemId = (result as any)?.items?.[0]?.id || null;
      await recordABResult(sb, variant.variant_id, firstItemId, uid, responseTime, PRIMARY_MODEL);
    }

    // Add ML metadata to response
    const responseWithMeta = {
      ...(result as object),
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
