import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsArticle, formatRelativeTime } from "@/lib/api/news";
import { useLanguage } from "@/contexts/LanguageContext";

interface NewsCardProps {
  article: NewsArticle;
  variant?: "default" | "featured";
}

const categoryIcons: Record<string, string> = {
  collectibles: "🎮",
  motorsport: "🏎️",
  aeromodeling: "✈️",
  cars: "🚗",
  planes: "🛩️",
};

const categoryColors: Record<string, string> = {
  collectibles: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  motorsport: "bg-red-500/20 text-red-400 border-red-500/30",
  aeromodeling: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  cars: "bg-green-500/20 text-green-400 border-green-500/30",
  planes: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export const NewsCard = ({ article, variant = "default" }: NewsCardProps) => {
  const { t } = useLanguage();
  const isFeatured = variant === "featured";

  const handleClick = () => {
    window.open(article.source_url, "_blank", "noopener,noreferrer");
  };

  const categoryLabel = t.news?.categories?.[article.category as keyof typeof t.news.categories] || article.category;

  return (
    <Card
      onClick={handleClick}
      className={`
        overflow-hidden cursor-pointer transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
        bg-card border-border
        ${isFeatured ? "col-span-2" : ""}
      `}
    >
      {/* Image */}
      <div className={`relative ${isFeatured ? "aspect-[2/1]" : "aspect-[16/10]"} bg-muted overflow-hidden`}>
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl opacity-30">
              {categoryIcons[article.category] || "📰"}
            </span>
          </div>
        )}
        
        {/* Category badge */}
        <Badge 
          className={`absolute top-2 left-2 text-xs ${categoryColors[article.category] || "bg-muted"}`}
        >
          {categoryIcons[article.category]} {categoryLabel}
        </Badge>
        
        {/* Featured badge */}
        {article.is_featured && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            ⭐ {t.news?.featured || "Destaque"}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className={`
          font-semibold text-foreground leading-tight
          ${isFeatured ? "text-base mb-2" : "text-sm mb-1.5"}
          line-clamp-2
        `}>
          {article.title}
        </h3>
        
        {article.summary && (
          <p className={`
            text-foreground-secondary leading-relaxed
            ${isFeatured ? "text-sm line-clamp-2 mb-2" : "text-xs line-clamp-2 mb-2"}
          `}>
            {article.summary}
          </p>
        )}

        {/* Source and time */}
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <div className="flex items-center gap-1.5">
            {article.source_logo ? (
              <img 
                src={article.source_logo} 
                alt={article.source_name}
                className="w-4 h-4 rounded-sm object-contain"
              />
            ) : (
              <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-[10px]">
                {article.source_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate max-w-[100px]">{article.source_name}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span>{formatRelativeTime(article.published_at)}</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </div>
    </Card>
  );
};
