import { toast } from "sonner";

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

  // Last-resort fallback
  return `${window.location.origin}/listing/${listingId}`;
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
