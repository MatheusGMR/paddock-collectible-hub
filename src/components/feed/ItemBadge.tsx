import { Info } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface ItemBadgeProps {
  item: {
    brand: string;
    model: string;
    year: string;
    scale: string;
    origin?: string;
    historicalFact?: string;
  };
}

export const ItemBadge = ({ item }: ItemBadgeProps) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="item-badge hover:bg-muted/80 transition-colors">
          <span className="text-primary font-semibold">{item.brand}</span>
          <span className="text-foreground-secondary">•</span>
          <span>{item.model}</span>
          <span className="text-foreground-secondary">•</span>
          <span>{item.year}</span>
          <Info className="h-3 w-3 ml-1 text-primary" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-card border-t border-border">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl text-foreground">Item Details</DrawerTitle>
        </DrawerHeader>
        <div className="px-6 pb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Brand" value={item.brand} />
            <DetailRow label="Model" value={item.model} />
            <DetailRow label="Year" value={item.year} />
            <DetailRow label="Scale" value={item.scale} />
          </div>
          {item.origin && (
            <DetailRow label="Origin" value={item.origin} fullWidth />
          )}
          {item.historicalFact && (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-wide text-foreground-secondary mb-1">Historical Fact</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{item.historicalFact}</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const DetailRow = ({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) => (
  <div className={fullWidth ? "col-span-2" : ""}>
    <p className="text-xs uppercase tracking-wide text-foreground-secondary mb-0.5">{label}</p>
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);
