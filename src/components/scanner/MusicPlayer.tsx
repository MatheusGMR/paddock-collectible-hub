import { useState } from "react";
import { Music2, Play, ExternalLink } from "lucide-react";
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
const getSpotifySearchUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};

// Get YouTube Music search URL as fallback
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
  const [showOptions, setShowOptions] = useState(false);

  const handlePlayClick = () => {
    // Open Spotify search directly - most reliable method
    window.open(getSpotifySearchUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleYouTubeMusic = () => {
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
            <p className="text-[10px] text-muted-foreground">Toque para ouvir</p>
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

          {/* Play button - opens Spotify directly */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayClick}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              "bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30"
            )}
          >
            <Play className="h-6 w-6 ml-0.5" />
          </Button>
        </div>

        {/* Alternative streaming options */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayClick}
            className="flex-1 text-xs gap-1.5 h-8 border-[#1DB954]/30 text-[#1DB954] hover:bg-[#1DB954]/10"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Spotify
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleYouTubeMusic}
            className="flex-1 text-xs gap-1.5 h-8 border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
            </svg>
            YouTube
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

      </div>
    </div>
  );
};
