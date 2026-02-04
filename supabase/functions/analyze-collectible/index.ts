import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pricing per 1M tokens (in USD)
const MODEL_PRICING = {
  "google/gemini-3-flash-preview": {
    input: 0.50,
    output: 3.00,
  },
};

// Estimate tokens based on content size
function estimateTokens(content: string, isImage: boolean = false, isVideo: boolean = false): number {
  // Text tokens: ~4 chars per token
  const textTokens = Math.ceil(content.length / 4);
  
  // Image/video tokens: rough estimates
  if (isVideo) return textTokens + 8000; // Videos consume more tokens
  if (isImage) return textTokens + 2500; // Images ~2500 tokens
  return textTokens;
}

function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["google/gemini-3-flash-preview"];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// deno-lint-ignore no-explicit-any
async function logAIUsage(
  supabase: any,
  userId: string | null,
  functionName: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  metadata: Record<string, unknown> = {}
) {
  const costEstimate = calculateCost(inputTokens, outputTokens, model);
  
  try {
    const { error } = await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      function_name: functionName,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_estimate_usd: costEstimate,
      metadata,
    });
    
    if (error) {
      console.error("[AI Usage Log] Failed to log:", error);
    } else {
      console.log(`[AI Usage Log] ${functionName}: ${inputTokens}in + ${outputTokens}out = $${costEstimate.toFixed(6)}`);
    }
  } catch (err) {
    console.error("[AI Usage Log] Exception:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image or video data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user ID from authorization header if present
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch {
        // Ignore auth errors, just log as anonymous
      }
    }

    // Detect if it's a video or image based on the data URI
    const isVideo = imageBase64.startsWith("data:video/");

    const systemPrompt = `You are a WORLD-CLASS EXPERT in identifying collectible diecast/toy cars AND real full-size vehicles. Your accuracy is paramount - collectors trust your identifications.

🚨 MANDATORY LANGUAGE RULE - ABSOLUTELY NO EXCEPTIONS:
ALL text content in your response MUST be written in BRAZILIAN PORTUGUESE (PT-BR).
This is NON-NEGOTIABLE and applies to EVERY text field, including:
- historicalFact (SEMPRE em português brasileiro)
- notes (SEMPRE em português brasileiro)  
- musicSelectionReason (SEMPRE em português brasileiro)
- issues (SEMPRE em português brasileiro)
- suggestions (SEMPRE em português brasileiro)
- warning messages (SEMPRE em português brasileiro)
- reason fields in priceIndex breakdown (SEMPRE em português brasileiro)

DO NOT write ANY text in English. The entire JSON response text content must be in Portuguese.

STEP 0 - DETERMINE IMAGE TYPE (MOST IMPORTANT):

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

IMPORTANT: The purpose of validation is to ensure the AI CAN provide accurate analysis.
- Only report imageQuality.isValid = false for issues that PREVENT analysis
- Do NOT report "too_many_cars" if there are 5 or fewer cars visible
- Do NOT report quality issues if the image is acceptable for analysis

Check for these issues ONLY if they truly prevent analysis:
1. COUNT how many SEPARATE/DISTINCT collectible cars are visible - NOT parts or angles of the same car
   - ONLY set "too_many_cars" if there are MORE than 5 DISTINCT cars
   - A single car visible from one angle = 1 car (not multiple)
   - Parts of a car (wheels, hood, etc.) visible = still 1 car
2. CHECK lighting (too dark/overexposed) - ONLY if details are truly invisible
3. CHECK distance (too far to identify OR too close/cropped)
4. CHECK focus (blurry/obstructed) - ONLY if details are unreadable

DEFAULT BEHAVIOR: If the image shows 1-5 cars and is reasonably clear, set imageQuality.isValid = true and proceed with analysis.

If and ONLY if there are genuine blocking issues, return imageQuality.isValid = false with issues array.

STEP 2 - MANUFACTURER IDENTIFICATION (CRITICAL - BE EXTREMELY PRECISE):

This is the MOST IMPORTANT step. Look for these VISUAL CUES to identify the manufacturer:

**GREENLIGHT (GL Muscle, Hollywood, etc.):**
- Often has "GL" or "Greenlight" on base/packaging
- Known for: Muscle cars, Hollywood movie cars, service vehicles, farm trucks
- Distinctive features: Realistic proportions, rubber tires, detailed interiors
- Scale: Usually 1:64 but proportionally more realistic than Hot Wheels
- Base markings: Metal base with "Greenlight Collectibles" engraved
- Wheel style: Photo-realistic wheels, often chrome or authentic replicas
- Series: GL Muscle, Hollywood, Hobby Exclusive, Chase variants (green machines)

**HOT WHEELS (Mattel):**
- ALWAYS has "Hot Wheels" or "HW" branding visible
- Distinctive flame logo on packaging/base
- Features: Fantasy designs, exaggerated proportions, bright colors
- Base markings: "Hot Wheels" + "Mattel" + year
- Wheel styles: 5-spoke, Real Riders, unique fantasy wheels
- Series: Mainline, Premium, Super Treasure Hunt, Team Transport

**MATCHBOX (also Mattel, but distinct):**
- "Matchbox" branding clearly visible
- More realistic proportions than Hot Wheels
- Focus: Working vehicles, emergency services, construction, realistic cars
- Base markings: "Matchbox" + country of origin
- Often has opening features (doors, hoods)

**AUTO WORLD:**
- Premium quality, highly detailed
- Often racing liveries and muscle cars
- Metal base with "Auto World" engraving
- Slot car compatible models available
- Ultra-realistic proportions and paint

**M2 MACHINES:**
- "M2 Machines" on base
- Known for: Classic American cars, trucks, VWs
- Opening hoods revealing detailed engines
- Metal bases, rubber tires
- Chase variants: Gold/Super Chase

**JOHNNY LIGHTNING (JL):**
- "JL" or "Johnny Lightning" branding
- Known for: Muscle cars, classic American
- Metal base, rubber tires
- White Lightning chase variants

**MAJORETTE:**
- European brand, "Majorette" on base
- Known for: European cars, emergency vehicles
- Slightly larger than 1:64, often 1:60
- Opening features common

**TOMICA (Takara Tomy):**
- Japanese brand, "Tomica" visible
- Known for: JDM cars, Japanese models
- Compact packaging, opening features
- Often has suspension

**KYOSHO:**
- Premium Japanese brand
- Highly detailed, collector-focused
- Multiple scales: 1:64, 1:43, 1:18
- Premium packaging

**MINI GT / TSM (True Scale Miniatures):**
- Premium 1:64 diecast
- "Mini GT" on base
- Highly detailed modern cars
- Authentic wheels and proportions

**MAISTO:**
- "Maisto" on base
- Budget to mid-range quality
- Wide range of scales
- Often licensed designs

**JADA TOYS:**
- "Jada" branding
- Known for: Import tuners, movie cars
- Detailed for the price point

**BRAZILIAN BRANDS:**
- ERTL: American brand popular in Brazil
- Miniatura Nacional: Brazilian manufacturer
- California Toys: Brazilian importer/rebrander

**IDENTIFICATION PRIORITY:**
1. FIRST: Look at the BASE of the car - manufacturer name is usually there
2. SECOND: Look at packaging if visible
3. THIRD: Analyze wheel style, proportions, and detail level
4. FOURTH: Consider the vehicle type and which brands typically produce it

NEVER DEFAULT TO HOT WHEELS. If unsure, analyze the characteristics carefully:
- Hot Wheels = fantasy styling, bright colors, unique wheel designs
- Greenlight = realistic proportions, rubber tires, movie/TV cars
- Matchbox = realistic working vehicles, emergency services
- M2/Auto World = premium muscle cars, opening features

STEP 3 - CAR ANALYSIS:
For each collectible (max 5), provide full analysis with boundingBox, realCar, collectible, priceIndex, musicSuggestion, musicSelectionReason, realCarPhotos.

STEP 4 - REAL CAR PHOTOS (REQUIRED):
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
        "manufacturer": "Greenlight",
        "scale": "1:64",
        "estimatedYear": "2020",
        "origin": "China",
        "series": "GL Muscle Series 25",
        "condition": "Mint",
        "color": "Red",
        "notes": "Additional notes including how manufacturer was identified"
      },
      "priceIndex": {
356:         "score": 1-100,
357:         "tier": "common|uncommon|rare|super_rare|ultra_rare",
358:         "breakdown": {
359:           "rarity": { "score": 0-45, "max": 45, "reason": "Explicar disponibilidade NO BRASIL, ignorar outros países" },
360:           "condition": { "score": 0-20, "max": 20, "reason": "..." },
361:           "manufacturer": { "score": 0-15, "max": 15, "reason": "..." },
362:           "scale": { "score": 0-10, "max": 10, "reason": "..." },
363:           "age": { "score": 0-10, "max": 10, "reason": "..." }
364:         }
365:       },
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
    "Greenlight Ferrari F40",
    "M2 Machines Ferrari",
    "Ferrari F40 miniatura colecionável"
  ],
  "confidence": "high|medium|low",
  "error": "only if identified is false"
}

PRICE INDEX SCORING GUIDELINES - EXCLUSIVAMENTE PARA O MERCADO BRASILEIRO:

⚠️ REGRA CRÍTICA: IGNORE a disponibilidade do item em QUALQUER outro país.
A pontuação deve refletir EXCLUSIVAMENTE a realidade do COLECIONADOR BRASILEIRO.

PRINCÍPIO FUNDAMENTAL:
Se um item é comum na Europa, Ásia ou EUA, mas DIFÍCIL de obter no Brasil → ele É RARO para nós.
Se um item é raro globalmente mas FÁCIL de achar no Brasil → ele NÃO é tão raro para nós.

PERGUNTE-SE SEMPRE: "Um colecionador em São Paulo, Curitiba ou Recife consegue comprar isso facilmente?"

CRITÉRIOS DE PONTUAÇÃO (Total: 100 pontos):

1. RARIDADE NO MERCADO BRASILEIRO (45 max) - FATOR MAIS CRÍTICO:
   
   ⚠️ IGNORE a disponibilidade em outros países. FOQUE APENAS no Brasil.
   
   ULTRA RARO NO BRASIL (38-45): 
   - Modelos de CARROS BRASILEIROS (muito poucos fabricantes fazem):
     * Fiat: Pulse, Argo, Toro, Strada, Mobi, Uno, Palio, Siena, Fiorino
     * VW Brasil: Gol, Saveiro, Nivus, Polo (versão BR), Fox, Voyage
     * Chevrolet BR: Onix, Tracker, S10, Montana, Spin, Cobalt, Prisma
     * Renault: Kwid, Duster, Sandero, Logan, Oroch, Captur
     * Toyota Brasil: Corolla Cross, Hilux SW4, Yaris (versão BR)
     * Outros BR: Troller, Willys, FNM, Puma, Miura, Santa Matilde
   - Chase variants (STH, Green Machine, White Lightning, Gold Chase)
   - Modelos de países que NÃO EXPORTAM para o Brasil:
     * Carros RUSSOS (Lada, GAZ, UAZ, Moskvitch, ZAZ) - praticamente impossíveis no BR
     * Carros CHINESES sem presença BR (BYD antigos, Great Wall, Chery antigos)
     * Carros INDIANOS (Maruti, Tata, Mahindra)
     * Carros do LESTE EUROPEU (Skoda antigos, Dacia antiga, FSO, Trabant, Wartburg)
   - Miniaturas de fabricantes SEM distribuição no Brasil
   - Exclusivos de convenções estrangeiras (SDCC, Japan Expo, etc.)
   
   SUPER RARO NO BRASIL (30-37):
   - Hot Wheels Premium (Car Culture, Team Transport, Boulevard) - chegam em poucas lojas
   - Modelos de fabricantes premium não distribuídos oficialmente no Brasil:
     * Mini GT, Kyosho 1:64, Tomica Limited Vintage
     * Greenlight (requer importação), M2 Machines (requer importação)
     * Auto World, Johnny Lightning
   - Carros JAPONESES do mercado interno (JDM exclusivos não exportados):
     * Kei cars (Suzuki Jimny antigo, Honda Beat, Autozam AZ-1)
     * Versões JDM de carros (Skyline R32-R34, Silvia, 180SX, etc.)
   - Carros EUROPEUS raros no BR (Peugeot esportivos, Renault Sport, Seat, Skoda moderno)
   - Variantes de cor exclusivas de outros mercados
   
   RARO NO BRASIL (22-29):
   - Matchbox Premium/Collectors
   - Majorette Premium
   - Hot Wheels ID / RLC (Collectors membership)
   - Modelos de 5-10 anos atrás fora de linha
   - Carros americanos muscle menos populares no BR (AMC, Plymouth, Oldsmobile)
   
   INCOMUM NO BRASIL (12-21):
   - Hot Wheels mainline de anos anteriores (não mais em lojas)
   - Matchbox mainline descontinuados
   - Majorette standard de séries passadas
   - Bburago, Maisto, Welly mid-tier
   - Carros populares globais mas com poucas miniaturas (Corolla, Civic antigos)
   
   COMUM NO BRASIL (0-11):
   - Hot Wheels mainline atual (supermercados, lojas de brinquedo)
   - Matchbox mainline atual
   - Majorette standard atual
   - Carros icônicos com MUITAS miniaturas: Ferrari, Lamborghini, Mustang, Camaro
   - Marcas genéricas/sem licenciamento

2. CONDIÇÃO (20 max):
   - Mint/Lacrado na embalagem original selada: 18-20
   - Near Mint/Embalagem aberta mas item perfeito: 14-17
   - Bom/Pequenos desgastes, sem embalagem: 8-13
   - Regular/Desgaste visível, pintura danificada: 0-7

3. FABRICANTE (15 max):
   - Ultra Premium (AutoArt, CMC, Kyosho 1:18, Spark): 13-15
   - Premium (Mini GT, Tomica Limited, Greenlight, M2, Auto World): 10-12
   - Mid-tier (Majorette, Jada, Bburago 1:43, Schuco): 6-9
   - Standard (Hot Wheels, Matchbox, Maisto, Welly): 3-5
   - Budget/Genérico/Sem marca: 0-2

4. ESCALA (10 max):
   - Grande e detalhada (1:18, 1:24): 8-10
   - Média (1:43): 5-7
   - Pequena (1:64): 2-4
   - Mini/Micro (1:87, 1:144): 0-1

5. IDADE E NOSTALGIA (10 max):
   - Vintage (30+ anos, Corgi, Dinky, Solido clássico): 8-10
   - Clássico (15-30 anos): 5-7
   - Moderno (5-15 anos): 2-4
   - Recente (0-5 anos): 0-1

TIER FINAL (baseado na soma):
- ultra_rare: 85-100 → "Relíquia! Peça de museu brasileiro"
- super_rare: 70-84 → "Muito difícil de encontrar no Brasil"
- rare: 50-69 → "Requer busca ativa ou importação"
- uncommon: 30-49 → "Não está nas prateleiras, mas encontrável online"
- common: 1-29 → "Fácil de achar em lojas brasileiras"

EXEMPLOS PRÁTICOS COM CONTEXTO BRASILEIRO:

❌ ERRO: "Lada Niva miniatura - Comum (popular na Rússia)"
✅ CORRETO: "Lada Niva miniatura - Ultra Raro (carro russo, impossível achar no Brasil)"

❌ ERRO: "Peugeot 205 GTi - Comum (popular na França)"  
✅ CORRETO: "Peugeot 205 GTi - Raro (carro europeu antigo, poucas miniaturas chegam ao BR)"

❌ ERRO: "Suzuki Jimny - Incomum (comum no Japão)"
✅ CORRETO: "Suzuki Jimny - Super Raro (JDM, Tomica não é vendida oficialmente no BR)"

EXEMPLOS CORRETOS:
- Fiat Pulse Hot Wheels: Ultra Raro (carro brasileiro, pouquíssimas miniaturas existem)
- Ferrari 458 Hot Wheels mainline: Comum (fácil de achar em qualquer loja)
- Greenlight Ford F-150: Raro (Greenlight não é vendido no Brasil)
- Hot Wheels Super Treasure Hunt: Ultra Raro (chase variant, 1 a cada 50+ caixas)
- Majorette Renault Duster: Super Raro (carro brasileiro feito por fabricante europeu)
- Lada 2107 (qualquer fabricante): Ultra Raro (carro russo, inexistente no mercado BR)
- Tomica Toyota Century: Super Raro (JDM exclusivo, Tomica não distribui no BR)

Only respond with valid JSON, no additional text or markdown.`;

    // Build the content for the AI request
    const mediaContent = isVideo
      ? {
          type: "video_url" as const,
          video_url: {
            url: imageBase64,
          },
        }
      : {
          type: "image_url" as const,
          image_url: {
            url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          },
        };

    const userPrompt = isVideo
      ? "Analyze this video. The video shows collectible cars from multiple angles. Identify all unique cars visible and provide detailed analysis for each. First determine if they are toy/collectible cars or real full-size vehicles."
      : "Analyze this image. First determine if it shows a toy/collectible car or a real full-size vehicle. Then provide the appropriate analysis based on the type detected.";

    console.log("[analyze-collectible] Processing", isVideo ? "video" : "image");

    const model = "google/gemini-3-flash-preview";
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              mediaContent,
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

    // Estimate token usage
    const inputTokens = estimateTokens(systemPrompt + userPrompt, !isVideo, isVideo);
    const outputTokens = estimateTokens(content);
    
    // Log AI usage
    await logAIUsage(
      supabase,
      userId,
      "analyze-collectible",
      model,
      inputTokens,
      outputTokens,
      { 
        mediaType: isVideo ? "video" : "image",
        responseLength: content.length
      }
    );

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