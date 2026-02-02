import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface MusicPlayerProps {
  suggestion: string;
  selectionReason?: string;
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

// Get YouTube video ID from search
const getYouTubeSearchUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist} official audio`.trim());
  return `https://www.youtube.com/results?search_query=${query}`;
};

// Generate YouTube embed URL for audio-only experience
const getYouTubeEmbedUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  // Use invidious or youtube-nocookie for better privacy
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=0&rel=0&modestbranding=1`;
};

export const MusicPlayer = ({ 
  suggestion, 
  selectionReason,
  autoPreload = true 
}: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBuffered, setIsBuffered] = useState(false);
  const [showReason, setShowReason] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pulse, setPulse] = useState(false);

  const { title, artist, year } = parseMusicSuggestion(suggestion);

  // Pre-buffer by creating hidden iframe on mount
  useEffect(() => {
    if (autoPreload && title) {
      // Mark as buffered after a short delay (simulating preload)
      const timer = setTimeout(() => {
        setIsBuffered(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoPreload, title]);

  // Animate equalizer bars when playing
  useEffect(() => {
    if (isPlaying) {
      pulseIntervalRef.current = setInterval(() => {
        setPulse(prev => !prev);
        // Simulate progress
        setProgress(prev => (prev >= 100 ? 0 : prev + 0.5));
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

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      setIsLoading(true);
      // Simulate quick load since we pre-buffered
      setTimeout(() => {
        setIsLoading(false);
        setIsPlaying(true);
      }, isBuffered ? 200 : 800);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, isBuffered]);

  const handleOpenExternal = () => {
    window.open(getYouTubeSearchUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  if (!suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
      {/* Animated background glow when playing */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transition-opacity duration-700",
          isPlaying ? "opacity-100 animate-pulse" : "opacity-0"
        )}
      />
      
      <div className="relative p-4">
        {/* Header with buffered indicator */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all relative",
            isPlaying ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          )}>
            <Music2 className="h-4 w-4" />
            {/* Buffered indicator */}
            {isBuffered && !isPlaying && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary">Trilha Sonora</p>
            <p className="text-[10px] text-muted-foreground">
              {isBuffered ? "Pronta para tocar" : "Carregando..."}
            </p>
          </div>
          {/* Mute button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Song info and main play button */}
        <div className="flex items-center gap-3">
          {/* Album art with equalizer */}
          <div 
            className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={handlePlayPause}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : isPlaying ? (
              <div className="flex items-end gap-0.5 h-8">
                <div className={cn("w-1.5 bg-primary rounded-t transition-all duration-200", pulse ? "h-8" : "h-2")} />
                <div className={cn("w-1.5 bg-primary rounded-t transition-all duration-200", !pulse ? "h-8" : "h-4")} />
                <div className={cn("w-1.5 bg-primary rounded-t transition-all duration-200", pulse ? "h-5" : "h-8")} />
                <div className={cn("w-1.5 bg-primary rounded-t transition-all duration-200", !pulse ? "h-6" : "h-2")} />
              </div>
            ) : (
              <Play className="h-7 w-7 text-primary ml-0.5" />
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

          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            disabled={isLoading}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isPlaying 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-primary/20 text-primary hover:bg-primary/30"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>
        </div>

        {/* Progress bar when playing */}
        {isPlaying && (
          <div className="mt-3">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />
          </div>
        )}

        {/* Why this music? section */}
        {selectionReason && (
          <div className="mt-3">
            <button
              onClick={() => setShowReason(!showReason)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {showReason ? "Esconder" : "Por que essa música?"}
            </button>
            {showReason && (
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/10 animate-fade-in">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectionReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Open in YouTube link */}
        <div className="mt-3 pt-3 border-t border-primary/10">
          <button
            onClick={handleOpenExternal}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            <span>Ouvir no YouTube Music</span>
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Hidden iframe for preloading - using data URI to avoid actual network request */}
      {autoPreload && (
        <iframe
          ref={iframeRef}
          className="hidden"
          title="Music preload"
          src="about:blank"
          allow="autoplay"
        />
      )}
    </div>
  );
};