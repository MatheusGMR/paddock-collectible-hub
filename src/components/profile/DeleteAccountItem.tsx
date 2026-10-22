import { useState } from "react";
import { Trash2, Loader2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canConfirmDeletion, clearDeletedAccountData } from "@/lib/accountDeletion";

export function DeleteAccountItem() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const removeAccount = async () => {
    if (!user || busy || !canConfirmDeletion(confirmation)) return;
    setBusy(true);
    setFailure("");
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirmation } });
      if (error) {
        let message = "Não foi possível excluir sua conta. Tente novamente.";
        if (error.context instanceof Response) {
          const response = await error.context.json().catch(() => null);
          if (typeof response?.error === "string") message = response.error;
        }
        throw new Error(message);
      }
      if (!data?.success) throw new Error(data?.error || "Não foi possível excluir sua conta. Tente novamente.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Não foi possível excluir sua conta.");
      setBusy(false);
      return;
    }
    // The server has confirmed deletion; don't report it as failed if local cleanup fails.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    queryClient.clear();
    await clearDeletedAccountData(user.id).catch(() => {});
    setOpen(false);
    navigate("/auth", { replace: true });
    toast({ title: "Sua conta foi excluída." });
  };

  return <>
    <Button variant="ghost" onClick={() => { setConfirmation(""); setFailure(""); setOpen(true); }}
      className="h-auto w-full justify-between rounded-none p-4 text-destructive/80 hover:bg-destructive/10 hover:text-destructive">
      <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10"><Trash2 className="h-5 w-5" /></span>Excluir conta</span>
      <ChevronRight className="h-5 w-5 opacity-50" />
    </Button>
    <AlertDialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>A exclusão é permanente e remove seu perfil, coleção, posts, mensagens, anúncios e arquivos. Sua assinatura ativa ou em teste será cancelada. Esta ação não pode ser desfeita.</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-account-confirmation">Digite EXCLUIR para confirmar</Label>
          <Input id="delete-account-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} autoComplete="off" autoCorrect="off" spellCheck={false} />
          {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={busy || !canConfirmDeletion(confirmation)} onClick={removeAccount}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Excluindo…" : "Excluir permanentemente"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}