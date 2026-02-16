import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { SellerInventory } from "@/components/seller/SellerInventory";
import { SellerFinanceiro } from "@/components/seller/SellerFinanceiro";
import { SellerConta } from "@/components/seller/SellerConta";
import { SellerClientes } from "@/components/seller/SellerClientes";
import { useSellerData } from "@/hooks/useSellerData";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, Store, ArrowLeft, Share2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SellerPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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

  // Still loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  // Not a seller — show activation prompt
  if (!isSeller) {
    const handleActivate = async () => {
      setActivating(true);
      await activateSeller();
      setActivating(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SellerSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-14 flex items-center gap-3 border-b border-border px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-foreground flex-1">Painel do Lojista</h1>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const storeName = sellerDetails?.business_name || "minha loja";
                const url = `${window.location.origin}/user/${user?.id}`;
                const text = [
                  `🏁 *${storeName}* na Paddock`,
                  ``,
                  `Miniaturas exclusivas, peças raras e colecionáveis selecionados a dedo.`,
                  ``,
                  `🔍 Veja o catálogo completo:`,
                  url,
                  ``,
                  `📦 Envio para todo o Brasil`,
                  `💳 Pagamento seguro via Apple Pay, Google Pay e cartão`,
                ].join("\n");
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar Loja
            </Button>
          </header>
          <div className="p-6">
            <Routes>
              <Route
                index
                element={<SellerInventory inventory={inventory} loading={false} />}
              />
              <Route
                path="financeiro"
                element={<SellerFinanceiro receivables={receivables} loading={false} />}
              />
              <Route
                path="conta"
                element={
                  <SellerConta
                    sellerDetails={sellerDetails}
                    onSave={saveSellerDetails}
                    loading={false}
                  />
                }
              />
              <Route
                path="clientes"
                element={<SellerClientes customers={customers} loading={false} />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SellerPage;
