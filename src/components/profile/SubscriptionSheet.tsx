import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Crown, 
  ExternalLink, 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  Star,
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmbeddedCheckout } from "@/components/onboarding/EmbeddedCheckout";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

interface SubscriptionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionSheet = ({ open, onOpenChange }: SubscriptionSheetProps) => {
  const { status, daysLeft, subscriptionEnd, checkSubscription } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const isActive = status === "active";
  const isTrial = status === "trial";
  const isExpired = status === "expired" || status === "canceled";

  const handleOpenPortal = async () => {
    if (!user) return;
    setPortalLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke("create-subscription", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: { action: "portal" },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No portal URL");

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: data.url });
      } else {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível abrir o gerenciamento da assinatura.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckoutComplete = () => {
    setShowCheckout(false);
    checkSubscription();
    toast({
      title: "Assinatura realizada! 🎉",
      description: "Bem-vindo ao Paddock Premium!",
    });
  };

  if (showCheckout) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) setShowCheckout(false); onOpenChange(v); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden pt-safe">
          <EmbeddedCheckout
            onBack={() => setShowCheckout(false)}
            onComplete={handleCheckoutComplete}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-l border-border p-0 overflow-y-auto pt-safe">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5" />
            Assinatura
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-6 text-center space-y-3 ${
              isActive 
                ? "border-primary/30 bg-primary/5" 
                : isTrial 
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-card"
            }`}
          >
            <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full mx-auto ${
              isActive ? "bg-primary/10" : isTrial ? "bg-amber-500/10" : "bg-muted"
            }`}>
              {isActive ? (
                <Crown className="h-8 w-8 text-primary" />
              ) : isTrial ? (
                <Star className="h-8 w-8 text-amber-500" />
              ) : (
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-foreground">
                {isActive ? "Paddock Premium" : isTrial ? "Período de Avaliação" : "Sem Assinatura"}
              </h3>
              <p className={`text-sm mt-1 ${
                isActive ? "text-primary" : isTrial ? "text-amber-500" : "text-muted-foreground"
              }`}>
                {isActive && subscriptionEnd
                  ? `Renova em ${new Date(subscriptionEnd).toLocaleDateString("pt-BR")}`
                  : isTrial
                    ? `${daysLeft} dia${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`
                    : "Assine para desbloquear todos os recursos"
                }
              </p>
            </div>

            {isActive && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <CheckCircle2 className="h-4 w-4" />
                <span>R$ 19,90/mês</span>
              </div>
            )}
          </motion.div>

          {/* Premium Benefits */}
          {!isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide px-1">
                Benefícios Premium
              </h4>
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {[
                  "Scanner ilimitado de colecionáveis",
                  "Índice de Preço detalhado",
                  "Acesso ao Mercado completo",
                  "Notícias exclusivas",
                  "Desafio do Colecionador",
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 px-4">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {isActive ? (
              <>
                <Button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  variant="outline"
                  className="w-full h-14 text-base"
                >
                  {portalLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-5 w-5 mr-2" />
                  )}
                  Alterar forma de pagamento
                </Button>
                <Button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  variant="ghost"
                  className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Cancelar assinatura
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base"
              >
                <Crown className="h-5 w-5 mr-2" />
                {isTrial ? "Assinar agora — R$ 19,90/mês" : "Assinar Paddock Premium"}
              </Button>
            )}
          </motion.div>

          {/* Footer info */}
          <p className="text-xs text-muted-foreground text-center px-4">
            {isActive
              ? "Gerencie sua assinatura, altere cartão ou cancele a qualquer momento."
              : "Cancele a qualquer momento. Sem compromisso."
            }
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
