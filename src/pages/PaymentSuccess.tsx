import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [showContent, setShowContent] = useState(false);

  const listingId = searchParams.get("listing_id");

  useEffect(() => {
    // Trigger confetti animation
    const duration = 2000;
    const end = Date.now() + duration;

    // Using primary color palette
    const colors = ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)", "hsl(142, 69%, 58%)"];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Delay content appearance for animation
    setTimeout(() => setShowContent(true), 300);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div
        className={`transform transition-all duration-500 ${
          showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Success Icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/20 animate-ping" />
          </div>
          <CheckCircle2 className="relative h-24 w-24 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <PartyPopper className="h-6 w-6 text-yellow-500" />
          {t.checkout?.paymentSuccess || "Pagamento Aprovado!"}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground max-w-sm mb-8">
          {t.checkout?.paymentSuccessDesc ||
            "Seu pagamento foi processado com sucesso."}
        </p>

        {/* Actions */}
        <div className="space-y-3 w-full max-w-xs">
          <Button
            onClick={() => navigate("/mercado")}
            className="w-full gap-2"
            size="lg"
          >
            {t.checkout?.backToMarket || "Voltar ao Mercado"}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => navigate("/profile")}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {t.checkout?.viewOrder || "Ver Pedido"}
          </Button>
        </div>

        {/* Order confirmation message */}
        <p className="mt-8 text-sm text-muted-foreground">
          {t.checkout?.orderConfirmed || "Pedido Confirmado"}
        </p>
      </div>
    </div>
  );
}
