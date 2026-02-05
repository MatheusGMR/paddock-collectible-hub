import { Loader2, CheckCircle2, XCircle, Video, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QueuedMedia } from "./types";

interface MediaQueueGridProps {
  mediaQueue: QueuedMedia[];
  currentIndex: number;
  onMediaClick?: (index: number) => void;
}

export function MediaQueueGrid({
  mediaQueue,
  currentIndex,
  onMediaClick,
}: MediaQueueGridProps) {
  if (mediaQueue.length === 0) return null;

  const completedCount = mediaQueue.filter(
    (m) => m.status === "success" || m.status === "error"
  ).length;

  return (
    <div className="px-4 py-3 border-b border-border bg-muted/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          {mediaQueue.length} arquivos selecionados
        </span>
        <span className="text-xs text-foreground-secondary">
          {completedCount} de {mediaQueue.length} processados
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(completedCount / mediaQueue.length) * 100}%` }}
        />
      </div>

      {/* Thumbnails grid */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {mediaQueue.map((media, idx) => (
          <button
            key={media.id}
            onClick={() => media.status === "success" && onMediaClick?.(idx)}
            className={cn(
              "relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
              idx === currentIndex
                ? "border-primary ring-2 ring-primary/30"
                : media.status === "success"
                ? "border-emerald-500/50 cursor-pointer hover:border-emerald-500"
                : media.status === "error"
                ? "border-destructive/50"
                : "border-border"
            )}
            disabled={media.status !== "success"}
          >
            {media.isVideo ? (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={media.base64}
                alt={`Arquivo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            )}

            {/* Status overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              {media.status === "analyzing" && (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              )}
              {media.status === "success" && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
              {media.status === "error" && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              {media.status === "pending" && (
                <span className="text-xs text-white/70">{idx + 1}</span>
              )}
            </div>

            {/* Results count badge */}
            {media.status === "success" && media.results && media.results.length > 0 && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center border-2 border-background">
                {media.results.length}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
