import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { CheckCircle2, PartyPopper, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { checkSubscription } = useSubscription();
  const [showContent, setShowContent] = useState(false);

  // Check if this is a subscription success (from onboarding)
  const isSubscription = location.pathname === "/subscription-success" || searchParams.has("session_id");
  const listingId = searchParams.get("listing_id");

  useEffect(() => {
    // Refresh subscription status after successful payment
    if (isSubscription) {
      checkSubscription();
    }

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

    // Auto-redirect to feed after 5 seconds for subscriptions
    if (isSubscription) {
      const timer = setTimeout(() => {
        navigate("/", { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubscription, checkSubscription, navigate]);

  const handleContinue = () => {
    if (isSubscription) {
      navigate("/", { replace: true });
    } else {
      navigate("/mercado");
    }
  };

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
          <PartyPopper className="h-6 w-6 text-accent-foreground" />
          {isSubscription 
            ? (t.onboarding?.subscriptionSuccess || "Bem-vindo ao Paddock!") 
            : (t.checkout?.paymentSuccess || "Pagamento Aprovado!")}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground max-w-sm mb-8">
          {isSubscription 
            ? (t.onboarding?.subscriptionSuccessDesc || "Sua assinatura foi ativada com sucesso. Aproveite todos os recursos premium!")
            : (t.checkout?.paymentSuccessDesc || "Seu pagamento foi processado com sucesso.")}
        </p>

        {/* Challenge reminder for subscriptions */}
        {isSubscription && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 max-w-sm">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{t.onboarding?.rememberChallenge || "Lembre-se do desafio!"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.onboarding?.challengeReminder || "Escaneie 50 carrinhos para ganhar o 1º mês grátis e 50% de desconto permanente!"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 w-full max-w-xs">
          <Button
            onClick={handleContinue}
            className="w-full gap-2"
            size="lg"
          >
            {isSubscription 
              ? (t.onboarding?.startExploring || "Começar a Explorar")
              : (t.checkout?.backToMarket || "Voltar ao Mercado")}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {!isSubscription && (
            <Button
              onClick={() => navigate("/profile")}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t.checkout?.viewOrder || "Ver Pedido"}
            </Button>
          )}
        </div>

        {/* Auto-redirect notice for subscriptions */}
        {isSubscription && (
          <p className="mt-6 text-xs text-muted-foreground">
            {t.onboarding?.autoRedirect || "Você será redirecionado automaticamente em 5 segundos..."}
          </p>
        )}

        {/* Order confirmation message for purchases */}
        {!isSubscription && (
          <p className="mt-8 text-sm text-muted-foreground">
            {t.checkout?.orderConfirmed || "Pedido Confirmado"}
          </p>
        )}
      </div>
    </div>
  );
}
