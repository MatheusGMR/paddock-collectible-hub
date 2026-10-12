import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Apple, Smartphone, ScanLine, Sparkles, ShieldCheck, Wallet, LayoutGrid, Users, Newspaper, MessageCircle, Store, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/paddock-logo.png";
import hero from "@/assets/landing/hero.jpg";
import painClutter from "@/assets/landing/pain-clutter.jpg";
import painNotes from "@/assets/landing/pain-notes.jpg";
import painValue from "@/assets/landing/pain-value.jpg";
import painAlone from "@/assets/landing/pain-alone.jpg";
import scan from "@/assets/landing/scan.jpg";
import collection from "@/assets/landing/collection.jpg";
import social from "@/assets/landing/social.jpg";

const INSTALL = "https://paddockonline.com/instalar";
// Até o app iOS ter link oficial na App Store, o botão leva à instalação pela tela de início.
const APP_STORE_URL = INSTALL;

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iPad|iPhone|iPod/.test(ua);
const isAndroid = /Android/i.test(ua);
const isMobile = isIOS || isAndroid;

const Reveal = ({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-1000 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  );
};

const DownloadButtons = ({ center = false }: { center?: boolean }) => {
  const navigate = useNavigate();
  const ios = (
    <Button key="ios" size="lg" variant={isAndroid ? "outline" : "default"} className="h-14 gap-3 rounded-xl px-6"
      onClick={() => (window.location.href = APP_STORE_URL)}>
      <Apple className="h-6 w-6" />
      <span className="flex flex-col items-start leading-tight"><span className="text-[10px] opacity-80">Baixar na</span><span className="text-base font-semibold">App Store</span></span>
    </Button>
  );
  const android = (
    <Button key="and" size="lg" variant={isAndroid ? "default" : "outline"} className="h-14 gap-3 rounded-xl px-6"
      onClick={() => navigate("/instalar")}>
      <Smartphone className="h-6 w-6" />
      <span className="flex flex-col items-start leading-tight"><span className="text-[10px] opacity-80">Instalar no</span><span className="text-base font-semibold">Android</span></span>
    </Button>
  );
  return (
    <div className={`flex flex-col gap-6 sm:flex-row sm:items-center ${center ? "items-center justify-center" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row">{isAndroid ? [android, ios] : [ios, android]}</div>
      {!isMobile && (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-foreground p-2"><QRCodeSVG value={INSTALL} size={64} bgColor="transparent" /></div>
          <p className="max-w-[140px] text-xs text-muted-foreground">Aponte a câmera do celular para instalar</p>
        </div>
      )}
    </div>
  );
};

const pains = [
  { img: painClutter, title: "Caixas e prateleiras lotadas", text: "Centenas de carrinhos e nenhuma ideia clara do que você realmente tem." },
  { img: painNotes, title: "Anotações que se perdem", text: "Planilhas, papéis e listas que nunca estão completas nem atualizadas." },
  { img: painValue, title: "Quanto vale? É raro?", text: "Sem saber a origem, a raridade ou o valor de uma peça que pode ser única." },
  { img: painAlone, title: "Uma paixão solitária", text: "Ninguém por perto para mostrar, comparar ou trocar suas descobertas." },
];

const steps = [
  { icon: ScanLine, title: "Aponte e capture", text: "Fotografe um carrinho ou vários de uma vez. O Paddock separa cada um sozinho." },
  { icon: Sparkles, title: "Identificado em segundos", text: "Marca, modelo, ano, fabricante, escala, série e país de origem, na hora." },
  { icon: ShieldCheck, title: "Índice de raridade certificado", text: "Nota de 0 a 100 com 6 critérios: raridade, exclusividade, estado e embalagem, fabricante, idade e escala." },
  { icon: Wallet, title: "Saiba quanto vale", text: "O valor aproximado de cada colecionável em reais, logo depois da captura." },
  { icon: LayoutGrid, title: "Sua coleção, em números", text: "Valor total, peças mais raras e organização por marca, país, ano ou fabricante." },
];

const socials = [
  { icon: Users, title: "Coleções de outros colecionadores", text: "Veja o que a comunidade tem e descubra peças que você nem sabia que existiam." },
  { icon: Newspaper, title: "Novidades e lançamentos", text: "Notícias de colecionáveis, automobilismo e carros, em um só lugar." },
  { icon: MessageCircle, title: "Converse e troque", text: "Mensagens diretas com quem divide a mesma paixão." },
  { icon: Store, title: "Mercado", text: "Compre e venda com segurança, com o valor de referência sempre à vista." },
];

const Landing = () => {
  useEffect(() => {
    document.title = "Paddock — A rede social do colecionador de carrinhos";
    const m = document.querySelector('meta[name="description"]');
    const prev = m?.getAttribute("content");
    m?.setAttribute("content", "Capture seus carrinhos, descubra raridade e valor em segundos e compartilhe sua coleção com outros apaixonados por carros.");
    return () => { if (prev) m?.setAttribute("content", prev); };
  }, []);

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background text-foreground scrollbar-hide">
      {/* Abertura */}
      <section className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden">
        <img src={hero} alt="Miniatura de Porsche sob luz azul" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
        <header className="absolute left-0 right-0 top-0 flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.5rem)]">
          <img src={logo} alt="Paddock" className="h-9 w-auto" />
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => (window.location.href = "/auth")}>Entrar</Button>
        </header>
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-16">
          <Reveal>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-primary">Paddock</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Sua coleção merece mais do que uma prateleira.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Aponte a câmera. Em segundos, você sabe o que tem, de onde veio, quão raro é e quanto vale.
            </p>
          </Reveal>
          <Reveal delay={200} className="mt-10"><DownloadButtons /></Reveal>
          <ChevronDown className="mx-auto mt-12 h-6 w-6 animate-bounce text-muted-foreground" />
        </div>
      </section>

      {/* Dor */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Todo colecionador conhece</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">A paixão cresce. O controle, não.</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {pains.map((p, i) => (
            <Reveal key={p.title} delay={i * 120}>
              <article className="group overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={p.img} alt={p.title} loading="lazy" width={1024} height={768}
                    className="h-full w-full object-cover grayscale-[40%] transition-transform duration-[1500ms] group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-muted-foreground">{p.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Virada */}
      <section className="relative overflow-hidden py-32 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]" />
        <Reveal className="relative mx-auto max-w-3xl px-6">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">E se bastasse apontar a câmera?</h2>
          <p className="mt-6 text-lg text-muted-foreground">O Paddock transforma cada carrinho em uma história completa.</p>
        </Reveal>
      </section>

      {/* Mágica */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 md:grid-cols-2">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-primary/30 shadow-[0_0_80px_-20px_hsl(var(--primary)/0.6)]">
            <img src={scan} alt="Celular identificando uma miniatura" loading="lazy" width={1024} height={1280} className="h-full w-full object-cover" />
          </div>
        </Reveal>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="flex gap-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><s.icon className="h-6 w-6" /></span>
                <div>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-1 text-muted-foreground">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Coleção */}
      <section className="relative overflow-hidden">
        <img src={collection} alt="Coleção iluminada" loading="lazy" width={1280} height={960} className="h-[70vh] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background" />
        <Reveal className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-6 pb-16">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">Do caos à vitrine.</h2>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Toda a sua coleção avaliada em valor e raridade, sempre à mão.</p>
          <div className="mt-8"><DownloadButtons /></div>
        </Reveal>
      </section>

      {/* Números */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-24 md:grid-cols-4">
        {[["Segundos", "para identificar"], ["6 critérios", "no índice de raridade"], ["R$", "valor aproximado de cada peça"], ["1 toque", "para compartilhar"]].map(([a, b], i) => (
          <Reveal key={a} delay={i * 100} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-2xl font-semibold text-primary sm:text-3xl">{a}</p>
            <p className="mt-1 text-sm text-muted-foreground">{b}</p>
          </Reveal>
        ))}
      </section>

      {/* Social */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 md:grid-cols-2">
        <div>
          <Reveal>
            <p className="text-sm uppercase tracking-[0.3em] text-primary">Uma nova rede social</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Feita para quem é apaixonado por carros.</h2>
          </Reveal>
          <div className="mt-10 space-y-6">
            {socials.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="flex gap-4">
                  <s.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <div><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-muted-foreground">{s.text}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal>
          <img src={social} alt="Colecionadores compartilhando miniaturas" loading="lazy" width={1280} height={960} className="rounded-3xl border border-border object-cover" />
        </Reveal>
      </section>

      {/* Final */}
      <section className="relative overflow-hidden px-6 py-32 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <Reveal className="relative mx-auto max-w-3xl">
          <img src={logo} alt="Paddock" className="mx-auto mb-8 h-12 w-auto" />
          <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">Comece sua coleção no Paddock.</h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">Grátis para baixar. Seu primeiro carrinho identificado em segundos.</p>
          <div className="mt-10"><DownloadButtons center /></div>
        </Reveal>
      </section>

      <footer className="border-t border-border px-6 py-10 pb-28 text-center text-xs text-muted-foreground sm:pb-10">
        © {new Date().getFullYear()} Paddock · <a href="/privacy" className="underline">Privacidade</a>
      </footer>

      {/* Barra fixa no celular */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl">
          <Button className="h-12 w-full rounded-xl text-base font-semibold"
            onClick={() => (isIOS ? (window.location.href = APP_STORE_URL) : (window.location.href = "/instalar"))}>
            {isIOS ? "Baixar na App Store" : "Instalar no Android"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Landing;
