import { Music2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  suggestion: string;
  selectionReason?: string;
  listeningTip?: string;
  carBrand?: string;
  autoPreload?: boolean;
}

// Parse music suggestion to extract song info
const parseMusicSuggestion = (suggestion: string) => {
  // Expected format: "Song Title - Artist (Year)" or "Song Title - Artist"
  const match = suggestion.match(/^(.+?)\s*-\s*(.+?)(?:\s*\((\d{4})\))?$/);
  if (match) {
    return {
      title: match[1].trim(),
      artist: match[2].trim(),
      year: match[3] || null
    };
  }
  return { title: suggestion, artist: "", year: null };
};

// Get Spotify search URL
const getSpotifyUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};

// Get YouTube Music search URL
const getYouTubeMusicUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://music.youtube.com/search?q=${query}`;
};

export const MusicPlayer = ({ 
  suggestion, 
  selectionReason,
  listeningTip,
}: MusicPlayerProps) => {
  const { title, artist, year } = parseMusicSuggestion(suggestion);

  const handlePlayClick = () => {
    window.open(getSpotifyUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleYouTubeMusicClick = () => {
    window.open(getYouTubeMusicUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  if (!suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20 text-primary">
            <Music2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary">Trilha Sonora</p>
            <p className="text-[10px] text-muted-foreground">
              Toque para ouvir no Spotify
            </p>
          </div>
        </div>

        {/* Song info and main play button */}
        <div className="flex items-center gap-3">
          {/* Album art placeholder */}
          <div className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
            <Music2 className="h-6 w-6 text-primary/60" />
          </div>

          {/* Song details */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{title}</p>
            {artist && (
              <p className="text-sm text-muted-foreground truncate">{artist}</p>
            )}
            {year && (
              <p className="text-xs text-muted-foreground/70">{year}</p>
            )}
          </div>

          {/* Play button - opens Spotify */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayClick}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              "bg-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            <Play className="h-6 w-6 ml-0.5" />
          </Button>
        </div>

        {/* Selection reason */}
        {selectionReason && (
          <div className="mt-3 pt-3 border-t border-primary/10">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary font-medium">Por que essa música? </span>
                {selectionReason}
              </p>
            </div>
          </div>
        )}

        {/* Listening tip */}
        {listeningTip && (
          <div className="mt-3">
            <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-amber-600 dark:text-amber-400 font-medium">💫 Como curtir? </span>
                {listeningTip}
              </p>
            </div>
          </div>
        )}

        {/* Alternative: YouTube Music */}
        <div className="mt-3 pt-3 border-t border-primary/10">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Também disponível em:
          </p>
          <Button
            variant="outline"
            onClick={handleYouTubeMusicClick}
            className="w-full h-10 gap-2 bg-destructive/10 border-destructive/30 hover:bg-destructive/20 text-foreground text-xs"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-destructive">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.872 16.32l-5.76-3.36V16.8L5.952 12l5.16-4.8v3.84l5.76-3.36v8.64z"/>
            </svg>
            YouTube Music
          </Button>
        </div>
      </div>
    </div>
  );
};
