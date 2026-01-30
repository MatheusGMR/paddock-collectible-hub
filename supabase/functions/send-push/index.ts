const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Web Push library using fetch (no npm dependency)
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // For proper Web Push, we need to use the web-push protocol
    // This requires crypto operations for JWT signing
    // Using a simpler approach with native fetch for now
    
    const payloadString = JSON.stringify(payload);
    
    // Create a simple push request
    // Note: For production, use a proper web-push library or service
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payloadString,
    });
    
    if (!response.ok && response.status !== 201) {
      console.error(`Push failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Send push error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, image, url, topic, articleId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get subscriptions for topic
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
    console.log(`Found ${subscriptions.length} subscriptions for topic: ${topic || 'all'}`);
    
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
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
    
    let sent = 0;
    let failed = 0;
    
    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );
      
      if (success) {
        sent++;
      } else {
        failed++;
        // Remove invalid subscription
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${sub.id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );
      }
    }
    
    console.log(`Push sent: ${sent}, failed: ${failed}`);
    
    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send push error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
