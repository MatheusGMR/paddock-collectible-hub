import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { CheckCircle2, PartyPopper, ArrowRight, Sparkles, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PurchasedItemCard } from "@/components/mercado/PurchasedItemCard";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { addToCollection } from "@/lib/database";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

interface PurchasedListing {
  id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
  source_name: string;
  item_id: string | null;
  items?: any | null;
}

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { checkSubscription } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showContent, setShowContent] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<PurchasedListing[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [revealedCards, setRevealedCards] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postItemTitle, setPostItemTitle] = useState("");
  const [postCollectionItemId, setPostCollectionItemId] = useState<string | undefined>();

  const isSubscription = location.pathname === "/subscription-success" || searchParams.has("session_id") && !searchParams.has("cart");
  const isCart = searchParams.get("cart") === "true";
  const sessionId = searchParams.get("session_id");

  // Fetch purchased items for cart purchases
  const fetchPurchasedItems = useCallback(async () => {
    if (!sessionId || !isCart || !user) return;
    setLoadingItems(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-purchase-items", {
        body: { session_id: sessionId },
      });
      if (error) throw new Error(error.message);
      if (data?.items) {
        setPurchasedItems(data.items);
      }
    } catch (err) {
      console.error("Error fetching purchased items:", err);
    } finally {
      setLoadingItems(false);
    }
  }, [sessionId, isCart, user]);

  useEffect(() => {
    if (isSubscription) {
      checkSubscription();
    }

    // Confetti
    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["hsl(142, 76%, 36%)", "hsl(142, 71%, 45%)", "hsl(142, 69%, 58%)"];

    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    setTimeout(() => setShowContent(true), 300);

    if (isCart) {
      fetchPurchasedItems();
    }

    if (isSubscription) {
      const timer = setTimeout(() => navigate("/", { replace: true }), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSubscription, isCart, checkSubscription, navigate, fetchPurchasedItems]);

  // Reveal cards after items load
  useEffect(() => {
    if (purchasedItems.length > 0 && !revealedCards) {
      const timer = setTimeout(() => setRevealedCards(true), 600);
      return () => clearTimeout(timer);
    }
  }, [purchasedItems, revealedCards]);

  const handleAddToCollection = async (item: PurchasedListing) => {
    if (!user) return;
    try {
      if (item.items) {
        await addToCollection(user.id, {
          real_car_brand: item.items.real_car_brand,
          real_car_model: item.items.real_car_model,
          real_car_year: item.items.real_car_year,
          historical_fact: item.items.historical_fact,
          collectible_manufacturer: item.items.collectible_manufacturer,
          collectible_scale: item.items.collectible_scale,
          collectible_year: item.items.collectible_year,
          collectible_origin: item.items.collectible_origin,
          collectible_series: item.items.collectible_series,
          collectible_condition: item.items.collectible_condition,
          collectible_notes: item.items.collectible_notes,
          collectible_color: item.items.collectible_color,
          price_index: item.items.price_index,
          rarity_tier: item.items.rarity_tier,
          index_breakdown: item.items.index_breakdown,
          music_suggestion: item.items.music_suggestion,
          music_selection_reason: item.items.music_selection_reason,
          real_car_photos: item.items.real_car_photos,
          estimated_value_min: item.items.estimated_value_min,
          estimated_value_max: item.items.estimated_value_max,
        }, item.image_url);
      } else {
        // No item data linked, create minimal entry
        await addToCollection(user.id, {
          real_car_brand: item.title,
          real_car_model: "",
          real_car_year: null,
          historical_fact: null,
          collectible_manufacturer: null,
          collectible_scale: null,
          collectible_year: null,
          collectible_origin: null,
          collectible_series: null,
          collectible_condition: null,
          collectible_notes: null,
          collectible_color: null,
          price_index: null,
          rarity_tier: null,
          index_breakdown: null,
          music_suggestion: null,
          music_selection_reason: null,
          real_car_photos: null,
        }, item.image_url);
      }
      toast({ title: t.scanner?.addedToCollection || "Adicionado à coleção! ✓" });
    } catch (err) {
      console.error("Add to collection error:", err);
      toast({ variant: "destructive", title: "Erro ao adicionar à coleção" });
    }
  };

  const handleAddAndPublish = async (item: PurchasedListing) => {
    if (!user) return;
    try {
      let collectionItemId: string | undefined;
      if (item.items) {
        const result = await addToCollection(user.id, {
          real_car_brand: item.items.real_car_brand,
          real_car_model: item.items.real_car_model,
          real_car_year: item.items.real_car_year,
          historical_fact: item.items.historical_fact,
          collectible_manufacturer: item.items.collectible_manufacturer,
          collectible_scale: item.items.collectible_scale,
          collectible_year: item.items.collectible_year,
          collectible_origin: item.items.collectible_origin,
          collectible_series: item.items.collectible_series,
          collectible_condition: item.items.collectible_condition,
          collectible_notes: item.items.collectible_notes,
          collectible_color: item.items.collectible_color,
          price_index: item.items.price_index,
          rarity_tier: item.items.rarity_tier,
          index_breakdown: item.items.index_breakdown,
          music_suggestion: item.items.music_suggestion,
          music_selection_reason: item.items.music_selection_reason,
          real_car_photos: item.items.real_car_photos,
          estimated_value_min: item.items.estimated_value_min,
          estimated_value_max: item.items.estimated_value_max,
        }, item.image_url);
        collectionItemId = result.id;
      }
      // Open post dialog with the image
      setPostImageUrl(item.image_url);
      setPostItemTitle(item.title);
      setPostCollectionItemId(collectionItemId);
      setPostDialogOpen(true);
    } catch (err) {
      console.error("Add and publish error:", err);
      toast({ variant: "destructive", title: "Erro ao adicionar" });
    }
  };

  const handleContinue = () => {
    if (isSubscription) {
      navigate("/", { replace: true });
    } else {
      navigate("/mercado");
    }
  };

  // Cart purchase unboxing experience
  if (isCart && !isSubscription) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h1 className="font-bold text-foreground">
                {t.checkout?.paymentSuccess || "Compra Realizada!"}
              </h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleContinue}>
              {t.checkout?.backToMarket || "Mercado"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-8">
          {/* Success message */}
          <div className={`text-center py-4 transform transition-all duration-500 ${showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                {purchasedItems.length > 1 ? "Seus itens chegaram!" : "Seu item chegou!"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Adicione à sua coleção ou publique no feed
            </p>
          </div>

          {/* Loading state */}
          {loadingItems && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Purchased item cards with 3D flip reveal */}
          <div className="space-y-6 max-w-md mx-auto">
            {purchasedItems.map((item, index) => (
              <PurchasedItemCard
                key={item.id}
                item={item}
                index={index}
                onAddToCollection={handleAddToCollection}
                onAddAndPublish={handleAddAndPublish}
                isRevealed={revealedCards}
              />
            ))}
          </div>

          {/* Continue button after all cards revealed */}
          {purchasedItems.length > 0 && revealedCards && (
            <div className="text-center pt-4">
              <Button onClick={handleContinue} variant="outline" className="gap-2">
                {t.checkout?.backToMarket || "Voltar ao Mercado"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Post dialog */}
        <CreatePostDialog
          open={postDialogOpen}
          onOpenChange={setPostDialogOpen}
          imageBase64={postImageUrl}
          collectionItemId={postCollectionItemId}
          itemTitle={postItemTitle}
        />
      </div>
    );
  }

  // Default subscription/single payment success
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className={`transform transition-all duration-500 ${showContent ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
        {/* Success Icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/20 animate-ping" />
          </div>
          <CheckCircle2 className="relative h-24 w-24 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          <PartyPopper className="h-6 w-6 text-accent-foreground" />
          {isSubscription
            ? (t.onboarding?.subscriptionSuccess || "Bem-vindo ao Paddock!")
            : (t.checkout?.paymentSuccess || "Pagamento Aprovado!")}
        </h1>

        <p className="text-muted-foreground max-w-sm mb-8">
          {isSubscription
            ? (t.onboarding?.subscriptionSuccessDesc || "Sua assinatura foi ativada com sucesso. Aproveite todos os recursos premium!")
            : (t.checkout?.paymentSuccessDesc || "Seu pagamento foi processado com sucesso.")}
        </p>

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

        <div className="space-y-3 w-full max-w-xs">
          <Button onClick={handleContinue} className="w-full gap-2" size="lg">
            {isSubscription
              ? (t.onboarding?.startExploring || "Começar a Explorar")
              : (t.checkout?.backToMarket || "Voltar ao Mercado")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!isSubscription && (
            <Button onClick={() => navigate("/profile")} variant="outline" className="w-full" size="lg">
              {t.checkout?.viewOrder || "Ver Pedido"}
            </Button>
          )}
        </div>

        {isSubscription && (
          <p className="mt-6 text-xs text-muted-foreground">
            {t.onboarding?.autoRedirect || "Você será redirecionado automaticamente em 5 segundos..."}
          </p>
        )}

        {!isSubscription && (
          <p className="mt-8 text-sm text-muted-foreground">
            {t.checkout?.orderConfirmed || "Pedido Confirmado"}
          </p>
        )}
      </div>
    </div>
  );
}
