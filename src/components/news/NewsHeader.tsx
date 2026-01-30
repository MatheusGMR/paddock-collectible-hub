import { Search, Settings, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { CategoryFilter } from "./CategoryFilter";

interface NewsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  onSettingsClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const NewsHeader = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onSettingsClick,
  onRefresh,
  isRefreshing,
}: NewsHeaderProps) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
      {/* Search Bar */}
      <div className="p-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
          <Input
            placeholder={t.news?.searchPlaceholder || "Buscar notícias..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-muted border-0 text-foreground placeholder:text-foreground-secondary focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onSettingsClick}
          className="shrink-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
    </header>
  );
};
