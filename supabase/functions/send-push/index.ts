const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── APNs JWT Token Generation ──────────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  const binary = Array.from(data).map(b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64Url(text: string): string {
  return base64UrlEncode(new TextEncoder().encode(text));
}

async function importAPNsKey(pemKey: string): Promise<CryptoKey> {
  // Strip PEM headers and whitespace
  const stripped = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(stripped), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function createAPNsJWT(keyId: string, teamId: string, privateKey: string): Promise<string> {
  const header = { alg: 'ES256', kid: keyId };
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: teamId, iat: now };

  const headerB64 = textToBase64Url(JSON.stringify(header));
  const claimsB64 = textToBase64Url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${claimsB64}`;

  const key = await importAPNsKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format expected by JWT
  const sigBytes = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(sigBytes);

  return `${signingInput}.${signatureB64}`;
}

// Cache JWT token (valid for ~1 hour)
let cachedJWT: { token: string; createdAt: number } | null = null;

async function getAPNsJWT(): Promise<string> {
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  const authKey = Deno.env.get('APNS_AUTH_KEY');

  if (!keyId || !teamId || !authKey) {
    throw new Error('APNs credentials not configured (APNS_KEY_ID, APNS_TEAM_ID, APNS_AUTH_KEY)');
  }

  // Reuse token if less than 50 minutes old
  if (cachedJWT && (Date.now() - cachedJWT.createdAt) < 50 * 60 * 1000) {
    return cachedJWT.token;
  }

  const token = await createAPNsJWT(keyId, teamId, authKey);
  cachedJWT = { token, createdAt: Date.now() };
  return token;
}

// ─── APNs Push Sender ───────────────────────────────────────────

const APNS_HOST = 'https://api.push.apple.com';
const APP_BUNDLE_ID = 'app.lovable.ec82142056a94147adde54a8d514aaac';

async function sendAPNsPush(
  deviceToken: string,
  payload: { title: string; body: string; image?: string; url?: string; articleId?: string; tag?: string }
): Promise<boolean> {
  try {
    const jwt = await getAPNsJWT();

    const apnsPayload = {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        sound: 'default',
        badge: 1,
        'mutable-content': 1,
        'thread-id': payload.tag || 'paddock',
      },
      // Custom data accessible in app
      url: payload.url,
      articleId: payload.articleId,
      image: payload.image,
    };

    const response = await fetch(`${APNS_HOST}/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        'authorization': `bearer ${jwt}`,
        'apns-topic': APP_BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(apnsPayload),
    });

    if (response.status === 200) {
      console.log(`[APNs] Push sent to ${deviceToken.substring(0, 8)}...`);
      return true;
    }

    const errorBody = await response.text();
    console.error(`[APNs] Push failed (${response.status}):`, errorBody);

    // 410 = token is no longer valid (uninstalled)
    if (response.status === 410) {
      console.log(`[APNs] Token expired/unregistered: ${deviceToken.substring(0, 8)}...`);
    }

    return false;
  } catch (error) {
    console.error('[APNs] Send error:', error);
    return false;
  }
}

// ─── Web Push Sender ────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payloadString,
    });

    if (!response.ok && response.status !== 201) {
      console.error(`[WebPush] Failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[WebPush] Send error:', error);
    return false;
  }
}

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, image, url, topic, articleId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get all subscriptions (web + native)
    let subscriptionsUrl = `${supabaseUrl}/rest/v1/push_subscriptions?select=*`;
    if (topic) {
      subscriptionsUrl += `&topics=cs.{${topic}}`;
    }

    const subsRes = await fetch(subscriptionsUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    const subscriptions = await subsRes.json();

    // Separate native (APNs) from web subscriptions
    const nativeSubs = subscriptions.filter((s: any) => s.endpoint.startsWith('native://'));
    const webSubs = subscriptions.filter((s: any) => !s.endpoint.startsWith('native://'));

    console.log(`Found ${nativeSubs.length} native + ${webSubs.length} web subscriptions for topic: ${topic || 'all'}`);

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, native: 0, web: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = {
      title: title || 'Paddock',
      body: body || 'Nova notícia!',
      image,
      url: url || '/mercado',
      articleId,
      tag: `paddock-${topic || 'news'}`,
    };

    // ─── Create in-app notifications for each unique user ────
    const uniqueUserIds = [...new Set(subscriptions.map((s: any) => s.user_id).filter(Boolean))];
    if (uniqueUserIds.length > 0) {
      const notificationRows = uniqueUserIds.map((uid: string) => ({
        user_id: uid,
        actor_id: uid, // self-referencing since it's a system notification
        type: 'push',
        message: `${payload.title}: ${payload.body}`,
        is_read: false,
      }));

      const insertRes = await fetch(
        `${supabaseUrl}/rest/v1/notifications`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(notificationRows),
        }
      );

      if (!insertRes.ok) {
        console.error('[Push] Failed to create in-app notifications:', await insertRes.text());
      } else {
        console.log(`[Push] Created ${uniqueUserIds.length} in-app notifications`);
      }
    }

    let sentNative = 0;
    let sentWeb = 0;
    let failed = 0;
    const toDelete: string[] = [];

    // ─── Send to native (APNs) subscriptions ─────────────
    for (const sub of nativeSubs) {
      // Extract device token from endpoint: native://ios/<token>
      const match = sub.endpoint.match(/^native:\/\/(ios|android)\/(.+)$/);
      if (!match) {
        console.warn(`[Push] Invalid native endpoint: ${sub.endpoint}`);
        toDelete.push(sub.id);
        failed++;
        continue;
      }

      const [, platform, deviceToken] = match;

      if (platform === 'ios') {
        const success = await sendAPNsPush(deviceToken, payload);
        if (success) {
          sentNative++;
        } else {
          failed++;
          toDelete.push(sub.id);
        }
      } else {
        // Android FCM - not yet implemented
        console.log(`[Push] Android FCM not yet supported, skipping token`);
      }
    }

    // ─── Send to web subscriptions ───────────────────────
    for (const sub of webSubs) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      );

      if (success) {
        sentWeb++;
      } else {
        failed++;
        toDelete.push(sub.id);
      }
    }

    // ─── Cleanup invalid subscriptions ───────────────────
    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
      }
      console.log(`[Push] Cleaned up ${toDelete.length} invalid subscriptions`);
    }

    const totalSent = sentNative + sentWeb;
    console.log(`[Push] Sent: ${totalSent} (native: ${sentNative}, web: ${sentWeb}), failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, native: sentNative, web: sentWeb, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Push] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
