import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Search, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
  id: string;
  listing_id: string;
  sale_price: number;
  currency: string;
  seller_net: number;
  status: string;
  shipping_status: string;
  created_at: string;
  tracking_code: string | null;
  listing_title?: string;
  listing_image?: string;
  buyer_username?: string;
}

const SHIPPING_BADGES: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-green-500/10 text-green-600" },
  preparing: { label: "Preparando", className: "bg-amber-500/10 text-amber-600" },
  in_transit: { label: "Em Trânsito", className: "bg-blue-500/10 text-blue-600" },
  delivered: { label: "Entregue", className: "bg-primary/10 text-primary" },
};

export const SellerOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: sales } = await supabase
        .from("sales")
        .select("id, listing_id, sale_price, currency, seller_net, status, shipping_status, created_at, tracking_code")
        .eq("seller_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!sales || sales.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch listing + buyer details in parallel
      const listingIds = [...new Set(sales.map((s) => s.listing_id))];
      const buyerIds = [...new Set(sales.map((s: any) => s.buyer_id).filter(Boolean))];

      const [listingsRes, profilesRes] = await Promise.all([
        supabase.from("listings").select("id, title, image_url").in("id", listingIds),
        buyerIds.length > 0
          ? supabase.from("profiles").select("user_id, username").in("user_id", buyerIds)
          : Promise.resolve({ data: [] }),
      ]);

      const listingMap = new Map((listingsRes.data || []).map((l) => [l.id, l]));
      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));

      const enriched: OrderItem[] = sales.map((s: any) => {
        const listing = listingMap.get(s.listing_id);
        const buyer = profileMap.get(s.buyer_id);
        return {
          ...s,
          listing_title: listing?.title || "Item",
          listing_image: listing?.image_url || "",
          buyer_username: buyer?.username || "Comprador",
        };
      });

      setOrders(enriched);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);

  const filtered = orders.filter((o) => {
    const matchesSearch = (o.listing_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.buyer_username || "").toLowerCase().includes(search.toLowerCase());
    if (tab === "all") return matchesSearch;
    return matchesSearch && o.shipping_status === tab;
  });

  const counts = {
    all: orders.length,
    confirmed: orders.filter((o) => o.shipping_status === "confirmed").length,
    preparing: orders.filter((o) => o.shipping_status === "preparing").length,
    in_transit: orders.filter((o) => o.shipping_status === "in_transit").length,
    delivered: orders.filter((o) => o.shipping_status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Pedidos</h2>
          <p className="text-xs text-muted-foreground">{orders.length} pedido(s) concluído(s)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto ou comprador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs by shipping status */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">Confirmados ({counts.confirmed})</TabsTrigger>
          <TabsTrigger value="preparing" className="text-xs">Preparando ({counts.preparing})</TabsTrigger>
          <TabsTrigger value="in_transit" className="text-xs">Em Trânsito ({counts.in_transit})</TabsTrigger>
          <TabsTrigger value="delivered" className="text-xs">Entregues ({counts.delivered})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum pedido encontrado
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const badge = SHIPPING_BADGES[order.shipping_status] || SHIPPING_BADGES.confirmed;
                return (
                  <Card
                    key={order.id}
                    className="border-border cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/seller/order/${order.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={order.listing_image}
                          alt={order.listing_title}
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{order.listing_title}</p>
                          <p className="text-xs text-muted-foreground">
                            @{order.buyer_username} • {new Date(order.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-primary">
                              {formatPrice(order.sale_price, order.currency)}
                            </span>
                            <Badge variant="secondary" className={`text-[10px] ${badge.className}`}>
                              {badge.label}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
