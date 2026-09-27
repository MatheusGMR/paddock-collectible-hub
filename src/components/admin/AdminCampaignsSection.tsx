import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Send, Clock, X, Bell } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { adminDb, AUDIENCES, DESTINATIONS } from "./adminUtils";

interface Campaign {
  id: string; title: string; body: string; image_url: string | null; url: string;
  audience: Record<string, unknown>; scheduled_at: string | null; status: string;
  sent_count: number; failed_count: number; click_count: number; target_count: number; created_at: string;
}

const STATUS: Record<string, string> = { draft: "Rascunho", scheduled: "Agendada", sending: "Enviando", sent: "Enviada", canceled: "Cancelada", paused: "Pausada" };
const empty = { title: "", body: "", image_url: "", url: "/", type: "all", days: "7", city: "", topic: "", when: "" };

export const AdminCampaignsSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [reach, setReach] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data } = await adminDb.from("push_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as Campaign[];
    },
    refetchInterval: 15000,
  });

  const audience = () => {
    const a: Record<string, unknown> = { type: f.type };
    if (f.type === "inactive") a.days = Number(f.days) || 7;
    if (f.type === "city") a.city = f.city.trim();
    if (f.type === "topic") a.topic = f.topic.trim();
    return a;
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.functions.invoke("send-push", { body: { action: "preview", audience: audience() } });
      setReach(data?.count ?? null);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.type, f.days, f.city, f.topic]);

  const save = async (mode: "now" | "schedule") => {
    if (!f.title.trim() || !f.body.trim()) return toast({ title: "Preencha título e mensagem", variant: "destructive" });
    if (mode === "schedule" && !f.when) return toast({ title: "Escolha data e hora", variant: "destructive" });
    setBusy(true);
    try {
      const { data: c, error } = await adminDb.from("push_campaigns").insert({
        title: f.title.trim(), body: f.body.trim(), image_url: f.image_url.trim() || null, url: f.url,
        audience: audience(), created_by: user?.id,
        status: mode === "schedule" ? "scheduled" : "draft",
        scheduled_at: mode === "schedule" ? new Date(f.when).toISOString() : null,
      }).select().single();
      if (error) throw error;
      if (mode === "now") {
        const { data, error: e2 } = await supabase.functions.invoke("send-push", { body: { action: "send_campaign", campaign_id: c.id } });
        if (e2) throw e2;
        toast({ title: "Campanha enviada", description: `${data.sent} de ${data.target} pessoas receberam.` });
      } else {
        toast({ title: "Campanha agendada", description: format(new Date(f.when), "dd/MM 'às' HH:mm", { locale: ptBR }) });
      }
      setF(empty);
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
    } catch (e) {
      toast({ title: "Não foi possível salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    await adminDb.from("push_campaigns").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
  };

  const duplicate = (c: Campaign) => {
    const a = c.audience as Record<string, string>;
    setF({ ...empty, title: c.title, body: c.body, image_url: c.image_url || "", url: c.url, type: a.type || "all", days: String(a.days || 7), city: a.city || "", topic: a.topic || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground">Nova campanha</h3>
        <Input placeholder="Título" maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <Textarea placeholder="Mensagem" maxLength={180} rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <Input placeholder="Link da imagem (opcional)" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={f.url} onValueChange={(v) => setF({ ...f, url: v })}>
            <SelectTrigger><SelectValue placeholder="Abrir em" /></SelectTrigger>
            <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d.value} value={d.value}>Abrir: {d.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {f.type === "inactive" && <Input type="number" min={1} placeholder="Dias sem abrir o app" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} />}
        {f.type === "city" && <Input placeholder="Cidade" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />}
        {f.type === "topic" && <Input placeholder="Tópico (ex.: news, collectibles)" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />}

        {/* Preview */}
        <div className="rounded-2xl bg-muted p-3 flex gap-3">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{f.title || "Título da notificação"}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{f.body || "A mensagem aparece aqui."}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Alcance estimado: <span className="text-foreground font-medium">{reach ?? "…"} pessoas</span> com notificações ativadas</p>

        <Input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save("schedule")} className="gap-1"><Clock className="h-4 w-4" /> Agendar</Button>
          <Button disabled={busy} onClick={() => save("now")} className="gap-1"><Send className="h-4 w-4" /> Enviar agora</Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h3>
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma campanha ainda.</p>}
        {campaigns.map((c) => {
          const rate = c.sent_count ? Math.round((c.click_count / c.sent_count) * 100) : 0;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.body}</p>
                </div>
                <Badge variant="outline">{STATUS[c.status] || c.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.scheduled_at && c.status === "scheduled" ? `Agendada para ${format(new Date(c.scheduled_at), "dd/MM HH:mm")} · ` : ""}
                Público {c.target_count} · Entregues {c.sent_count} · Falhas {c.failed_count} · Cliques {c.click_count} ({rate}%)
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="gap-1" onClick={() => duplicate(c)}><Copy className="h-3 w-3" /> Duplicar</Button>
                {c.status === "scheduled" && <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "paused")}>Pausar</Button>}
                {c.status === "paused" && <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "scheduled")}>Retomar</Button>}
                {["scheduled", "paused"].includes(c.status) && (
                  <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => setStatus(c.id, "canceled")}><X className="h-3 w-3" /> Cancelar</Button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
