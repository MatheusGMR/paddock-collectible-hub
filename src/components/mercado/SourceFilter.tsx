import { Button } from "@/components/ui/button";
import { countryLabels, categoryLabels } from "@/data/marketplaceSources";
import { cn } from "@/lib/utils";

interface SourceFilterProps {
  selectedCountry: string | null;
  onCountryChange: (country: string | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const countries = [
  { code: null, label: "Todos", flag: "🌎" },
  { code: "BR", label: "Brasil", flag: "🇧🇷" },
  { code: "US", label: "EUA", flag: "🇺🇸" },
  { code: "JP", label: "Japão", flag: "🇯🇵" },
  { code: "CN", label: "China", flag: "🇨🇳" },
];

const categories = [
  { code: null, label: "Todas" },
  { code: "marketplace", label: "Marketplaces" },
  { code: "specialized", label: "Especializadas" },
  { code: "official", label: "Oficiais" },
  { code: "internal", label: "Paddock" },
];

export const SourceFilter = ({
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
}: SourceFilterProps) => {
  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Country Filter */}
      <div>
        <p className="text-xs font-medium text-foreground-secondary mb-2">Região</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {countries.map((country) => (
            <Button
              key={country.code ?? "all"}
              variant="ghost"
              size="sm"
              onClick={() => onCountryChange(country.code)}
              className={cn(
                "shrink-0 rounded-full px-3 h-8 text-xs",
                selectedCountry === country.code
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              <span className="mr-1">{country.flag}</span>
              {country.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <p className="text-xs font-medium text-foreground-secondary mb-2">Tipo de Loja</p>
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
              {category.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
