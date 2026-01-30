import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const CategoryFilter = ({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) => {
  const { t } = useLanguage();

  const categories = [
    { code: null, label: t.news?.categories?.all || "Todos", icon: "🌐" },
    { code: "collectibles", label: t.news?.categories?.collectibles || "Colecionáveis", icon: "🎮" },
    { code: "motorsport", label: t.news?.categories?.motorsport || "Automobilismo", icon: "🏎️" },
    { code: "aeromodeling", label: t.news?.categories?.aeromodeling || "Aeromodelismo", icon: "✈️" },
    { code: "cars", label: t.news?.categories?.cars || "Carros", icon: "🚗" },
    { code: "planes", label: t.news?.categories?.planes || "Aviões", icon: "🛩️" },
  ];

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((category) => (
          <Button
            key={category.code ?? "all"}
            variant="ghost"
            size="sm"
            onClick={() => onCategoryChange(category.code)}
            className={cn(
              "shrink-0 rounded-full px-3 h-8 text-xs",
              selectedCategory === category.code
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span className="mr-1">{category.icon}</span>
            {category.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
