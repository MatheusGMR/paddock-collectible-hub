import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { adminDb, DESTINATIONS } from "./adminUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Trigger { key: string; label: string; description: string | null; enabled: boolean; title: string; body: string; url: string; sent_count: number; click_count: number }
interface Settings { max_per_day: number; quiet_start: number; quiet_end: number }

export const AdminTriggersSection = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Trigger>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  const { data: triggers = [] } = useQuery({
    queryKey: ["admin-triggers"],
    queryFn: async () => {
      const { data } = await adminDb.from("push_triggers").select("*").order("created_at");
      return (data || []) as Trigger[];
    },
  });

  useEffect(() => {
    adminDb.from("push_settings").select("*").eq("id", 1).single().then(({ data }: { data: Settings }) => setSettings(data));
  }, []);

  const update = async (key: string, patch: Partial<Trigger>) => {
    const { error } = await adminDb.from("push_triggers").update(patch).eq("key", key);
    if (error) return toast({ title: "Erro ao salvar", variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["admin-triggers"] });
  };

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await adminDb.from("push_settings").update(settings).eq("id", 1);
    toast({ title: error ? "Erro ao salvar" : "Regras salvas", variant: error ? "destructive" : "default" });
  };

  return (
    <div className="space-y-6">
      {settings && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-foreground">Regras gerais</h3>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <label className="space-y-1">Máx. por dia
              <Input type="number" min={1} value={settings.max_per_day} onChange={(e) => setSettings({ ...settings, max_per_day: Number(e.target.value) })} />
            </label>
            <label className="space-y-1">Silêncio das
              <Input type="number" min={0} max={23} value={settings.quiet_start} onChange={(e) => setSettings({ ...settings, quiet_start: Number(e.target.value) })} />
            </label>
            <label className="space-y-1">até às
              <Input type="number" min={0} max={23} value={settings.quiet_end} onChange={(e) => setSettings({ ...settings, quiet_end: Number(e.target.value) })} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Mensagens diretas, vendas e envios de pedido não respeitam o limite nem o silêncio.</p>
          <Button size="sm" onClick={saveSettings}>Salvar regras</Button>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">Use {"{actor}"} para o nome de quem fez a ação e {"{listing}"} para o anúncio.</p>
        {triggers.map((t) => {
          const editing = open === t.key;
          const rate = t.sent_count ? Math.round((t.click_count / t.sent_count) * 100) : 0;
          return (
            <div key={t.key} className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <button className="text-left min-w-0 flex-1" onClick={() => { setOpen(editing ? null : t.key); setDraft(t); }}>
                  <p className="font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description} · {t.sent_count} enviadas · {rate}% abertas</p>
                </button>
                <Switch checked={t.enabled} onCheckedChange={(v) => update(t.key, { enabled: v })} />
              </div>
              {editing && (
                <div className="space-y-2 pt-1">
                  <Input value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  <Input value={draft.body || ""} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                  <Select value={draft.url || "/"} onValueChange={(v) => setDraft({ ...draft, url: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[...DESTINATIONS, { value: "/seller", label: "Painel do lojista" }].map((d) => <SelectItem key={d.value} value={d.value}>Abrir: {d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={async () => { await update(t.key, { title: draft.title, body: draft.body, url: draft.url }); setOpen(null); }}>Salvar</Button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};
