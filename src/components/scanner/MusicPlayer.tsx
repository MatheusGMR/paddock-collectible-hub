import { useState, useEffect } from "react";
import { Music2, Play, Loader2, ExternalLink } from "lucide-react";
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

// Get Spotify search URL (fallback)
const getSpotifySearchUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};


// Spotify oEmbed API to get embed URL
const getSpotifyEmbedUrl = async (title: string, artist: string): Promise<string | null> => {
  try {
    // Use Spotify's oEmbed endpoint with a search-based URL
    const searchQuery = encodeURIComponent(`${title} ${artist}`.trim());
    const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;
    
    // Unfortunately, oEmbed doesn't work with search URLs
    // We need to construct a generic embed URL that will show search results
    // Spotify doesn't support this directly, so we'll use a workaround
    
    // The best approach is to embed based on track name pattern
    // Since we don't have the track ID, we'll show the player in a search-like state
    return null;
  } catch (error) {
    console.error("Error fetching Spotify embed:", error);
    return null;
  }
};

export const MusicPlayer = ({ 
  suggestion, 
  selectionReason,
  listeningTip,
}: MusicPlayerProps) => {
  const { title, artist, year } = parseMusicSuggestion(suggestion);
  const [showEmbed, setShowEmbed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePlayClick = () => {
    setIsLoading(true);
    setShowEmbed(true);
  };

  const handleOpenSpotify = () => {
    window.open(getSpotifySearchUrl(title, artist), "_blank", "noopener,noreferrer");
  };


  if (!suggestion) return null;

  // Construct Spotify embed URL using search
  // Note: Spotify embed requires a track/album/playlist URI, not search
  // We'll use a workaround by embedding a search-like experience
  const spotifyEmbedUrl = `https://open.spotify.com/embed/search/${encodeURIComponent(`${title} ${artist}`.trim())}?utm_source=generator&theme=0`;

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
              {showEmbed ? "Ouça agora" : "Toque para ouvir"}
            </p>
          </div>
        </div>

        {/* Spotify Embed or Song Info */}
        {showEmbed ? (
          <div className="space-y-3">
            {/* Spotify Embed iframe */}
            <div className="relative w-full rounded-lg overflow-hidden bg-black/20">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <iframe
                src={`https://open.spotify.com/embed/search/${encodeURIComponent(`${title} ${artist}`.trim())}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  // Fallback: open Spotify directly
                  handleOpenSpotify();
                }}
                className="rounded-lg"
                style={{ borderRadius: '12px' }}
              />
            </div>

            {/* Fallback link */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenSpotify}
              className="w-full text-xs text-muted-foreground gap-2"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no Spotify
            </Button>
          </div>
        ) : (
          <>
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

              {/* Play button - shows Spotify embed */}
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
          </>
        )}

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