import { Check, Package, Truck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "confirmed", label: "Venda Confirmada", icon: Check },
  { key: "preparing", label: "Preparando Envio", icon: Package },
  { key: "in_transit", label: "Em Trânsito", icon: Truck },
  { key: "delivered", label: "Entregue", icon: MapPin },
] as const;

type ShippingStatus = typeof STEPS[number]["key"];

interface OrderTimelineProps {
  status: string;
}

export const OrderTimeline = ({ status }: OrderTimelineProps) => {
  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="w-full px-2">
      {/* Desktop / tablet horizontal */}
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted z-0" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 flex-1">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isDone && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 border-primary text-primary scale-110",
                  isFuture && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={cn(
                  "text-[11px] mt-2 text-center leading-tight font-medium",
                  isDone && "text-primary",
                  isCurrent && "text-foreground",
                  isFuture && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SHIPPING_STEPS = STEPS;
export type { ShippingStatus };
