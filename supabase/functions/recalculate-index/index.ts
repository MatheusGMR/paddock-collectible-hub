import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PROMPT = `Você avalia miniaturas colecionáveis (diecast) e devolve um índice de raridade de 0 a 100, em PT-BR.
Critérios (score, max, reason em cada):
- rarity (máx 35): tiragem/produção. Unidade única, numerada, chase, Super Treasure Hunt, edição de convenção = alto. Mainline comum de varejo = no máximo 12.
- exclusivity (máx 15): edição especial, licenciada ou homenagem (celebridades como Elvis Presley, filmes, pilotos); importado sem venda oficial no Brasil pontua mais.
- condition (máx 15): estado informado (sem informação = 10).
- manufacturer (máx 15): reputação/acabamento do fabricante.
- scale (máx 10): raridade da escala.
- age (máx 10): idade e relevância histórica.
Regras de piso: unidade única ou numerada => score total >= 70. Unidade única + edição especial licenciada => >= 85.
As informações do dono são verdadeiras e têm prioridade.
Responda só JSON: {"score":N,"breakdown":{"rarity":{"score":N,"max":35,"reason":"..."},"exclusivity":{...},"condition":{...},"manufacturer":{...},"scale":{...},"age":{...}}}`;

const tierOf = (s: number) => s >= 85 ? "ultra_rare" : s >= 70 ? "super_rare" : s >= 50 ? "rare" : s >= 30 ? "uncommon" : "common";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body.collectionIds) ? body.collectionIds.filter((x: unknown) => typeof x === "string").slice(0, 300) : undefined;
    const all = body.all === true;
    if (!all && (!ids || ids.length === 0)) return json({ error: "Informe collectionIds ou all" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let q = admin.from("user_collection").select("id, notes, user_context, item:items(*)").eq("user_id", user.id);
    if (!all) q = q.in("id", ids!);
    const { data: rows, error } = await q;
    if (error) throw error;

    const key = Deno.env.get("OPENAI_API_KEY")!;
    const results: { id: string; score?: number; error?: string }[] = [];
    const queue = [...(rows ?? [])];

    const worker = async () => {
      while (queue.length) {
        const r = queue.shift()!;
        const it = r.item as Record<string, unknown> | null;
        if (!it) continue;
        try {
          const desc = {
            carro: `${it.real_car_brand} ${it.real_car_model} ${it.real_car_year ?? ""}`,
            fabricante: it.collectible_manufacturer, escala: it.collectible_scale, ano_miniatura: it.collectible_year,
            origem: it.collectible_origin, serie: it.collectible_series, condicao: it.collectible_condition,
            cor: it.collectible_color, observacoes: it.collectible_notes, notas_do_dono: r.notes,
            informacoes_do_dono: r.user_context ?? null,
          };
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4.1-mini", temperature: 0.1, response_format: { type: "json_object" },
              messages: [{ role: "system", content: PROMPT }, { role: "user", content: JSON.stringify(desc) }],
            }),
          });
          if (!res.ok) throw new Error(`IA ${res.status}`);
          const out = JSON.parse((await res.json()).choices[0].message.content);
          const bd = out.breakdown ?? {};
          let score = ["rarity", "exclusivity", "condition", "manufacturer", "scale", "age"]
            .reduce((a, k) => a + Math.max(0, Math.min(Number(bd[k]?.score) || 0, Number(bd[k]?.max) || 0)), 0);
          const ctx = (r.user_context ?? {}) as Record<string, unknown>;
          if (ctx.unique && ctx.special_edition) score = Math.max(score, 85);
          else if (ctx.unique || ctx.numbered) score = Math.max(score, 70);
          score = Math.min(100, Math.round(score));
          const { error: upErr } = await admin.from("items")
            .update({ price_index: score, rarity_tier: tierOf(score), index_breakdown: bd }).eq("id", it.id as string);
          if (upErr) throw upErr;
          results.push({ id: r.id, score });
        } catch (e) {
          results.push({ id: r.id, error: (e as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
