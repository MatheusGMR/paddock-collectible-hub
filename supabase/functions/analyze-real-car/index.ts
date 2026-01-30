import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RealCarAnalysisResponse {
  identified: boolean;
  car: {
    brand: string;
    model: string;
    year: string;
    variant: string;
    bodyStyle: string;
    color: string;
  } | null;
  searchTerms: string[];
  confidence: "high" | "medium" | "low";
  error?: string;
}

const systemPrompt = `Você é um especialista em identificação de carros reais (veículos em tamanho normal, NÃO miniaturas ou carrinhos de brinquedo).

Analise a imagem enviada e identifique o carro REAL que aparece na foto.

IMPORTANTE:
- Você está analisando fotos de CARROS REAIS (em tamanho real), não miniaturas
- Se a foto mostrar um carro de brinquedo/miniatura em vez de um carro real, ainda assim identifique o veículo que ele representa
- Foque em identificar marca, modelo e ano do veículo
- Para carros brasileiros (Fiat, Volkswagen, Chevrolet, etc), considere versões nacionais

Responda APENAS com um objeto JSON válido (sem markdown, sem código):

Se conseguir identificar o carro:
{
  "identified": true,
  "car": {
    "brand": "Marca (ex: Ferrari, Porsche, Toyota, Volkswagen, Fiat)",
    "model": "Modelo (ex: 250 GTO, 911 Turbo, Supra, Fusca, Argo, Uno)",
    "year": "Ano ou década aproximada (ex: 1962, Anos 90, 2020)",
    "variant": "Variante se aplicável (ex: GT3 RS, Type R, GTI, Trekking, HGT) ou string vazia",
    "bodyStyle": "Tipo de carroceria (Sedan, Coupe, SUV, Hatchback, Conversível, Pickup, etc)",
    "color": "Cor do veículo na foto"
  },
  "searchTerms": [
    "MARCA MODELO miniatura" (ex: "Fiat Argo miniatura"),
    "MARCA MODELO diecast" (ex: "Fiat Argo diecast"),  
    "MARCA MODELO hot wheels" (ex: "Fiat Argo hot wheels"),
    "MARCA miniatura escala" (ex: "Fiat miniatura escala"),
    "MODELO miniatura colecionável" (ex: "Argo miniatura colecionável")
  ],
  "confidence": "high" | "medium" | "low"
}

IMPORTANTE para searchTerms:
- Gere 5 termos de busca variados para maximizar chances de encontrar miniaturas
- Inclua variações com "miniatura", "diecast", "hot wheels", "escala 1:64", "colecionável"
- Use português brasileiro
- Para marcas populares no Brasil, inclua termos específicos

Se NÃO conseguir identificar:
{
  "identified": false,
  "car": null,
  "searchTerms": [],
  "confidence": "low",
  "error": "Motivo pelo qual não foi possível identificar (ex: imagem muito escura, nenhum carro visível, etc)"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ 
          identified: false, 
          car: null, 
          searchTerms: [],
          confidence: "low",
          error: "No image provided" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          identified: false, 
          car: null, 
          searchTerms: [],
          confidence: "low",
          error: "AI service not configured" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Remove data URL prefix if present
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log("[analyze-real-car] Sending image to Gemini for analysis...");

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
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Identifique o carro real nesta imagem e sugira termos de busca para encontrar miniaturas deste veículo.",
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[analyze-real-car] AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            identified: false, 
            car: null, 
            searchTerms: [],
            confidence: "low",
            error: "Rate limit exceeded. Please try again later." 
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          identified: false, 
          car: null, 
          searchTerms: [],
          confidence: "low",
          error: "AI analysis failed" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[analyze-real-car] Empty response from AI");
      return new Response(
        JSON.stringify({ 
          identified: false, 
          car: null, 
          searchTerms: [],
          confidence: "low",
          error: "Empty response from AI" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[analyze-real-car] AI response:", content);

    // Parse the JSON response
    let analysisResult: RealCarAnalysisResponse;
    try {
      // Clean up potential markdown formatting
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[analyze-real-car] Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ 
          identified: false, 
          car: null, 
          searchTerms: [],
          confidence: "low",
          error: "Failed to parse AI response" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("[analyze-real-car] Successfully parsed result:", analysisResult);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[analyze-real-car] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        identified: false, 
        car: null, 
        searchTerms: [],
        confidence: "low",
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
