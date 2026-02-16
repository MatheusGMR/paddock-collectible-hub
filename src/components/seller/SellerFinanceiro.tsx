import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ReceivablesData } from "@/hooks/useSellerData";

interface SellerFinanceiroProps {
  receivables: ReceivablesData | null;
  loading: boolean;
}

export const SellerFinanceiro = ({ receivables, loading }: SellerFinanceiroProps) => {
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

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(receivables?.total_revenue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Faturamento Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(receivables?.total_net || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Líquido Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(receivables?.pending_amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">A Receber</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(receivables?.paid_out_amount || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Já Recebido</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fees */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Resumo de Taxas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total em taxas da plataforma</span>
            <span className="text-destructive font-semibold">
              -{formatPrice(receivables?.total_fees || 0)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Taxa fixa de R$ 1,99 + 4,99% por venda
          </p>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Vendas</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Taxas</TableHead>
              <TableHead>Líquido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!receivables?.recent_sales || receivables.recent_sales.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma venda registrada
                </TableCell>
              </TableRow>
            ) : (
              receivables.recent_sales.map((sale: any) => {
                const st = statusMap[sale.status] || statusMap.pending;
                return (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sale.listing_image && (
                          <img
                            src={sale.listing_image}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {sale.listing_title || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(sale.sale_price)}</TableCell>
                    <TableCell className="text-destructive">
                      -{formatPrice(sale.platform_fee_total)}
                    </TableCell>
                    <TableCell className="text-green-500 font-semibold">
                      {formatPrice(sale.seller_net)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={st.color}>
                        {st.label}
                      </Badge>
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
