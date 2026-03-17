import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Separator } from "@/components/ui/separator";

interface ShippingLabelProps {
  orderId: string;
  orderUrl: string;
  buyerName: string;
  buyerCity: string | null;
  items: Array<{ title: string; price: number; currency: string; image_url: string }>;
  sellerName: string;
  trackingCode: string | null;
}

export const ShippingLabel = forwardRef<HTMLDivElement, ShippingLabelProps>(
  ({ orderId, orderUrl, buyerName, buyerCity, items, sellerName, trackingCode }, ref) => {
    const formatPrice = (price: number, currency: string) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(price);

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 w-full max-w-md mx-auto border-2 border-dashed border-black print:border-solid"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold tracking-tight">PADDOCK</h2>
          <p className="text-xs text-gray-500">Etiqueta de Envio</p>
        </div>

        <Separator className="bg-black/20 mb-4" />

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <QRCodeSVG value={orderUrl} size={120} level="M" />
        </div>

        {trackingCode && (
          <p className="text-center text-sm font-mono font-bold mb-4">
            {trackingCode}
          </p>
        )}

        <Separator className="bg-black/20 mb-4" />

        {/* Destinatário */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Destinatário</p>
          <p className="text-sm font-bold">{buyerName}</p>
          {buyerCity && <p className="text-xs text-gray-600">{buyerCity}</p>}
        </div>

        {/* Remetente */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Remetente</p>
          <p className="text-sm font-bold">{sellerName}</p>
        </div>

        <Separator className="bg-black/20 mb-4" />

        {/* Itens */}
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">
            Itens ({items.length})
          </p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <img
                src={item.image_url}
                alt=""
                className="h-8 w-8 rounded object-cover border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-gray-500">
                  {formatPrice(item.price, item.currency)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-black/20 my-4" />

        <p className="text-[9px] text-center text-gray-400">
          Pedido #{orderId.slice(0, 8)} • paddock-collectible-hub.lovable.app
        </p>
      </div>
    );
  }
);

ShippingLabel.displayName = "ShippingLabel";
