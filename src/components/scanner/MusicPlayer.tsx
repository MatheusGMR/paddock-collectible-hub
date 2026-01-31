import { useState, useRef, useEffect } from "react";
import { Music2, Play, X } from "lucide-react";
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

// Generate YouTube embed search URL
const getYouTubeEmbedUrl = (suggestion: string) => {
  const query = encodeURIComponent(suggestion + " official audio");
  return `https://www.youtube.com/embed?listType=search&list=${query}`;
};

export const MusicPlayer = ({ suggestion, carBrand }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
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
    setIsPlaying(true);
  };

  const handleClosePlayer = () => {
    setIsPlaying(false);
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
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
          {isPlaying && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClosePlayer}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* YouTube Embed Player */}
        {isPlaying ? (
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black animate-fade-in">
            <iframe
              src={getYouTubeEmbedUrl(suggestion)}
              title={`${title} - ${artist}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          /* Song info - collapsed state */
          <div className="flex items-center gap-3">
            {/* Album art placeholder with equalizer */}
            <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
              <Music2 className="h-6 w-6 text-primary/50" />
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
              className="h-10 w-10 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
            >
              <Play className="h-5 w-5 ml-0.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
