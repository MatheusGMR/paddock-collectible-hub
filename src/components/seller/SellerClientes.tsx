import { useState } from "react";
import { Users, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import type { CustomerData } from "@/hooks/useSellerData";

interface SellerClientesProps {
  customers: CustomerData[];
  loading: boolean;
}

export const SellerClientes = ({ customers, loading }: SellerClientesProps) => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const filtered = customers.filter(
    (c) =>
      (c.buyer_username || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.buyer_city || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Clientes</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum cliente encontrado
            </CardContent>
          </Card>
        ) : (
          filtered.map((customer) => {
            const isExpanded = expandedId === customer.buyer_id;
            return (
              <Card key={customer.buyer_id} className="border-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : customer.buyer_id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={customer.buyer_avatar || ""} />
                      <AvatarFallback className="bg-muted text-sm">
                        {(customer.buyer_username || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-foreground">
                        {customer.buyer_username || "Usuário"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.buyer_city || "—"} • {customer.total_purchases} compra(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatPrice(customer.total_spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Última: {new Date(customer.last_purchase_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-border"
                    >
                      <div className="p-4 space-y-2 bg-muted/20">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Histórico de Compras
                        </p>
                        {customer.purchases.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              {p.listing_image && (
                                <img
                                  src={p.listing_image}
                                  alt=""
                                  className="h-8 w-8 rounded object-cover"
                                />
                              )}
                              <span className="text-sm text-foreground truncate max-w-[180px]">
                                {p.listing_title || "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                {formatPrice(p.sale_price)}
                              </span>
                              <Badge
                                variant="secondary"
                                className={
                                  p.status === "completed"
                                    ? "bg-green-500/10 text-green-500"
                                    : p.status === "paid_out"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-amber-500/10 text-amber-500"
                                }
                              >
                                {p.status === "completed"
                                  ? "OK"
                                  : p.status === "paid_out"
                                  ? "Pago"
                                  : "Pendente"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
