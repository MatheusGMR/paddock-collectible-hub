import { toast } from "sonner";

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
