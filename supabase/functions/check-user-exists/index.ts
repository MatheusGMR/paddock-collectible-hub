const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use RPC to check auth.users via a database function
    // First try using the PostgREST endpoint to query profiles + auth
    // Most efficient: use raw SQL via the /rest/v1/rpc endpoint
    
    // Query using the admin users API with proper filtering
    // GoTrue v2 supports filtering via query params
    const encodedEmail = encodeURIComponent(email.toLowerCase());
    const res = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodedEmail}`,
      {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!res.ok) {
      // Fallback: list recent users and search
      console.log('Filter not supported, falling back to list search');
      
      const fallbackRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=500`,
        {
          method: 'GET',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );
      
      if (!fallbackRes.ok) {
        return new Response(
          JSON.stringify({ exists: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const usersData = await fallbackRes.json();
      const users = usersData.users || [];
      const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      
      return respondWithUser(found, supabaseUrl, serviceRoleKey, corsHeaders);
    }

    const usersData = await res.json();
    const users = usersData.users || [];
    // Double-check exact email match (filter might be partial)
    const found = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    return respondWithUser(found, supabaseUrl, serviceRoleKey, corsHeaders);
  } catch (error) {
    console.error('Check user error:', error);
    return new Response(
      JSON.stringify({ exists: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function respondWithUser(
  found: any | undefined,
  supabaseUrl: string,
  serviceRoleKey: string,
  headers: Record<string, string>
) {
  if (!found) {
    return new Response(
      JSON.stringify({ exists: false }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch profile data
  let profile = null;
  try {
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${found.id}&select=username,avatar_url`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (profileRes.ok) {
      const profiles = await profileRes.json();
      if (profiles.length > 0) {
        profile = profiles[0];
      }
    }
  } catch {
    // Profile fetch is best-effort
  }

  const name = found.user_metadata?.name || found.user_metadata?.full_name || null;

  return new Response(
    JSON.stringify({ exists: true, profile, name }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}
