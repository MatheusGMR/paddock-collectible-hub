import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface SourceFilterProps {
  selectedCountry: string | null;
  onCountryChange: (country: string | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const SourceFilter = ({
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
}: SourceFilterProps) => {
  const { t } = useLanguage();

  const countries = [
    { code: null, label: t.mercado.countries.all, flag: "🌎" },
    { code: "BR", label: t.mercado.countries.BR, flag: "🇧🇷" },
    { code: "US", label: t.mercado.countries.US, flag: "🇺🇸" },
    { code: "JP", label: t.mercado.countries.JP, flag: "🇯🇵" },
    { code: "CN", label: t.mercado.countries.CN, flag: "🇨🇳" },
  ];

  const categories = [
    { code: null, label: t.mercado.categories.all },
    { code: "marketplace", label: t.mercado.categories.marketplace },
    { code: "specialized", label: t.mercado.categories.specialized },
    { code: "official", label: t.mercado.categories.official },
    { code: "internal", label: t.mercado.categories.internal },
  ];

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Country Filter */}
      <div>
        <p className="text-xs font-medium text-foreground-secondary mb-2">{t.mercado.region}</p>
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
        <p className="text-xs font-medium text-foreground-secondary mb-2">{t.mercado.storeType}</p>
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
