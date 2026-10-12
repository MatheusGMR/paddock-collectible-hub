import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getPushPermission, isPushSupported, isSubscribedToPush, subscribeToPush } from "@/lib/pushNotifications";

const KEY = "paddock_push_prompted";

/** First access: one tap enables every notification type (likes, messages, sales, launches, news). */
export const PushPermissionPrompt = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || localStorage.getItem(KEY) || !isPushSupported()) return;
    let cancel = false;
    (async () => {
      if (await isSubscribedToPush()) return localStorage.setItem(KEY, "1");
      const perm = getPushPermission();
      if (perm === "denied") return localStorage.setItem(KEY, "1");
      if (perm === "granted") {
        await subscribeToPush(user.id);
        return localStorage.setItem(KEY, "1");
      }
      const t = setTimeout(() => !cancel && setOpen(true), 1200);
      return () => clearTimeout(t);
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  if (!open || !user) return null;

  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); };
  const enable = async () => {
    setBusy(true);
    try { await subscribeToPush(user.id); } catch { /* ignore */ }
    setBusy(false);
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/70 backdrop-blur-sm p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Ativar notificações</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Receba curtidas, mensagens, vendas, lançamentos e novidades no seu {Capacitor.isNativePlatform() ? "iPhone" : "celular"}.
        </p>
        <Button className="mt-5 w-full rounded-xl" onClick={enable} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Permitir todas"}
        </Button>
        <button className="mt-3 text-sm text-muted-foreground" onClick={close}>Agora não</button>
      </div>
    </div>
  );
};
