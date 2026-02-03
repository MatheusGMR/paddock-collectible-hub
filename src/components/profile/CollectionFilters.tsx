import { Factory, Globe, SortAsc, Car, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export type CollectionSortOption = "name" | "brand" | "manufacturer" | "country" | "year";

interface CollectionFiltersProps {
  activeSort: CollectionSortOption;
  onSortChange: (sort: CollectionSortOption) => void;
}

export const CollectionFilters = ({ activeSort, onSortChange }: CollectionFiltersProps) => {
  const options: { key: CollectionSortOption; label: string; icon: React.ElementType }[] = [
    { key: "brand", label: "Marca", icon: Car },
    { key: "manufacturer", label: "Fabricante", icon: Factory },
    { key: "country", label: "País", icon: Globe },
    { key: "year", label: "Ano", icon: Calendar },
    { key: "name", label: "Nome", icon: SortAsc },
  ];

  return (
    <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onSortChange(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
            activeSort === key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
};
