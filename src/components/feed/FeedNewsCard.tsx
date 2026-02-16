import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NewsArticle, formatRelativeTime } from "@/lib/api/news";
import { ShareMenu } from "@/components/news/ShareMenu";

const categoryIcons: Record<string, string> = {
  collectibles: "🎮",
  motorsport: "🏎️",
  cars: "🚗",
};

const categoryColors: Record<string, string> = {
  collectibles: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  motorsport: "bg-red-500/20 text-red-400 border-red-500/30",
  cars: "bg-green-500/20 text-green-400 border-green-500/30",
};

interface FeedNewsCardProps {
  article: NewsArticle;
}

export const FeedNewsCard = ({ article }: FeedNewsCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-share-button]")) return;
    window.open(article.source_url, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-4 py-3 transition-colors active:bg-muted/50"
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${categoryColors[article.category] || ""}`}
        >
          {categoryIcons[article.category]} {article.category}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(article.published_at)}
        </span>
      </div>

      <div className="flex gap-3">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground leading-tight line-clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
            {article.source_logo ? (
              <img
                src={article.source_logo}
                alt={article.source_name}
                className="w-3.5 h-3.5 rounded-sm object-contain"
              />
            ) : (
              <div className="w-3.5 h-3.5 rounded-sm bg-muted flex items-center justify-center text-[8px]">
                {article.source_name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="truncate">{article.source_name}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </div>
        </div>

        {/* Thumbnail */}
        {article.image_url && (
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Share */}
      <div className="flex justify-end mt-1" data-share-button>
        <ShareMenu
          url={article.source_url}
          title={article.title}
          summary={article.summary || undefined}
        />
      </div>
    </button>
  );
};
