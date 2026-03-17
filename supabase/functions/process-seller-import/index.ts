import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, content } = await req.json();

    if (!content) {
      return new Response(JSON.stringify({ error: "Content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const auth = req.headers.get("authorization");
    let uid: string | null = null;
    if (auth) {
      try {
        const { data } = await sb.auth.getUser(auth.replace("Bearer ", ""));
        uid = data.user?.id || null;
      } catch { /* ignore */ }
    }

    const isImage = type === "image";

    const systemPrompt = `Você é um especialista em carrinhos colecionáveis diecast. 
Sua tarefa é extrair uma lista estruturada de miniaturas/colecionáveis a partir de dados fornecidos (planilha CSV, texto descritivo, ou imagem de catálogo/inventário).

Para CADA item identificado, extraia:
- title: título descritivo do produto (ex: "Hot Wheels Ferrari F40 1:64")
- brand: marca do carro real (ex: "Ferrari")
- model: modelo do carro real (ex: "F40")
- year: ano do carro real se disponível
- manufacturer: fabricante da miniatura (ex: "Hot Wheels", "Matchbox")
- scale: escala (ex: "1:64", "1:43")
- condition: condição se mencionada
- color: cor se mencionada
- suggestedPrice: preço sugerido em BRL (número). Estime baseado em mercado brasileiro se não informado.
- currency: "BRL"
- notes: observações adicionais
${isImage ? `- boundingBox: objeto com {x, y, width, height} em PORCENTAGEM (0-100) da imagem original indicando a região aproximada onde este item aparece na foto. Se a imagem mostrar múltiplos carros, identifique a posição de cada um. Se houver apenas um carro, use {x: 0, y: 0, width: 100, height: 100}. Seja o mais preciso possível na localização.` : ""}

Responda APENAS em JSON:
{"items": [{title, brand, model, year, manufacturer, scale, condition, color, suggestedPrice, currency, notes${isImage ? ", boundingBox" : ""}}]}

Se não encontrar nenhum item, retorne {"items": [], "error": "Nenhum item identificado"}.
Máximo 50 itens por vez.`;

    let messages;

    if (isImage) {
      let imageUrl = content;
      if (!content.startsWith("data:")) {
        imageUrl = `data:image/jpeg;base64,${content}`;
      }

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia todos os itens colecionáveis desta imagem de catálogo/inventário/planilha. Para cada item, forneça as coordenadas aproximadas (boundingBox em porcentagem) de onde ele aparece na imagem." },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extraia todos os itens colecionáveis do seguinte ${type === "csv" ? "CSV" : "texto"}:\n\n${content.substring(0, 15000)}`,
        },
      ];
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[OpenAI] Error:", errText);
      throw new Error(`OpenAI error: ${res.status}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No AI response");

    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());

    const usage = data.usage || {};
    sb.from("ai_usage_logs").insert({
      user_id: uid,
      function_name: "process-seller-import",
      model: "gpt-4o",
      input_tokens: usage.prompt_tokens || 0,
      output_tokens: usage.completion_tokens || 0,
      cost_estimate_usd: ((usage.prompt_tokens || 0) / 1e6) * 2.5 + ((usage.completion_tokens || 0) / 1e6) * 10,
      metadata: { type, items_found: parsed?.items?.length || 0 },
    }).then(null, (e: unknown) => console.error("[Log]", e));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
