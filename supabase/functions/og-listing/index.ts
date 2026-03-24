import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const listingId = url.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing listing id", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: listing } = await supabase
    .from("listings")
    .select("title, price, currency, image_url, description, source_name")
    .eq("id", listingId)
    .single();

  // Fallback values
  const title = listing?.title || "Miniatura na Paddock";
  const description = listing?.description || listing?.title || "Veja este anúncio na Paddock";
  const imageUrl = listing?.image_url || "";
  const price = listing
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: listing.currency || "BRL" }).format(listing.price)
    : "";

  const ogTitle = price ? `${title} — ${price}` : title;
  const ogDescription = `${description.substring(0, 150)}${description.length > 150 ? "..." : ""}`;

  // The actual SPA URL the user should be redirected to
  const siteOrigin = Deno.env.get("SITE_URL") || "https://paddock-collectible-hub.lovable.app";
  const redirectUrl = `${siteOrigin}/listing/${listingId}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ""}
  <meta property="og:url" content="${escapeHtml(redirectUrl)}" />
  <meta property="og:site_name" content="Paddock" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""}

  <!-- Redirect real users to the SPA -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
</head>
<body>
  <p>Redirecionando para <a href="${escapeHtml(redirectUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
