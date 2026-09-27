// Shared push delivery: Web Push (VAPID, encrypted) + APNs (native iOS).
import webpush from "npm:web-push@3.6.7";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const admin = (): SupabaseClient =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(
    "mailto:contato@paddockonline.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  vapidReady = true;
}

// ─── APNs ───
const b64url = (d: Uint8Array) =>
  btoa(Array.from(d).map((b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let cachedJWT: { token: string; at: number } | null = null;
async function apnsJWT(): Promise<string> {
  const keyId = Deno.env.get("APNS_KEY_ID"), teamId = Deno.env.get("APNS_TEAM_ID"), pem = Deno.env.get("APNS_AUTH_KEY");
  if (!keyId || !teamId || !pem) throw new Error("APNs not configured");
  if (cachedJWT && Date.now() - cachedJWT.at < 50 * 60 * 1000) return cachedJWT.token;
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der.buffer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const input = `${enc({ alg: "ES256", kid: keyId })}.${enc({ iss: teamId, iat: Math.floor(Date.now() / 1000) })}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(input)));
  cachedJWT = { token: `${input}.${b64url(sig)}`, at: Date.now() };
  return cachedJWT.token;
}
async function sendAPNs(token: string, p: PushPayload): Promise<"ok" | "gone" | "fail"> {
  try {
    const res = await fetch(`https://api.push.apple.com/3/device/${token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${await apnsJWT()}`,
        "apns-topic": "app.lovable.ec82142056a94147adde54a8d514aaac",
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: { alert: { title: p.title, body: p.body }, sound: "default", badge: 1, "mutable-content": 1, "thread-id": p.tag || "paddock" },
        url: p.url, image: p.image, deliveryId: p.deliveryId,
      }),
    });
    if (res.ok) return "ok";
    console.error("[APNs]", res.status, await res.text());
    return res.status === 410 || res.status === 400 ? "gone" : "fail";
  } catch (e) {
    console.error("[APNs] error", e);
    return "fail";
  }
}

export interface PushPayload { title: string; body: string; url?: string; image?: string | null; tag?: string; deliveryId?: string }
export interface SendOpts { campaignId?: string; triggerKey?: string; refKey?: string; inApp?: boolean }

/** Sends one payload to each user (all of their devices). Returns sent/failed user counts. */
export async function sendToUsers(userIds: string[], base: PushPayload, opts: SendOpts = {}) {
  ensureVapid();
  const db = admin();
  const ids = [...new Set(userIds.filter(Boolean))];
  let sent = 0, failed = 0;
  if (!ids.length) return { sent, failed };

  const { data: subs } = await db.from("push_subscriptions").select("*").in("user_id", ids);
  const byUser = new Map<string, any[]>();
  for (const s of subs || []) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]);
  const gone: string[] = [];

  for (const uid of ids) {
    const devices = byUser.get(uid) || [];
    if (!devices.length) continue;
    const { data: delivery, error } = await db.from("push_deliveries")
      .insert({ user_id: uid, campaign_id: opts.campaignId ?? null, trigger_key: opts.triggerKey ?? null, ref_key: opts.refKey ?? null })
      .select("id").single();
    if (error) continue; // duplicate ref_key → already delivered
    const url = base.url || "/";
    const payload = { ...base, url: `${url}${url.includes("?") ? "&" : "?"}pd=${delivery.id}`, deliveryId: delivery.id };

    let ok = false;
    for (const d of devices) {
      const m = String(d.endpoint).match(/^native:\/\/(ios|android)\/(.+)$/);
      if (m) {
        if (m[1] !== "ios") continue;
        const r = await sendAPNs(m[2], payload);
        if (r === "ok") ok = true; else if (r === "gone") gone.push(d.id);
      } else {
        try {
          await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(payload), { TTL: 86400 });
          ok = true;
        } catch (e: any) {
          console.error("[WebPush]", e?.statusCode, e?.body);
          if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(d.id);
        }
      }
    }
    await db.from("push_deliveries").update({ status: ok ? "sent" : "failed" }).eq("id", delivery.id);
    ok ? sent++ : failed++;
    if (ok && opts.inApp !== false) {
      await db.from("notifications").insert({ user_id: uid, actor_id: uid, type: "push", message: `${base.title}: ${base.body}` });
    }
  }
  if (gone.length) await db.from("push_subscriptions").delete().in("id", gone);
  return { sent, failed };
}
