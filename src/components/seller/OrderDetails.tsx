import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Camera, Printer, Loader2, ChevronRight, Package as PackageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { OrderTimeline, type ShippingStatus, SHIPPING_STEPS } from "./OrderTimeline";
import { ShippingLabel } from "./ShippingLabel";

interface SaleData {
  id: string;
  listing_id: string;
  buyer_id: string;
  sale_price: number;
  currency: string;
  seller_net: number;
  platform_fee_total: number;
  status: string;
  shipping_status: string;
  shipping_photo_url: string | null;
  tracking_code: string | null;
  created_at: string;
  stripe_session_id: string | null;
}

interface ListingData {
  id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Venda Confirmada", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  preparing: { label: "Preparando Envio", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  in_transit: { label: "Em Trânsito", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  delivered: { label: "Entregue", color: "bg-primary/10 text-primary border-primary/30" },
};

const NEXT_STATUS: Record<string, { next: ShippingStatus; label: string }> = {
  confirmed: { next: "preparing", label: "Confirmar Preparação" },
  preparing: { next: "in_transit", label: "Marcar Em Trânsito" },
  in_transit: { next: "delivered", label: "Marcar Entregue" },
};

export const OrderDetails = () => {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sale, setSale] = useState<SaleData | null>(null);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<{ username: string; city: string | null } | null>(null);
  const [sellerName, setSellerName] = useState("Paddock Seller");
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);

  const labelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchOrder = useCallback(async () => {
    if (!saleId || !user) return;
    try {
      const { data: saleData, error } = await supabase
        .from("sales")
        .select("*")
        .eq("id", saleId)
        .single();

      if (error) throw error;
      setSale(saleData as unknown as SaleData);

      // Fetch listing, buyer, seller in parallel
      const [listingRes, buyerRes, sellerRes] = await Promise.all([
        supabase.from("listings").select("id, title, image_url, price, currency").eq("id", saleData.listing_id).single(),
        supabase.from("profiles").select("username, city").eq("user_id", saleData.buyer_id).single(),
        supabase.from("seller_details").select("business_name").eq("user_id", user.id).single(),
      ]);

      if (listingRes.data) setListing(listingRes.data);
      if (buyerRes.data) setBuyerProfile(buyerRes.data);
      if (sellerRes.data?.business_name) setSellerName(sellerRes.data.business_name);
    } catch (err) {
      console.error("Error fetching order:", err);
      toast({ variant: "destructive", title: "Erro ao carregar pedido" });
    } finally {
      setLoading(false);
    }
  }, [saleId, user, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleAdvanceStatus = async () => {
    if (!sale || !NEXT_STATUS[sale.shipping_status]) return;
    setAdvancing(true);
    try {
      const nextStatus = NEXT_STATUS[sale.shipping_status].next;
      const { error } = await supabase
        .from("sales")
        .update({ shipping_status: nextStatus })
        .eq("id", sale.id);
      if (error) throw error;
      setSale((prev) => prev ? { ...prev, shipping_status: nextStatus } : prev);
      toast({ title: `Status atualizado: ${STATUS_LABELS[nextStatus]?.label}` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    } finally {
      setAdvancing(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sale || !user) return;
    setTakingPhoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/shipping-${sale.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("collection-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("collection-images").getPublicUrl(path);
      const photoUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("sales")
        .update({ shipping_photo_url: photoUrl })
        .eq("id", sale.id);
      if (updateError) throw updateError;

      setSale((prev) => prev ? { ...prev, shipping_photo_url: photoUrl } : prev);
      toast({ title: "Foto salva com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao salvar foto" });
    } finally {
      setTakingPhoto(false);
    }
  };

  const handlePrintLabel = () => {
    setShowLabel(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!sale || !listing) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/seller")} className="mt-4">
          Voltar ao Painel
        </Button>
      </div>
    );
  }

  const orderUrl = `${window.location.origin}/seller/order/${sale.id}`;
  const statusInfo = STATUS_LABELS[sale.shipping_status] || STATUS_LABELS.confirmed;
  const canAdvance = !!NEXT_STATUS[sale.shipping_status];
  const needsPhotoForLabel = sale.shipping_status === "confirmed" && !sale.shipping_photo_url;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/seller")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Detalhes do Pedido</h1>
          <p className="text-xs text-muted-foreground">#{sale.id.slice(0, 8)}</p>
        </div>
        <Badge variant="outline" className={statusInfo.color}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Timeline */}
      <Card className="border-border">
        <CardContent className="pt-6 pb-4">
          <OrderTimeline status={sale.shipping_status} />
        </CardContent>
      </Card>

      {/* Order Card */}
      <Card className="border-border overflow-hidden">
        <div className="flex">
          <img
            src={listing.image_url}
            alt={listing.title}
            className="h-28 w-28 object-cover shrink-0"
          />
          <div className="flex-1 p-4 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{listing.title}</h3>
            <p className="text-lg font-bold text-primary mt-1">
              {formatPrice(sale.sale_price, sale.currency)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Líquido: {formatPrice(sale.seller_net, sale.currency)}</span>
              <span>•</span>
              <span>Taxa: {formatPrice(sale.platform_fee_total, sale.currency)}</span>
            </div>
          </div>
        </div>

        {/* Buyer info */}
        {buyerProfile && (
          <div className="border-t border-border px-4 py-3 flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">
              @{buyerProfile.username}
            </span>
            {buyerProfile.city && (
              <span className="text-xs text-muted-foreground">• {buyerProfile.city}</span>
            )}
          </div>
        )}
      </Card>

      {/* Pack & Go: Photo + Label section */}
      {sale.status === "completed" && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pack & Go — Etiqueta de Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: Take photo */}
            {!sale.shipping_photo_url ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Tire uma foto do produto embalado antes de gerar a etiqueta.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={takingPhoto}
                  className="gap-2"
                  size="lg"
                >
                  {takingPhoto ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  Abrir Câmera
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Photo preview */}
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={sale.shipping_photo_url}
                    alt="Produto embalado"
                    className="w-full h-40 object-cover"
                  />
                </div>

                {/* Generate label button */}
                <Button onClick={handlePrintLabel} className="w-full gap-2" size="lg">
                  <Printer className="h-5 w-5" />
                  Gerar Etiqueta de Envio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advance status */}
      {canAdvance && sale.status === "completed" && (
        <Button
          onClick={handleAdvanceStatus}
          disabled={advancing}
          variant="outline"
          className="w-full gap-2"
          size="lg"
        >
          {advancing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {NEXT_STATUS[sale.shipping_status]?.label}
        </Button>
      )}

      {/* Pending sale notice */}
      {sale.status === "pending" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-amber-600 font-medium">
              ⏳ Pagamento pendente — aguardando confirmação do Stripe
            </p>
          </CardContent>
        </Card>
      )}

      {/* Printable label (hidden until print) */}
      {showLabel && (
        <div className="print:block hidden">
          <ShippingLabel
            ref={labelRef}
            orderId={sale.id}
            orderUrl={orderUrl}
            buyerName={buyerProfile?.username || "Comprador"}
            buyerCity={buyerProfile?.city || null}
            items={[{
              title: listing.title,
              price: listing.price,
              currency: listing.currency,
              image_url: listing.image_url,
            }]}
            sellerName={sellerName}
            trackingCode={sale.tracking_code}
          />
        </div>
      )}

      {/* Also show label preview on screen when toggled */}
      {showLabel && (
        <div className="print:hidden">
          <ShippingLabel
            orderId={sale.id}
            orderUrl={orderUrl}
            buyerName={buyerProfile?.username || "Comprador"}
            buyerCity={buyerProfile?.city || null}
            items={[{
              title: listing.title,
              price: listing.price,
              currency: listing.currency,
              image_url: listing.image_url,
            }]}
            sellerName={sellerName}
            trackingCode={sale.tracking_code}
          />
        </div>
      )}
    </div>
  );
};
