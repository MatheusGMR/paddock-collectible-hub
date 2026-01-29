import { useNavigate, useSearchParams } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PaymentCanceled() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const listingId = searchParams.get("listing_id");

  const handleTryAgain = () => {
    if (listingId) {
      navigate(`/listing/${listingId}`);
    } else {
      navigate("/mercado");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      {/* Canceled Icon */}
      <div className="mb-6">
        <XCircle className="h-24 w-24 text-muted-foreground" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {t.checkout?.paymentCanceled || "Pagamento Cancelado"}
      </h1>

      {/* Description */}
      <p className="text-muted-foreground max-w-sm mb-8">
        {t.checkout?.paymentCanceledDesc ||
          "Você cancelou o pagamento. Deseja tentar novamente?"}
      </p>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-xs">
        <Button
          onClick={handleTryAgain}
          className="w-full gap-2"
          size="lg"
        >
          <RefreshCw className="h-4 w-4" />
          {t.checkout?.tryAgain || "Tentar Novamente"}
        </Button>

        <Button
          onClick={() => navigate("/mercado")}
          variant="outline"
          className="w-full gap-2"
          size="lg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.checkout?.backToMarket || "Voltar ao Mercado"}
        </Button>
      </div>
    </div>
  );
}
