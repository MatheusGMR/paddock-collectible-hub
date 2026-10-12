import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { INSTALL_URL } from "@/pages/Install";

export const AdminInstallLinkCard = () => {
  const { toast } = useToast();
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Paddock", text: "Instale o Paddock no seu celular:", url: INSTALL_URL }); return; } catch { return; }
    }
    await navigator.clipboard.writeText(INSTALL_URL).catch(() => undefined);
    toast({ title: "Link copiado" });
  };
  return (
    <div className="mb-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="rounded-xl bg-foreground p-2"><QRCodeSVG value={INSTALL_URL} size={72} bgColor="transparent" fgColor="hsl(var(--background))" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Link de instalação</p>
        <p className="truncate text-xs text-muted-foreground">{INSTALL_URL}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="rounded-xl gap-1" onClick={share}><Share2 className="h-3.5 w-3.5" />Compartilhar</Button>
          <Button size="sm" variant="outline" className="rounded-xl gap-1" onClick={() => { navigator.clipboard.writeText(INSTALL_URL); toast({ title: "Link copiado" }); }}><Copy className="h-3.5 w-3.5" />Copiar</Button>
        </div>
      </div>
    </div>
  );
};
