import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Share, PlusSquare, Copy, Download, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/paddock-logo.png";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export const INSTALL_URL = "https://paddockonline.com/instalar";

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
const isInApp = /Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|CriOS|FxiOS|EdgiOS/i.test(ua);
const isMobile = isIOS || /Android/i.test(ua);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const Install = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(INSTALL_URL); toast({ title: "Link copiado" }); }
    catch { toast({ title: "Copie o link: " + INSTALL_URL }); }
  };

  const Step = ({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{n}</span>
      <p className="flex-1 text-sm text-foreground">{children}</p>
      <span className="text-primary">{icon}</span>
    </div>
  );

  let content: React.ReactNode;
  if (installed) {
    content = (
      <>
        <p className="text-muted-foreground">O Paddock já está na sua tela de início.</p>
        <Button className="w-full rounded-xl" onClick={() => navigate("/auth")}>Abrir Paddock</Button>
      </>
    );
  } else if (isIOS && isInApp) {
    content = (
      <>
        <p className="text-muted-foreground">No iPhone, a instalação só funciona pelo <b className="text-foreground">Safari</b>. Copie o link e abra no Safari.</p>
        <Button className="w-full rounded-xl gap-2" onClick={copy}><Copy className="h-4 w-4" />Copiar link</Button>
      </>
    );
  } else if (isIOS) {
    content = (
      <>
        <div className="w-full space-y-3">
          <Step n={1} icon={<Share className="h-5 w-5" />}>Toque em <b>Compartilhar</b> na barra do Safari</Step>
          <Step n={2} icon={<PlusSquare className="h-5 w-5" />}>Escolha <b>Adicionar à Tela de Início</b></Step>
        </div>
        <ArrowDown className="mt-4 h-8 w-8 animate-bounce text-primary" />
      </>
    );
  } else if (isMobile) {
    content = deferred ? (
      <Button className="w-full rounded-xl gap-2 h-12" onClick={install}><Download className="h-5 w-5" />Instalar Paddock</Button>
    ) : (
      <div className="w-full space-y-3">
        <Step n={1} icon={<span className="text-lg font-bold">⋮</span>}>Toque no menu do navegador</Step>
        <Step n={2} icon={<PlusSquare className="h-5 w-5" />}>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></Step>
      </div>
    );
  } else {
    content = (
      <>
        <p className="text-muted-foreground">Aponte a câmera do celular para o código e abra o link.</p>
        <div className="rounded-2xl bg-foreground p-4"><QRCodeSVG value={INSTALL_URL} size={180} bgColor="transparent" fgColor="hsl(var(--background))" /></div>
        {deferred && <Button variant="outline" className="w-full rounded-xl" onClick={install}>Instalar neste computador</Button>}
      </>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        <img src={logo} alt="Paddock" className="h-20 w-20 rounded-[28px]" />
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Instale o Paddock</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso rápido direto da sua tela de início.</p>
        </div>
        {content}
      </div>
    </main>
  );
};

export default Install;
