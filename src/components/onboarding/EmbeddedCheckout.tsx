import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout as StripeEmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Load Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface EmbeddedCheckoutProps {
  onBack: () => void;
  onComplete: () => void;
}

export const EmbeddedCheckout = ({ onBack, onComplete }: EmbeddedCheckoutProps) => {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    try {
      // Get fresh session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        throw new Error("No session");
      }

      const { data, error } = await supabase.functions.invoke("create-subscription", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: { embedded: true },
      });

      if (error) throw error;
      if (!data?.clientSecret) throw new Error("No client secret returned");

      return data.clientSecret;
    } catch (err) {
      console.error("Error fetching client secret:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize checkout");
      throw err;
    }
  }, []);

  const options = {
    fetchClientSecret,
    onComplete,
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          Checkout
        </h1>
      </div>

      {/* Checkout Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full p-6 text-center"
            >
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => setError(null)} variant="outline">
                {t.common.back}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="checkout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                <StripeEmbeddedCheckout className="h-full" />
              </EmbeddedCheckoutProvider>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
