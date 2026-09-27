import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { adminDb, brl, downloadCsv } from "./adminUtils";

interface Stats {
  active_listings: number; pending_shipments: number;
  listings: { id: string; title: string; price: number; image_url: string; status: string; created_at: string; username: string | null }[];
  sales: { id: string; sale_price: number; platform_fee_total: number; status: string; shipping_status: string; created_at: string; title: string | null }[];
}

export const AdminMarketplaceSection = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-marketplace"],
    queryFn: async () => {
      const { data, error } = await adminDb.rpc("get_admin_marketplace_stats");
      if (error) throw error;
      return data as Stats;
    },
  });

  const removeListing = async (id: string) => {
    if (!confirm("Retirar este anúncio do Mercado?")) return;
    const { error } = await adminDb.from("listings").update({ status: "removed" }).eq("id", id);
    toast({ title: error ? "Não foi possível retirar" : "Anúncio retirado", variant: error ? "destructive" : "default" });
    refetch();
  };

  if (isLoading || !data) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Anúncios ativos</p><p className="text-lg font-semibold">{data.active_listings}</p></div>
        <div className="rounded-2xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Envios pendentes</p><p className="text-lg font-semibold">{data.pending_shipments}</p></div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vendas recentes</h3>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadCsv("vendas.csv", data.sales)}><Download className="h-4 w-4" /> CSV</Button>
        </div>
        {data.sales.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda.</p>}
        {data.sales.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl bg-card border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{s.title || "Item"}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), "dd/MM/yy")} · taxa {brl(s.platform_fee_total)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{brl(s.sale_price)}</p>
              <Badge variant="outline" className="text-[10px]">{s.shipping_status}</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Anúncios de usuários</h3>
        {data.listings.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-2">
            <img src={l.image_url} alt="" className="h-12 w-16 rounded-lg object-cover bg-muted" loading="lazy" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{l.title}</p>
              <p className="text-xs text-muted-foreground">@{l.username || "—"} · {brl(l.price)} · {l.status}</p>
            </div>
            {l.status === "active" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeListing(l.id)}>Retirar</Button>}
          </div>
        ))}
      </section>
    </div>
  );
};
