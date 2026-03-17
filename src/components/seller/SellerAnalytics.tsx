import { useState, useEffect } from "react";
import {
  Eye, ShoppingCart, CreditCard, Share2, TrendingUp, Users, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ListingAnalytics {
  listing_id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
  views: number;
  cart_adds: number;
  buy_clicks: number;
  shares: number;
  unique_visitors: number;
}

interface AnalyticsSummary {
  total_views: number;
  total_cart_adds: number;
  total_buy_clicks: number;
  total_shares: number;
  unique_visitors: number;
}

interface DailyData {
  date: string;
  views: number;
  cart_adds: number;
  buy_clicks: number;
}

export const SellerAnalytics = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [byListing, setByListing] = useState<ListingAnalytics[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc("get_seller_listing_analytics", {
          p_seller_id: user.id,
        });
        if (error) throw error;
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        setSummary(parsed.summary);
        setByListing(parsed.by_listing || []);
        setDaily(parsed.daily || []);
      } catch (e) {
        console.error("Error fetching seller analytics:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);

  const conversionRate =
    summary && summary.total_views > 0
      ? ((summary.total_buy_clicks / summary.total_views) * 100).toFixed(1)
      : "0";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card rounded-xl animate-pulse" />
        <div className="h-64 bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          icon={Eye}
          label="Visualizações"
          value={summary?.total_views || 0}
          color="text-blue-500"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={ShoppingCart}
          label="Add Carrinho"
          value={summary?.total_cart_adds || 0}
          color="text-orange-500"
          bg="bg-orange-500/10"
        />
        <StatCard
          icon={CreditCard}
          label="Cliques Compra"
          value={summary?.total_buy_clicks || 0}
          color="text-green-500"
          bg="bg-green-500/10"
        />
        <StatCard
          icon={Users}
          label="Visitantes Únicos"
          value={summary?.unique_visitors || 0}
          color="text-purple-500"
          bg="bg-purple-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa Conversão"
          value={`${conversionRate}%`}
          color="text-primary"
          bg="bg-primary/10"
        />
      </div>

      {/* Per-listing breakdown */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Desempenho por Anúncio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">
                  <Eye className="h-3.5 w-3.5 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <ShoppingCart className="h-3.5 w-3.5 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <CreditCard className="h-3.5 w-3.5 mx-auto" />
                </TableHead>
                <TableHead className="text-center">
                  <Share2 className="h-3.5 w-3.5 mx-auto" />
                </TableHead>
                <TableHead className="text-center">Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byListing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum dado de interação ainda
                  </TableCell>
                </TableRow>
              ) : (
                byListing.map((item) => {
                  const conv = item.views > 0 ? ((item.buy_clicks / item.views) * 100).toFixed(1) : "0";
                  return (
                    <TableRow key={item.listing_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[180px] text-sm">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item.price, item.currency)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.views}</TableCell>
                      <TableCell className="text-center font-semibold">{item.cart_adds}</TableCell>
                      <TableCell className="text-center font-semibold">{item.buy_clicks}</TableCell>
                      <TableCell className="text-center font-semibold">{item.shares}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={
                            Number(conv) >= 5
                              ? "bg-green-500/10 text-green-500"
                              : Number(conv) >= 1
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {conv}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  bg: string;
}) => (
  <Card className="border-border">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
