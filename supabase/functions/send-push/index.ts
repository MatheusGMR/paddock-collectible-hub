import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { admin, sendToUsers } from "../_shared/push.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Admin only
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const db = admin();
    const { data: isAdmin } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const action = body.action || "send";

    if (action === "preview") {
      const { data } = await db.rpc("get_push_audience", { p_audience: body.audience || { type: "all" } });
      return json({ count: (data || []).length });
    }

    if (action === "send_campaign") {
      const { data: c } = await db.from("push_campaigns").select("*").eq("id", body.campaign_id).single();
      if (!c) return json({ error: "Campanha não encontrada" }, 404);
      await db.from("push_campaigns").update({ status: "sending" }).eq("id", c.id);
      const { data: aud } = await db.rpc("get_push_audience", { p_audience: c.audience });
      const ids = (aud || []).map((r: any) => r.user_id);
      const r = await sendToUsers(ids, { title: c.title, body: c.body, url: c.url, image: c.image_url, tag: `campaign-${c.id}` }, { campaignId: c.id });
      await db.from("push_campaigns").update({
        status: "sent", sent_at: new Date().toISOString(), target_count: ids.length,
        sent_count: c.sent_count + r.sent, failed_count: c.failed_count + r.failed,
      }).eq("id", c.id);
      return json({ success: true, ...r, target: ids.length });
    }

    // Quick send (legacy form / individual push)
    const { title, body: text, url, image, topic, user_ids } = body;
    if (!title || !text) return json({ error: "title e body obrigatórios" }, 400);
    const audience = user_ids?.length ? { type: "users", user_ids } : topic ? { type: "topic", topic } : { type: "all" };
    const { data: aud } = await db.rpc("get_push_audience", { p_audience: audience });
    const r = await sendToUsers((aud || []).map((x: any) => x.user_id), { title, body: text, url: url || "/", image });
    return json({ success: true, ...r });
  } catch (e) {
    console.error("[send-push]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
