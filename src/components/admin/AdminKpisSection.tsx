import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminDb, brl, downloadCsv } from "./adminUtils";

interface Props { days: number; onDaysChange: (d: number) => void }

export const AdminKpisSection = ({ days, onDaysChange }: Props) => {
  const { data: k, isLoading } = useQuery({
    queryKey: ["admin-kpis", days],
    queryFn: async () => {
      const { data, error } = await adminDb.rpc("get_admin_kpis", { days_back: days });
      if (error) throw error;
      return data as Record<string, number>;
    },
  });

  const items: [string, string | number][] = k ? [
    ["Ativos hoje", k.dau], ["Ativos 7 dias", k.wau], ["Ativos 30 dias", k.mau],
    ["Novos cadastros", k.new_users], ["Retenção 7 dias", `${k.retention_7d ?? 0}%`], ["Carrinhos escaneados", k.scans],
    ["Posts", k.posts], ["Vendas", k.sales_count], ["Volume vendido", brl(k.gmv)],
    ["Taxas arrecadadas", brl(k.fees)], ["Em teste", k.subs_trial], ["Premium ativos", k.subs_active],
    ["Cancelados/expirados", k.subs_canceled], ["Recebem notificações", k.push_subscribers],
  ] : [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => onDaysChange(d)}>{d}d</Button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="gap-1" disabled={!k}
          onClick={() => downloadCsv(`indicadores-${days}d.csv`, items.map(([indicador, valor]) => ({ indicador, valor })))}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
          : items.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold text-foreground">{value ?? 0}</p>
              </div>
            ))}
      </div>
    </section>
  );
};
