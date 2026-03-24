import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Known crawler user-agents that need OG meta tags
const CRAWLER_PATTERNS = [
  "whatsapp",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "telegrambot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "googlebot",
  "bingbot",
  "yandexbot",
  "applebot",
  "pinterestbot",
  "redditbot",
  "embedly",
  "showyoubot",
  "outbrain",
  "quora link preview",
  "rogerbot",
  "vkshare",
  "w3c_validator",
];

function isCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CRAWLER_PATTERNS.some((pattern) => ua.includes(pattern));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestUrl = new URL(req.url);
  const listingId = requestUrl.searchParams.get("id");

  if (!listingId) {
    return new Response("Missing listing id", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteOrigin = (Deno.env.get("SITE_URL") || "https://paddockonline.com").replace(/\/$/, "");
  const canonicalUrl = `${siteOrigin}/listing/${listingId}`;
  const redirectUrl = `${siteOrigin}/?listing=${encodeURIComponent(listingId)}`;

  // For real browsers: just redirect immediately with 302
  const userAgent = req.headers.get("user-agent") || "";
  if (!isCrawler(userAgent)) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  }

  // For crawlers: serve OG meta tags
  if (!supabaseUrl || !supabaseKey) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: listing } = await supabase
    .from("listings")
    .select("title, price, currency, image_url, description")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  }

  const title = listing.title || "Miniatura na Paddock";
  const rawDesc = listing.description || listing.title || "Veja este anúncio na Paddock";
  const firstLine = rawDesc.split("\n")[0].trim();
  const ogDescription = firstLine.length > 150 ? firstLine.substring(0, 147) + "..." : firstLine;
  const imageUrl = listing.image_url || "";
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: listing.currency || "BRL",
  }).format(listing.price);

  const ogTitle = `${title} - ${price}`;

  const imageMeta = imageUrl
    ? `<meta property="og:image" content="${safeAttr(imageUrl)}" />\n  <meta name="twitter:image" content="${safeAttr(imageUrl)}" />`
    : "";

  const html = [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${safeText(ogTitle)}</title>`,
    '  <meta property="og:type" content="product" />',
    `  <meta property="og:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta property="og:description" content="${safeAttr(ogDescription)}" />`,
    imageMeta,
    `  <meta property="og:url" content="${safeAttr(redirectUrl)}" />`,
    '  <meta property="og:site_name" content="Paddock" />',
    '  <meta name="twitter:card" content="summary_large_image" />',
    `  <meta name="twitter:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta name="twitter:description" content="${safeAttr(ogDescription)}" />`,
    "</head>",
    "<body></body>",
    "</html>",
  ].join("\n");

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

function safeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
