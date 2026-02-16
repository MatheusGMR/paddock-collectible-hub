import { useState } from "react";
import { DollarSign, TrendingUp, Clock, CheckCircle2, ChevronDown, ChevronUp, Receipt, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSellerReceivables } from "@/hooks/useSellerReceivables";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice } from "@/data/marketplaceSources";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pendente", icon: Clock, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  completed: { label: "Disponível", icon: CheckCircle2, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  paid_out: { label: "Pago", icon: DollarSign, className: "bg-primary/20 text-primary border-primary/30" },
};

export function SellerReceivablesSheet() {
  const { data, isLoading } = useSellerReceivables();
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!data || data.total_sales === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Receipt className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-foreground">Nenhuma venda ainda</p>
        <p className="text-xs text-muted-foreground mt-1">
          Suas vendas e recebíveis aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Vendas</span>
          </div>
          <p className="text-lg font-bold text-foreground">{data.total_sales}</p>
          <p className="text-sm text-primary font-semibold">
            {formatPrice(data.total_revenue, "BRL")}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Líquido</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatPrice(data.total_net, "BRL")}
          </p>
          <p className="text-xs text-muted-foreground">
            Taxas: {formatPrice(data.total_fees, "BRL")}
          </p>
        </div>
      </div>

      {/* Receivables Breakdown */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Recebíveis</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Disponível para saque</span>
          <span className="text-sm font-bold text-emerald-500">
            {formatPrice(data.pending_amount, "BRL")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Já sacado</span>
          <span className="text-sm font-medium text-foreground">
            {formatPrice(data.paid_out_amount, "BRL")}
          </span>
        </div>
        <div className="border-t border-border pt-2 mt-2">
          <p className="text-[11px] text-muted-foreground">
            Taxa por venda: R$ 1,99 + 4,99% sobre o valor do item
          </p>
        </div>
      </div>

      {/* Sales List */}
      <div>
        <Button
          variant="ghost"
          className="w-full justify-between text-sm font-semibold text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          Histórico de Vendas
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {expanded && (
          <div className="space-y-2 mt-2">
            {data.recent_sales.map((sale) => {
              const config = statusConfig[sale.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={sale.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0">
                    {sale.listing_image && (
                      <img
                        src={sale.listing_image}
                        alt={sale.listing_title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {sale.listing_title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(sale.created_at), "d MMM", {
                          locale: language === "pt-BR" ? ptBR : undefined,
                        })}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.className)}>
                        <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice(sale.seller_net, sale.currency)}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                      <Minus className="h-2.5 w-2.5" />
                      {formatPrice(sale.platform_fee_total, sale.currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
