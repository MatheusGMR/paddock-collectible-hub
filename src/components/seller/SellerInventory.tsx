import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Search, Eye, Share2, Upload } from "lucide-react";
import { shareViaWhatsApp } from "@/lib/shareWhatsApp";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditListingSheet } from "./EditListingSheet";
import type { InventoryData } from "@/hooks/useSellerData";

interface SellerInventoryProps {
  inventory: InventoryData | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const SellerInventory = ({ inventory, loading, onRefresh }: SellerInventoryProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");
  const [editItem, setEditItem] = useState<any>(null);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-card rounded-xl animate-pulse" />
        <div className="h-64 bg-card rounded-xl animate-pulse" />
      </div>
    );
  }

  const activeItems = inventory?.active || [];
  const soldItems = inventory?.sold || [];

  const filteredActive = activeItems.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredSold = soldItems.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);

  const openWhatsAppShare = (text: string) => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inventory?.total_active || 0}</p>
                <p className="text-xs text-muted-foreground">Itens Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inventory?.total_sold || 0}</p>
                <p className="text-xs text-muted-foreground">Vendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="text-amber-500 font-bold text-sm">R$</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatPrice(inventory?.total_value || 0, "BRL")}
                </p>
                <p className="text-xs text-muted-foreground">Valor em Estoque</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no estoque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/seller/importar")}
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Anúncio
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="active">Ativos ({activeItems.length})</TabsTrigger>
          <TabsTrigger value="sold">Vendidos ({soldItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActive.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum item ativo no estoque
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActive.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditItem(item)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {item.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatPrice(item.price, item.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.source_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary inline-flex"
                          title="Compartilhar via WhatsApp"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/listing/${item.id}`;
                            const text = [
                              `🏎️ *${item.title}*`,
                              `💰 *${formatPrice(item.price, item.currency)}*`,
                              "",
                              "Miniatura disponível na Paddock!",
                              "Compre com segurança via Apple Pay, Google Pay ou cartão.",
                              "",
                              `👉 ${url}`,
                            ].join("\n");
                            openWhatsAppShare(text);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="sold">
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Vendido em</TableHead>
                  <TableHead>Envio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSold.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum item vendido
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSold.map((item: any) => {
                    const shippingBadge: Record<string, { label: string; className: string }> = {
                      confirmed: { label: "Confirmado", className: "bg-green-500/10 text-green-600" },
                      preparing: { label: "Preparando", className: "bg-amber-500/10 text-amber-600" },
                      in_transit: { label: "Em Trânsito", className: "bg-blue-500/10 text-blue-600" },
                      delivered: { label: "Entregue", className: "bg-primary/10 text-primary" },
                    };
                    const badge = shippingBadge[item.shipping_status] || shippingBadge.confirmed;
                    return (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditItem(item)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                            <span className="font-medium text-foreground truncate max-w-[200px]">
                              {item.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(item.sale_price || item.price, item.currency)}
                        </TableCell>
                        <TableCell className="text-green-500 font-semibold">
                          {formatPrice(item.seller_net || 0, item.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {item.sold_at
                            ? new Date(item.sold_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Sheet */}
      <EditListingSheet
        listing={editItem}
        open={!!editItem}
        onOpenChange={(open) => { if (!open) setEditItem(null); }}
        onSaved={() => {
          setEditItem(null);
          onRefresh?.();
        }}
      />
    </div>
  );
};