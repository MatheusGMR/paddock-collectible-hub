// Runs every few minutes: sends due scheduled campaigns and automatic triggers.
// Idempotent: every automatic delivery uses a unique (trigger_key, ref_key).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, sendToUsers } from "../_shared/push.ts";

const DAY = 86400000;
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const db = admin();
  const log: Record<string, number> = {};
  try {
    // 1) Scheduled campaigns
    const { data: due } = await db.from("push_campaigns").select("*")
      .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString());
    for (const c of due || []) {
      const { data: locked } = await db.from("push_campaigns").update({ status: "sending" })
        .eq("id", c.id).eq("status", "scheduled").select("id");
      if (!locked?.length) continue;
      const { data: aud } = await db.rpc("get_push_audience", { p_audience: c.audience });
      const ids = (aud || []).map((r: any) => r.user_id);
      const r = await sendToUsers(ids, { title: c.title, body: c.body, url: c.url, image: c.image_url, tag: `campaign-${c.id}` }, { campaignId: c.id });
      await db.from("push_campaigns").update({ status: "sent", sent_at: new Date().toISOString(), target_count: ids.length, sent_count: r.sent, failed_count: r.failed }).eq("id", c.id);
      log.campaigns = (log.campaigns || 0) + 1;
    }

    // 2) Automatic triggers
    const { data: trigs } = await db.from("push_triggers").select("*").eq("enabled", true);
    const T = new Map((trigs || []).map((t: any) => [t.key, t]));
    const { data: settings } = await db.from("push_settings").select("*").eq("id", 1).single();
    const hourBR = (new Date().getUTCHours() + 21) % 24;
    const q0 = settings?.quiet_start ?? 22, q1 = settings?.quiet_end ?? 8;
    const quiet = q0 > q1 ? hourBR >= q0 || hourBR < q1 : hourBR >= q0 && hourBR < q1;
    const maxPerDay = settings?.max_per_day ?? 3;

    const underCap = async (uid: string) => {
      const { count } = await db.from("push_deliveries").select("id", { count: "exact", head: true })
        .eq("user_id", uid).not("trigger_key", "is", null).gte("created_at", new Date(Date.now() - DAY).toISOString());
      return (count ?? 0) < maxPerDay;
    };
    const fire = async (key: string, uid: string | null | undefined, ref: string, vars: Record<string, string> = {}, bypass = false) => {
      const t: any = T.get(key);
      if (!t || !uid) return;
      if (!bypass && (quiet || !(await underCap(uid)))) return;
      const r = await sendToUsers([uid], { title: fill(t.title, vars), body: fill(t.body, vars), url: t.url, tag: key }, { triggerKey: key, refKey: ref });
      if (r.sent) {
        await db.from("push_triggers").update({ sent_count: t.sent_count + r.sent }).eq("key", key);
        t.sent_count += r.sent;
        log[key] = (log[key] || 0) + r.sent;
      }
    };
    const names = async (ids: string[]) => {
      const { data } = await db.from("profiles").select("user_id, username").in("user_id", [...new Set(ids)]);
      return new Map((data || []).map((p: any) => [p.user_id, `@${p.username}`]));
    };

    // Event triggers since last scan (max 1 day back)
    const since = new Date(Math.max(new Date(settings?.last_event_scan ?? 0).getTime(), Date.now() - DAY)).toISOString();
    const scanAt = new Date().toISOString();

    const { data: notifs } = await db.from("notifications").select("id,user_id,actor_id,type")
      .in("type", ["like", "comment", "follow"]).gte("created_at", since).limit(500);
    const { data: msgs } = await db.from("messages").select("id,sender_id,conversation_id").gte("created_at", since).limit(500);
    const actorNames = await names([...(notifs || []).map((n: any) => n.actor_id), ...(msgs || []).map((m: any) => m.sender_id)]);
    for (const n of notifs || []) if (n.user_id !== n.actor_id) await fire(n.type, n.user_id, n.id, { actor: actorNames.get(n.actor_id) || "Alguém" });
    for (const m of msgs || []) {
      const { data: parts } = await db.from("conversation_participants").select("user_id").eq("conversation_id", m.conversation_id).neq("user_id", m.sender_id);
      for (const p of parts || []) await fire("message", p.user_id, `${m.id}:${p.user_id}`, { actor: actorNames.get(m.sender_id) || "Alguém" }, true);
    }

    const recent = new Date(Date.now() - 30 * DAY).toISOString();
    const { data: sales } = await db.from("sales").select("id,seller_id,buyer_id,shipping_status,listings(title)")
      .in("status", ["completed", "paid_out"]).gte("created_at", recent).limit(500);
    for (const s of sales || []) {
      const listing = (s as any).listings?.title || "Seu item";
      await fire("sale", s.seller_id, s.id, { listing }, true);
      if (["in_transit", "shipped", "delivered"].includes(s.shipping_status)) await fire("shipped", s.buyer_id, s.id, { listing }, true);
    }

    if (T.has("new_listing")) {
      const { data: ls } = await db.from("listings").select("id,user_id,title").eq("status", "active").not("user_id", "is", null).gte("created_at", since).limit(100);
      const sellerNames = await names((ls || []).map((l: any) => l.user_id));
      for (const l of ls || []) {
        const { data: fol } = await db.from("follows").select("follower_id").eq("following_id", l.user_id);
        for (const f of fol || []) await fire("new_listing", f.follower_id, `${l.id}:${f.follower_id}`, { actor: sellerNames.get(l.user_id) || "Uma loja", listing: l.title });
      }
    }
    await db.from("push_settings").update({ last_event_scan: scanAt }).eq("id", 1);

    // Time-based triggers
    if (!quiet) {
      const { data: newbies } = await db.from("profiles").select("user_id").gte("created_at", new Date(Date.now() - 2 * DAY).toISOString());
      for (const p of newbies || []) await fire("welcome", p.user_id, p.user_id);

      const { data: subs } = await db.from("user_subscriptions").select("user_id,status,trial_ends_at,challenge_completed_at").in("status", ["trial", "expired"]);
      for (const s of subs || []) {
        const left = new Date(s.trial_ends_at).getTime() - Date.now();
        if (s.status === "trial" && left > 0 && left < 2 * DAY) await fire("trial_ending", s.user_id, `${s.user_id}:${s.trial_ends_at}`);
        if (left <= 0 && left > -2 * DAY) await fire("trial_ended", s.user_id, `${s.user_id}:${s.trial_ends_at}`);
      }
      const { data: done } = await db.from("user_subscriptions").select("user_id").not("challenge_completed_at", "is", null).gte("challenge_completed_at", new Date(Date.now() - 2 * DAY).toISOString());
      for (const s of done || []) await fire("challenge_done", s.user_id, s.user_id);

      if (T.has("challenge_near")) {
        const { data: open } = await db.from("user_subscriptions").select("user_id,challenge_target").is("challenge_completed_at", null);
        for (const s of open || []) {
          const { count } = await db.from("user_collection").select("id", { count: "exact", head: true }).eq("user_id", s.user_id);
          const target = s.challenge_target || 50;
          if ((count ?? 0) >= target - 5 && (count ?? 0) < target) await fire("challenge_near", s.user_id, s.user_id);
        }
      }

      for (const days of [7, 14, 30]) {
        const key = `inactive_${days}`;
        if (!T.has(key)) continue;
        const { data: aud } = await db.rpc("get_push_audience", { p_audience: { type: "inactive", days } });
        const weekTag = Math.floor(Date.now() / (7 * DAY));
        for (const r of (aud || []).slice(0, 300)) await fire(key, r.user_id, `${r.user_id}:${weekTag}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, ...log }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[push-scheduler]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
