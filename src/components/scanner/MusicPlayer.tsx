import { useState, useRef, useEffect } from "react";
import { Music2, Play, Pause, Square, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  suggestion: string;
  carBrand?: string;
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

// Generate Spotify search URL (opens in app if installed)
const getSpotifySearchUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};

// Generate YouTube Music search URL
const getYouTubeMusicUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://music.youtube.com/search?q=${query}`;
};

export const MusicPlayer = ({ suggestion }: MusicPlayerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pulse, setPulse] = useState(false);

  const { title, artist, year } = parseMusicSuggestion(suggestion);

  // Animate equalizer bars
  useEffect(() => {
    if (isExpanded) {
      pulseIntervalRef.current = setInterval(() => {
        setPulse(prev => !prev);
      }, 400);
    } else {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    }
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, [isExpanded]);

  const handleSpotifyClick = () => {
    window.open(getSpotifySearchUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleYouTubeMusicClick = () => {
    window.open(getYouTubeMusicUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  if (!suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
      {/* Animated background glow */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transition-opacity duration-700",
          isExpanded ? "opacity-100 animate-pulse" : "opacity-0"
        )}
      />
      
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          )}>
            <Music2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Trilha Sonora</p>
            <p className="text-[10px] text-muted-foreground">
              {isExpanded ? "Escolha onde ouvir" : "Sugestão musical"}
            </p>
          </div>
        </div>

        {/* Song info and controls */}
        <div className="flex items-center gap-3">
          {/* Album art placeholder with equalizer animation */}
          <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
            {isExpanded ? (
              <div className="flex items-end gap-0.5 h-6">
                <div className={cn("w-1 bg-primary rounded-t transition-all duration-300", pulse ? "h-6" : "h-2")} />
                <div className={cn("w-1 bg-primary rounded-t transition-all duration-300", !pulse ? "h-6" : "h-3")} />
                <div className={cn("w-1 bg-primary rounded-t transition-all duration-300", pulse ? "h-4" : "h-6")} />
                <div className={cn("w-1 bg-primary rounded-t transition-all duration-300", !pulse ? "h-5" : "h-2")} />
              </div>
            ) : (
              <Music2 className="h-6 w-6 text-primary/50" />
            )}
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

          {/* Expand/Collapse button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              isExpanded 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            {isExpanded ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Music service options */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-primary/20 animate-fade-in">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Abrir música em:
            </p>
            <div className="flex gap-2">
              {/* Spotify Button */}
              <Button
                variant="outline"
                onClick={handleSpotifyClick}
                className="flex-1 h-12 gap-2 bg-[#1DB954]/10 border-[#1DB954]/30 hover:bg-[#1DB954]/20 text-foreground"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#1DB954]">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-sm font-medium">Spotify</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>

              {/* YouTube Music Button */}
              <Button
                variant="outline"
                onClick={handleYouTubeMusicClick}
                className="flex-1 h-12 gap-2 bg-[#FF0000]/10 border-[#FF0000]/30 hover:bg-[#FF0000]/20 text-foreground"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#FF0000]">
                  <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
                </svg>
                <span className="text-sm font-medium">YouTube</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
