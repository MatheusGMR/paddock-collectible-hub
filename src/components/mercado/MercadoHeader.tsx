import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SourceFilter } from "./SourceFilter";
import { useLanguage } from "@/contexts/LanguageContext";

interface MercadoHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCountry: string | null;
  onCountryChange: (country: string | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export const MercadoHeader = ({
  searchQuery,
  onSearchChange,
  selectedCountry,
  onCountryChange,
  selectedCategory,
  onCategoryChange,
}: MercadoHeaderProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
      {/* Search Bar */}
      <div className="p-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
          <Input
            placeholder={t.mercado.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <SourceFilter
          selectedCountry={selectedCountry}
          onCountryChange={onCountryChange}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      )}
    </header>
  );
};
