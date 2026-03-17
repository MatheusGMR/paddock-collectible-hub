import { useMemo } from "react";
import {
  DollarSign, TrendingUp, Clock, CheckCircle, ShoppingBag, BarChart3, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ReceivablesData } from "@/hooks/useSellerData";

interface SellerFinanceiroProps {
  receivables: ReceivablesData | null;
  loading: boolean;
}

export const SellerFinanceiro = ({ receivables, loading }: SellerFinanceiroProps) => {
  const sales = receivables?.recent_sales || [];

  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: number; count: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = { revenue: 0, count: 0 };
    }
    sales.forEach((s: any) => {
      const d = new Date(s.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].revenue += s.sale_price || 0;
        months[key].count += 1;
      }
    });
    return Object.entries(months).map(([key, val]) => ({
      month: key,
      label: new Date(key + "-01").toLocaleDateString("pt-BR", { month: "short" }),
      ...val,
    }));
  }, [sales]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-500" },
    completed: { label: "Concluído", color: "bg-green-500/10 text-green-500" },
    paid_out: { label: "Pago", color: "bg-primary/10 text-primary" },
  };

  const totalSales = receivables?.total_sales || 0;
  const avgTicket = totalSales > 0 ? (receivables?.total_revenue || 0) / totalSales : 0;
  const margin = receivables?.total_revenue && receivables.total_revenue > 0
    ? ((receivables.total_net || 0) / receivables.total_revenue) * 100
    : 0;

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);
  const maxCount = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Faturamento" value={formatPrice(receivables?.total_revenue || 0)} color="text-primary" bg="bg-primary/10" />
        <StatCard icon={TrendingUp} label="Líquido" value={formatPrice(receivables?.total_net || 0)} color="text-green-500" bg="bg-green-500/10" />
        <StatCard icon={Clock} label="A Receber" value={formatPrice(receivables?.pending_amount || 0)} color="text-amber-500" bg="bg-amber-500/10" />
        <StatCard icon={CheckCircle} label="Já Recebido" value={formatPrice(receivables?.paid_out_amount || 0)} color="text-primary" bg="bg-primary/10" />
      </div>

      {/* Performance KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ShoppingBag} label="Total Vendas" value={String(totalSales)} color="text-blue-500" bg="bg-blue-500/10" />
        <StatCard icon={Target} label="Ticket Médio" value={formatPrice(avgTicket)} color="text-purple-500" bg="bg-purple-500/10" />
        <StatCard icon={BarChart3} label="Margem Líq." value={`${margin.toFixed(1)}%`} color="text-green-500" bg="bg-green-500/10" />
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Faturamento Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-foreground">
                  {m.revenue > 0 ? formatPrice(m.revenue) : "—"}
                </span>
                <div
                  className="w-full bg-primary/80 rounded-t-md transition-all duration-300 min-h-[4px]"
                  style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Sales Count Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            Vendas por Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {monthlyData.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-foreground">{m.count}</span>
                <div
                  className="w-full bg-blue-500/70 rounded-t-md transition-all duration-300 min-h-[4px]"
                  style={{ height: `${(m.count / maxCount) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground capitalize">{m.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sales Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Vendas</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Líquido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma venda registrada
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale: any) => {
                const st = statusMap[sale.status] || statusMap.pending;
                return (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sale.listing_image && (
                          <img src={sale.listing_image} alt="" className="h-8 w-8 rounded object-cover" />
                        )}
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {sale.listing_title || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(sale.sale_price)}</TableCell>
                    <TableCell className="text-green-500 font-semibold">
                      {formatPrice(sale.seller_net)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={st.color}>{st.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

const StatCard = ({
  icon: Icon, label, value, color, bg,
}: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string;
}) => (
  <Card className="border-border">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
