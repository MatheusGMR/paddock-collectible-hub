import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const listingId = requestUrl.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing listing id", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response("Server configuration error", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: listing } = await supabase
    .from("listings")
    .select("title, price, currency, image_url, description")
    .eq("id", listingId)
    .maybeSingle();

  const title = listing?.title || "Miniatura na Paddock";
  const rawDesc = listing?.description || listing?.title || "Veja este anuncio na Paddock";
  // Clean description: take first line only, limit to 150 chars
  const firstLine = rawDesc.split("\n")[0].trim();
  const ogDescription = firstLine.length > 150 ? firstLine.substring(0, 147) + "..." : firstLine;
  const imageUrl = listing?.image_url || "";
  const price = listing
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: listing.currency || "BRL",
      }).format(listing.price)
    : "";

  const ogTitle = price ? `${title} - ${price}` : title;

  const siteOrigin = (Deno.env.get("SITE_URL") || "https://paddock-collectible-hub.lovable.app").replace(/\/$/, "");
  const redirectUrl = `${siteOrigin}/listing/${listingId}`;

  // Build HTML manually to avoid escaping issues
  const imageMeta = imageUrl
    ? `<meta property="og:image" content="${imageUrl}" />\n  <meta name="twitter:image" content="${imageUrl}" />`
    : "";

  const html = [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width,initial-scale=1" />',
    `  <title>${safeText(ogTitle)}</title>`,
    "",
    '  <meta property="og:type" content="product" />',
    `  <meta property="og:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta property="og:description" content="${safeAttr(ogDescription)}" />`,
    imageMeta,
    `  <meta property="og:url" content="${safeAttr(redirectUrl)}" />`,
    '  <meta property="og:site_name" content="Paddock" />',
    "",
    '  <meta name="twitter:card" content="summary_large_image" />',
    `  <meta name="twitter:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta name="twitter:description" content="${safeAttr(ogDescription)}" />`,
    "",
    `  <meta http-equiv="refresh" content="0;url=${safeAttr(redirectUrl)}" />`,
    "</head>",
    "<body>",
    `  <p>Redirecionando...</p>`,
    `  <script>window.location.replace("${safeJS(redirectUrl)}");</script>`,
    "</body>",
    "</html>",
  ].join("\n");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

/** Escape text content (between tags) */
function safeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape for use inside HTML attribute values (already inside double quotes) */
function safeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape for use inside a JS string literal (already inside double quotes) */
function safeJS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}
