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
    .select("title, price, currency, image_url, description, item_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  }

  let item: Record<string, unknown> | null = null;
  if (listing.item_id) {
    const { data } = await supabase
      .from("items")
      .select("real_car_brand, real_car_model, real_car_year, collectible_manufacturer, collectible_scale, real_car_photos")
      .eq("id", listing.item_id)
      .maybeSingle();
    item = data as Record<string, unknown> | null;
  }

  const title = listing.title || "Miniatura na Paddock";
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: listing.currency || "BRL",
  }).format(listing.price);

  const brand = (item?.real_car_brand as string) || "";
  const model = (item?.real_car_model as string) || "";
  const carYear = (item?.real_car_year as string | number) || "";
  const manufacturer = (item?.collectible_manufacturer as string) || "";
  const scale = (item?.collectible_scale as string) || "";

  const carLine = brand ? `${[brand, model].filter(Boolean).join(" ")}${carYear ? ` (${carYear})` : ""}` : "";
  const makerLine = manufacturer ? `${manufacturer}${scale ? ` • Escala ${scale}` : ""}` : "";

  const rawDesc = [carLine, makerLine].filter(Boolean).join(" • ") ||
    (listing.description || listing.title || "Veja este anúncio na Paddock").split("\n")[0].trim();
  const descWithPrice = `${rawDesc} — ${price}`;
  const ogDescription = descWithPrice.length > 160 ? descWithPrice.substring(0, 157) + "..." : descWithPrice;

  const photos = Array.isArray(item?.real_car_photos) ? (item?.real_car_photos as string[]) : [];
  const imageUrl = listing.image_url || photos.find((p) => typeof p === "string" && p.startsWith("http")) || "";

  const ogTitle = `${title}${brand ? ` • ${brand}` : ""} - ${price}`;

  const imageMeta = imageUrl
    ? [
        `  <meta property="og:image" content="${safeAttr(imageUrl)}" />`,
        `  <meta property="og:image:secure_url" content="${safeAttr(imageUrl)}" />`,
        '  <meta property="og:image:width" content="1200" />',
        '  <meta property="og:image:height" content="1200" />',
        `  <meta property="og:image:alt" content="${safeAttr(title)}" />`,
        `  <meta name="twitter:image" content="${safeAttr(imageUrl)}" />`,
      ].join("\n")
    : "";

  const html = [
    "<!DOCTYPE html>",
    '<html lang="pt-BR">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${safeText(ogTitle)}</title>`,
    `  <meta name="description" content="${safeAttr(ogDescription)}" />`,
    '  <meta property="og:type" content="product" />',
    `  <meta property="og:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta property="og:description" content="${safeAttr(ogDescription)}" />`,
    imageMeta,
    `  <meta property="product:price:amount" content="${safeAttr(String(listing.price))}" />`,
    `  <meta property="product:price:currency" content="${safeAttr(listing.currency || "BRL")}" />`,
    `  <meta property="og:url" content="${safeAttr(redirectUrl)}" />`,
    '  <meta property="og:site_name" content="Paddock" />',
    '  <meta name="twitter:card" content="summary_large_image" />',
    `  <meta name="twitter:title" content="${safeAttr(ogTitle)}" />`,
    `  <meta name="twitter:description" content="${safeAttr(ogDescription)}" />`,
    "</head>",
    `<body><p>${safeText(ogTitle)}</p></body>`,
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
