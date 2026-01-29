import { useState } from "react";
import { Loader2, Lock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice } from "@/data/marketplaceSources";

interface BuyButtonProps {
  listingId: string;
  price: number;
  currency: string;
  disabled?: boolean;
  className?: string;
}

export const BuyButton = ({
  listingId,
  price,
  currency,
  disabled = false,
  className,
}: BuyButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "create-payment",
        {
          body: { listing_id: listingId },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Open Stripe Checkout in a new tab
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: t.errors.generic,
        description: t.errors.tryAgain,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        size="lg"
        className="w-full gap-2 text-lg font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.checkout?.processing || "Processando..."}
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            {t.checkout?.buyNow || "Comprar Agora"} - {formatPrice(price, currency)}
          </>
        )}
      </Button>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>{t.checkout?.securePayment || "Pagamento Seguro"}</span>
      </div>
    </div>
  );
};
