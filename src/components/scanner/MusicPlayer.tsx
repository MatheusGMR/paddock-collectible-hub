import { useState, useRef, useEffect } from "react";
import { Music2, Play, Pause, ExternalLink, Volume2, VolumeX } from "lucide-react";
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

// Generate YouTube search URL
const getYouTubeSearchUrl = (suggestion: string) => {
  const query = encodeURIComponent(suggestion);
  return `https://www.youtube.com/results?search_query=${query}`;
};

// Generate Spotify search URL
const getSpotifySearchUrl = (suggestion: string) => {
  const query = encodeURIComponent(suggestion);
  return `https://open.spotify.com/search/${query}`;
};

export const MusicPlayer = ({ suggestion, carBrand }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pulse, setPulse] = useState(false);

  const { title, artist, year } = parseMusicSuggestion(suggestion);

  // Animate equalizer bars when "playing"
  useEffect(() => {
    if (isPlaying) {
      pulseIntervalRef.current = setInterval(() => {
        setPulse(prev => !prev);
      }, 300);
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
  }, [isPlaying]);

  const handlePlayClick = () => {
    setShowLinks(true);
    setIsPlaying(!isPlaying);
  };

  if (!suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
      {/* Animated background glow */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transition-opacity duration-700",
          isPlaying ? "opacity-100 animate-pulse" : "opacity-0"
        )}
      />
      
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            isPlaying ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          )}>
            <Music2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-primary">Trilha Sonora</p>
            <p className="text-[10px] text-muted-foreground">Sugestão para ouvir</p>
          </div>
        </div>

        {/* Song info */}
        <div className="flex items-center gap-3">
          {/* Album art placeholder with equalizer */}
          <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 bg-primary rounded-full transition-all duration-150",
                      pulse 
                        ? i % 2 === 0 ? "h-6" : "h-3"
                        : i % 2 === 0 ? "h-3" : "h-6"
                    )}
                  />
                ))}
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

          {/* Play button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayClick}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              isPlaying 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Streaming links - show when clicked */}
        {showLinks && (
          <div className="mt-4 pt-3 border-t border-primary/10 flex gap-2 animate-fade-in">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs border-primary/20 hover:bg-primary/10"
              onClick={() => window.open(getSpotifySearchUrl(suggestion), '_blank')}
            >
              <span className="text-[#1DB954] mr-1.5">●</span>
              Spotify
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs border-primary/20 hover:bg-primary/10"
              onClick={() => window.open(getYouTubeSearchUrl(suggestion), '_blank')}
            >
              <span className="text-red-500 mr-1.5">▶</span>
              YouTube
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
