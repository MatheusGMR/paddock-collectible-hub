import { Factory, Ruler, Palette, MapPin, Calendar, Star, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollectibleSpecsProps {
  manufacturer: string;
  scale: string;
  color?: string;
  origin?: string;
  series?: string;
  condition?: string;
  year?: string;
}

export const CollectibleSpecs = ({
  manufacturer,
  scale,
  color,
  origin,
  series,
  condition,
  year
}: CollectibleSpecsProps) => {
  const specs = [
    { icon: Factory, label: "Fabricante", value: manufacturer },
    { icon: Ruler, label: "Escala", value: scale },
    { icon: Palette, label: "Cor", value: color },
    { icon: MapPin, label: "Origem", value: origin },
    { icon: Package, label: "Série", value: series },
    { icon: Star, label: "Estado", value: condition },
    { icon: Calendar, label: "Ano", value: year },
  ].filter(spec => spec.value);

  return (
    <div className="grid grid-cols-2 gap-2">
      {specs.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50"
        >
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-xs font-medium text-foreground truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
