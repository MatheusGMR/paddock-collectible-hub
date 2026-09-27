import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminUser } from "@/hooks/useAdmin";
import { adminDb } from "./adminUtils";

interface Props { user: AdminUser | null; onClose: () => void }

export const AdminUserActions = ({ user, onClose }: Props) => {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [sub, setSub] = useState<{ status: string; trial_ends_at: string } | null>(null);
  const [devices, setDevices] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!user) return;
    const uid = user.user_id;
    Promise.all([
      adminDb.from("user_roles").select("id").eq("user_id", uid).eq("role", "admin"),
      adminDb.from("user_moderation").select("blocked").eq("user_id", uid).maybeSingle(),
      adminDb.from("user_subscriptions").select("status,trial_ends_at").eq("user_id", uid).maybeSingle(),
      adminDb.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]).then(([r, m, s, p]) => {
      setIsAdmin(!!r.data?.length);
      setBlocked(!!m.data?.blocked);
      setSub(s.data);
      setDevices(p.count ?? 0);
    });
  }, [user]);

  if (!user) return null;

  const toggleAdmin = async (v: boolean) => {
    const q = v
      ? adminDb.from("user_roles").insert({ user_id: user.user_id, role: "admin" })
      : adminDb.from("user_roles").delete().eq("user_id", user.user_id).eq("role", "admin");
    const { error } = await q;
    if (error) return toast({ title: "Erro ao alterar acesso", variant: "destructive" });
    setIsAdmin(v);
  };

  const toggleBlock = async (v: boolean) => {
    const { error } = await adminDb.from("user_moderation").upsert({ user_id: user.user_id, blocked: v, updated_at: new Date().toISOString() });
    if (error) return toast({ title: "Erro ao bloquear", variant: "destructive" });
    setBlocked(v);
  };

  const sendPush = async () => {
    if (!title.trim() || !body.trim()) return;
    const { data, error } = await supabase.functions.invoke("send-push", { body: { title, body, user_ids: [user.user_id] } });
    toast({ title: error || !data?.sent ? "Não entregue" : "Notificação enviada", description: error ? undefined : !data?.sent ? "Essa pessoa não tem notificações ativadas." : undefined, variant: error ? "destructive" : "default" });
    if (!error) { setTitle(""); setBody(""); }
  };

  return (
    <Sheet open={!!user} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] overflow-y-auto scrollbar-hide">
        <SheetHeader><SheetTitle>@{user.username}</SheetTitle></SheetHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {user.collection_count} carrinhos · {user.posts_count} posts · {devices} aparelho(s) com notificação
            {sub ? ` · Assinatura: ${sub.status}` : ""}
          </p>
          <div className="flex items-center justify-between"><span className="text-sm">Administrador</span><Switch checked={isAdmin} onCheckedChange={toggleAdmin} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Bloquear conta (não recebe campanhas)</span><Switch checked={blocked} onCheckedChange={toggleBlock} /></div>
          <div className="space-y-2 rounded-2xl border border-border p-3">
            <p className="text-sm font-medium">Enviar notificação</p>
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} />
            <Button size="sm" onClick={sendPush} disabled={!devices}>Enviar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
