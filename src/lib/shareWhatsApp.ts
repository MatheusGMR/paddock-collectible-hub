import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the OG-friendly URL for a listing.
 * WhatsApp crawlers will hit this URL and get proper OG meta tags (image, title, etc.),
 * then real users are redirected to the SPA listing page.
 */
export const getListingShareUrl = (listingId: string): string => {
  const encodedId = encodeURIComponent(listingId);
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Prefer project-id based URL (most robust across domains/environments)
  if (projectId) {
    return `https://${projectId}.supabase.co/functions/v1/og-listing?id=${encodedId}`;
  }

  // Fallback to URL variable when available
  if (supabaseUrl) {
    return `${supabaseUrl}/functions/v1/og-listing?id=${encodedId}`;
  }

  // Last-resort fallback — use direct listing URL
  return `https://paddockonline.com/listing/${listingId}`;
};

/**
 * Compartilha texto via WhatsApp.
 * Tenta abrir o WhatsApp diretamente; se falhar (ex.: iframe),
 * copia o texto e mostra um toast com link manual.
 */
export const shareViaWhatsApp = async (text: string) => {
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  // Tenta usar Web Share API (funciona bem em mobile)
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      // usuário cancelou ou não suportado, continua abaixo
    }
  }

  // Tenta abrir em nova aba
  const w = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

  // Se popup foi bloqueado, copia texto e mostra toast com link
  if (!w || w.closed) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensagem copiada!", {
        description: "Cole no WhatsApp para enviar.",
        action: {
          label: "Abrir WhatsApp",
          onClick: () => {
            window.location.href = whatsappUrl;
          },
        },
        duration: 8000,
      });
    } catch {
      // fallback: navega diretamente
      window.location.href = whatsappUrl;
    }
  }
};

interface ListingShareInfo {
  id: string;
  title: string;
  price: number;
  currency?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | string | null;
  manufacturer?: string | null;
  scale?: string | null;
  imageUrl?: string | null;
}

const formatBRL = (price: number, currency?: string | null) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(price || 0);

/** Mensagem padrão de venda: nome, marca, preço e link com prévia da imagem. */
export const buildListingShareText = (listing: ListingShareInfo): string => {
  const url = getListingShareUrl(listing.id);
  const carLine = listing.brand
    ? `🚗 ${[listing.brand, listing.model].filter(Boolean).join(" ")}${listing.year ? ` (${listing.year})` : ""}`
    : null;
  const makerLine = listing.manufacturer
    ? `🏭 ${listing.manufacturer}${listing.scale ? ` • Escala ${listing.scale}` : ""}`
    : null;

  return [
    `🏎️ *${listing.title}*`,
    carLine,
    makerLine,
    `💰 *${formatBRL(listing.price, listing.currency)}*`,
    "",
    "Compre com segurança na Paddock:",
    `👉 ${url}`,
  ]
    .filter(Boolean)
    .join("\n");
};

/**
 * Compartilha um anúncio no WhatsApp buscando marca/modelo/fabricante do item.
 * O link aponta para a página com meta tags (imagem, nome e preço na prévia).
 */
export const shareListingViaWhatsApp = async (listing: {
  id: string;
  title: string;
  price: number;
  currency?: string | null;
  image_url?: string | null;
  item_id?: string | null;
}) => {
  let details: Partial<ListingShareInfo> = {};

  try {
    let itemId = listing.item_id ?? null;
    if (!itemId) {
      const { data } = await supabase
        .from("listings")
        .select("item_id")
        .eq("id", listing.id)
        .maybeSingle();
      itemId = data?.item_id ?? null;
    }

    if (itemId) {
      const { data: item } = await supabase
        .from("items")
        .select("real_car_brand, real_car_model, real_car_year, collectible_manufacturer, collectible_scale")
        .eq("id", itemId)
        .maybeSingle();

      if (item) {
        details = {
          brand: item.real_car_brand,
          model: item.real_car_model,
          year: item.real_car_year,
          manufacturer: item.collectible_manufacturer,
          scale: item.collectible_scale,
        };
      }
    }
  } catch {
    // segue sem os detalhes extras
  }

  await shareViaWhatsApp(
    buildListingShareText({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      currency: listing.currency,
      imageUrl: listing.image_url,
      ...details,
    }),
  );
};
