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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
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
      <div className="flex items-center justify-center px-4 py-12">
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

  // Inner page back button
  const BackHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={() => setTab("menu")} className="p-2 -ml-2 rounded-lg hover:bg-muted/50 transition-colors">
        <ArrowLeft className="h-5 w-5 text-foreground" />
      </button>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );

  // Render inner content
  if (tab === "estoque") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Estoque" />
        <SellerInventory inventory={inventory} loading={false} />
      </div>
    );
  }
  if (tab === "pedidos") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Pedidos" />
        <SellerOrders />
      </div>
    );
  }
  if (tab === "analytics") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Desempenho" />
        <SellerAnalytics />
      </div>
    );
  }
  if (tab === "financeiro") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Financeiro" />
        <SellerFinanceiro receivables={receivables} loading={false} />
      </div>
    );
  }
  if (tab === "conta") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Conta" />
        <SellerConta sellerDetails={sellerDetails} onSave={saveSellerDetails} loading={false} />
      </div>
    );
  }
  if (tab === "clientes") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Clientes" />
        <SellerClientes customers={customers} loading={false} />
      </div>
    );
  }
  if (tab === "importar") {
    return (
      <div className="px-4 pt-2 pb-4">
        <BackHeader title="Importar" />
        <SellerImport />
      </div>
    );
  }

  // Main menu
  return (
    <div className="px-4 pt-2 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minha Loja</h1>
          <p className="text-sm text-muted-foreground">{sellerDetails?.business_name || "Painel do Lojista"}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9">
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
      </div>

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
  );
};

export default SellerMobilePage;
