import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, ClipboardList, BarChart3, DollarSign, User, Users, 
  ChevronRight, Store, ArrowLeft, Share2, Copy, MessageCircle,
  Loader2, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import { SellerInventory } from "@/components/seller/SellerInventory";
import { SellerOrders } from "@/components/seller/SellerOrders";
import { SellerAnalytics } from "@/components/seller/SellerAnalytics";
import { SellerFinanceiro } from "@/components/seller/SellerFinanceiro";
import { SellerConta } from "@/components/seller/SellerConta";
import { SellerClientes } from "@/components/seller/SellerClientes";
import { SellerImport } from "@/components/seller/SellerImport";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { shareViaWhatsApp } from "@/lib/shareWhatsApp";

type SellerTab = "menu" | "estoque" | "pedidos" | "analytics" | "financeiro" | "conta" | "clientes" | "importar";

const menuItems = [
  { id: "estoque" as const, title: "Estoque", desc: "Gerencie seus anúncios", icon: Package },
  { id: "pedidos" as const, title: "Pedidos", desc: "Acompanhe suas vendas", icon: ClipboardList },
  { id: "analytics" as const, title: "Desempenho", desc: "Métricas e insights", icon: BarChart3 },
  { id: "financeiro" as const, title: "Financeiro", desc: "Recebíveis e saldo", icon: DollarSign },
  { id: "conta" as const, title: "Conta", desc: "Dados da loja", icon: User },
  { id: "clientes" as const, title: "Clientes", desc: "Base de compradores", icon: Users },
];

const SellerMobilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<SellerTab>("menu");
  const [activating, setActivating] = useState(false);
  const {
    isSeller,
    sellerDetails,
    inventory,
    customers,
    receivables,
    loading,
    saveSellerDetails,
    activateSeller,
  } = useSellerData();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Auto-activate
  useEffect(() => {
    const autoActivate = async () => {
      if (!loading && !isSeller && user) {
        const { data } = await supabase
          .from("profiles")
          .select("is_seller")
          .eq("user_id", user.id)
          .single();
        if (data?.is_seller) {
          await activateSeller();
        }
      }
    };
    autoActivate();
  }, [loading, isSeller, user, activateSeller]);

  // Shared page shell — same pattern as the rest of the app
  const SellerShell = ({
    title,
    subtitle,
    onBack,
    action,
    children,
  }: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    action?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
        <div className="flex h-14 items-center gap-3 px-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <div className="px-4 py-4">{children}</div>
    </div>
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not a seller — activation prompt
  if (!isSeller) {
    const handleActivate = async () => {
      setActivating(true);
      await activateSeller();
      setActivating(false);
    };

    return (
      <SellerShell title="Minha Loja">
        <div className="flex items-center justify-center">
          <Card className="max-w-md w-full border-border">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Tornar-se Lojista</CardTitle>
              <CardDescription>
                Ative o modo lojista para acessar o painel de estoque, financeiro, clientes e gerenciar suas vendas na Paddock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleActivate} disabled={activating} className="w-full gap-2">
                {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                Ativar Modo Lojista
              </Button>
              <Button variant="ghost" onClick={() => navigate("/profile")} className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Perfil
              </Button>
            </CardContent>
          </Card>
        </div>
      </SellerShell>
    );
  }

  const storeUrl = `${window.location.origin}/store/${user?.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    const name = sellerDetails?.business_name || "minha loja";
    const text = `🏁 *${name}* na Paddock\n\nMiniaturas exclusivas e colecionáveis.\n\n🔍 Catálogo: ${storeUrl}`;
    shareViaWhatsApp(text);
  };

  const back = () => setTab("menu");

  if (tab === "estoque") {
    return (
      <SellerShell title="Estoque" onBack={back}>
        <SellerInventory inventory={inventory} loading={false} />
      </SellerShell>
    );
  }
  if (tab === "pedidos") {
    return (
      <SellerShell title="Pedidos" onBack={back}>
        <SellerOrders />
      </SellerShell>
    );
  }
  if (tab === "analytics") {
    return (
      <SellerShell title="Desempenho" onBack={back}>
        <SellerAnalytics />
      </SellerShell>
    );
  }
  if (tab === "financeiro") {
    return (
      <SellerShell title="Financeiro" onBack={back}>
        <SellerFinanceiro receivables={receivables} loading={false} />
      </SellerShell>
    );
  }
  if (tab === "conta") {
    return (
      <SellerShell title="Conta" onBack={back}>
        <SellerConta sellerDetails={sellerDetails} onSave={saveSellerDetails} loading={false} />
      </SellerShell>
    );
  }
  if (tab === "clientes") {
    return (
      <SellerShell title="Clientes" onBack={back}>
        <SellerClientes customers={customers} loading={false} />
      </SellerShell>
    );
  }
  if (tab === "importar") {
    return (
      <SellerShell title="Importar" onBack={back}>
        <SellerImport />
      </SellerShell>
    );
  }

  // Main menu
  return (
    <SellerShell
      title="Minha Loja"
      subtitle={sellerDetails?.business_name || "Painel do Lojista"}
      action={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <button onClick={handleCopyLink} className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors">
              <Copy className="h-4 w-4 text-muted-foreground" />
              Copiar link
            </button>
            <button onClick={handleWhatsApp} className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors">
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp
            </button>
          </PopoverContent>
        </Popover>
      }
    >
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{inventory?.active?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Anúncios ativos</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{inventory?.sold?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Vendidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu Grid */}
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </SellerShell>
  );
};

export default SellerMobilePage;
