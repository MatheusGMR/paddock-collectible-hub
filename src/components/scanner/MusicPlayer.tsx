import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, Play, Pause, Loader2, ExternalLink, X, AlertCircle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

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

// Get Spotify search URL (fallback)
const getSpotifyUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};

// Get YouTube Music search URL (fallback)
const getYouTubeMusicUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://music.youtube.com/search?q=${query}`;
};

type PlayerState = 'idle' | 'loading' | 'playing' | 'error';

// Declare YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
}

// Load YouTube IFrame API script
let ytApiLoaded = false;
let ytApiLoading = false;
const ytApiCallbacks: (() => void)[] = [];

const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (ytApiLoaded && window.YT) {
      resolve();
      return;
    }

    ytApiCallbacks.push(resolve);

    if (ytApiLoading) {
      return;
    }

    ytApiLoading = true;

    // Check if already loaded
    if (window.YT && window.YT.Player) {
      ytApiLoaded = true;
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks.length = 0;
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;

    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiCallbacks.forEach(cb => cb());
      ytApiCallbacks.length = 0;
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
};

export const MusicPlayer = ({ 
  suggestion, 
  selectionReason,
  autoPreload = true 
}: MusicPlayerProps) => {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<string>(`yt-player-${Date.now()}`);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pulse, setPulse] = useState(false);

  const { title, artist, year } = parseMusicSuggestion(suggestion);
  const isNative = Capacitor.isNativePlatform();

  // Animate equalizer bars when playing
  useEffect(() => {
    if (playerState === 'playing') {
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
  }, [playerState]);

  // Cleanup player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.log('[MusicPlayer] Error destroying player:', e);
        }
        playerRef.current = null;
      }
    };
  }, []);

  const initializePlayer = useCallback(async (videoId: string) => {
    try {
      await loadYouTubeAPI();

      // Destroy existing player
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.log('[MusicPlayer] Error destroying existing player:', e);
        }
        playerRef.current = null;
      }

      // Ensure container exists
      const container = document.getElementById(playerContainerRef.current);
      if (!container) {
        console.error('[MusicPlayer] Player container not found');
        setErrorMessage('Erro ao inicializar player');
        setPlayerState('error');
        return;
      }

      console.log('[MusicPlayer] Initializing YouTube player for video:', videoId);

      playerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          showinfo: 0,
          controls: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            console.log('[MusicPlayer] Player ready, starting playback');
            event.target.playVideo();
            setPlayerState('playing');
          },
          onStateChange: (event) => {
            console.log('[MusicPlayer] Player state changed:', event.data);
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlayerState('playing');
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setPlayerState('idle');
              setYoutubeVideoId(null);
            }
          },
          onError: (event) => {
            console.error('[MusicPlayer] YouTube player error:', event.data);
            // Error codes: 2 = invalid param, 5 = HTML5 error, 100 = not found, 101/150 = embedding not allowed
            const errorMessages: Record<number, string> = {
              2: 'Parâmetro inválido',
              5: 'Erro de reprodução HTML5',
              100: 'Vídeo não encontrado',
              101: 'Reprodução não permitida',
              150: 'Reprodução não permitida',
            };
            setErrorMessage(errorMessages[event.data] || `Erro ${event.data} ao reproduzir`);
            setPlayerState('error');
          },
        },
      });
    } catch (err) {
      console.error('[MusicPlayer] Failed to initialize player:', err);
      setErrorMessage('Erro ao inicializar player');
      setPlayerState('error');
    }
  }, []);

  const searchYouTube = useCallback(async () => {
    setPlayerState('loading');
    setErrorMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { title, artist }
      });

      if (error) {
        console.error('[MusicPlayer] YouTube search error:', error);
        setErrorMessage('Não foi possível buscar a música');
        setPlayerState('error');
        return;
      }

      if (data?.videoId) {
        console.log('[MusicPlayer] Found video:', data.videoId);
        setYoutubeVideoId(data.videoId);
        setVideoThumbnail(data.thumbnail || null);
        
        // Initialize the YouTube player
        await initializePlayer(data.videoId);
      } else {
        setErrorMessage('Música não encontrada no YouTube');
        setPlayerState('error');
      }
    } catch (err) {
      console.error('[MusicPlayer] YouTube search failed:', err);
      setErrorMessage('Erro ao buscar música');
      setPlayerState('error');
    }
  }, [title, artist, initializePlayer]);

  const handlePlayClick = useCallback(() => {
    if (playerState === 'idle' || playerState === 'error') {
      searchYouTube();
    } else if (playerState === 'playing') {
      // Stop and cleanup
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo();
          playerRef.current.destroy();
        } catch (e) {
          console.log('[MusicPlayer] Error stopping player:', e);
        }
        playerRef.current = null;
      }
      setPlayerState('idle');
      setYoutubeVideoId(null);
    }
  }, [playerState, searchYouTube]);

  const handleClose = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.log('[MusicPlayer] Error destroying player on close:', e);
      }
      playerRef.current = null;
    }
    setPlayerState('idle');
    setYoutubeVideoId(null);
  }, []);

  const handleMuteToggle = useCallback(() => {
    if (playerRef.current) {
      try {
        if (playerRef.current.isMuted()) {
          playerRef.current.unMute();
          setIsMuted(false);
        } else {
          playerRef.current.mute();
          setIsMuted(true);
        }
      } catch (e) {
        console.log('[MusicPlayer] Error toggling mute:', e);
      }
    }
  }, []);

  const handleSpotifyClick = () => {
    window.open(getSpotifyUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleYouTubeMusicClick = () => {
    window.open(getYouTubeMusicUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  if (!suggestion) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20">
      {/* Animated background glow when playing */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transition-opacity duration-700",
          playerState === 'playing' ? "opacity-100 animate-pulse" : "opacity-0"
        )}
      />
      
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all relative",
            playerState === 'playing' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          )}>
            <Music2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary">Trilha Sonora</p>
            <p className="text-[10px] text-muted-foreground">
              {playerState === 'loading' ? 'Buscando música...' : 
               playerState === 'playing' ? 'Tocando agora' :
               playerState === 'error' ? 'Erro ao carregar' :
               'Toque para ouvir'}
            </p>
          </div>
          {playerState === 'playing' && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* YouTube Player Container - Hidden div that becomes the player */}
        {(playerState === 'loading' || playerState === 'playing') && (
          <div className="mb-4 rounded-lg overflow-hidden bg-black aspect-video animate-fade-in">
            <div 
              id={playerContainerRef.current}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Loading overlay */}
        {playerState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10 pointer-events-none" style={{ top: '60px', bottom: 'auto', height: 'calc(56.25vw - 32px)', maxHeight: '200px' }}>
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {/* Error state */}
        {playerState === 'error' && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Song info and main play button (hidden when playing) */}
        {(playerState === 'idle' || playerState === 'error') && (
          <div className="flex items-center gap-3">
            {/* Album art with equalizer */}
            <div 
              className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={handlePlayClick}
              style={videoThumbnail ? { backgroundImage: `url(${videoThumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              <div className="absolute inset-0 bg-black/30" />
              <Play className="h-7 w-7 text-white relative z-10 ml-0.5" />
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
                "h-12 w-12 rounded-full transition-all",
                "bg-primary/20 text-primary hover:bg-primary/30"
              )}
            >
              <Play className="h-6 w-6 ml-0.5" />
            </Button>
          </div>
        )}

        {/* Selection reason & fallback options */}
        {(playerState === 'playing' || playerState === 'error') && (
          <div className="mt-4 pt-3 border-t border-primary/20 animate-fade-in space-y-4">
            {/* Song info when playing */}
            {playerState === 'playing' && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-end gap-0.5 h-6">
                  <div className={cn("w-1 bg-primary rounded-t transition-all duration-200", pulse ? "h-6" : "h-2")} />
                  <div className={cn("w-1 bg-primary rounded-t transition-all duration-200", !pulse ? "h-6" : "h-3")} />
                  <div className={cn("w-1 bg-primary rounded-t transition-all duration-200", pulse ? "h-4" : "h-6")} />
                  <div className={cn("w-1 bg-primary rounded-t transition-all duration-200", !pulse ? "h-5" : "h-2")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-sm">{title}</p>
                  {artist && (
                    <p className="text-xs text-muted-foreground truncate">{artist}</p>
                  )}
                </div>
              </div>
            )}

            {/* Selection reason */}
            {selectionReason && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-medium">Por que essa música? </span>
                  {selectionReason}
                </p>
              </div>
            )}
            
            {/* Fallback links */}
            <p className="text-xs text-muted-foreground text-center">
              {playerState === 'error' ? 'Ouça em outro lugar:' : 'Também disponível em:'}
            </p>
            
            <div className="flex gap-2">
              {/* Spotify Button */}
              <Button
                variant="outline"
                onClick={handleSpotifyClick}
                className="flex-1 h-10 gap-2 bg-[#1DB954]/10 border-[#1DB954]/30 hover:bg-[#1DB954]/20 text-foreground text-xs"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1DB954]">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Spotify</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>

              {/* YouTube Music Button */}
              <Button
                variant="outline"
                onClick={handleYouTubeMusicClick}
                className="flex-1 h-10 gap-2 bg-[#FF0000]/10 border-[#FF0000]/30 hover:bg-[#FF0000]/20 text-foreground text-xs"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#FF0000]">
                  <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
                </svg>
                <span>YouTube</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
