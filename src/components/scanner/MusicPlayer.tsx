import { useState, useRef, useEffect, useCallback } from "react";
import { Music2, Play, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

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
const getSpotifyUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://open.spotify.com/search/${query}`;
};

// Get YouTube Music search URL (fallback)
const getYouTubeMusicUrl = (title: string, artist: string) => {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  return `https://music.youtube.com/search?q=${query}`;
};

type PlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

export const MusicPlayer = ({ 
  suggestion, 
  selectionReason,
  listeningTip,
  autoPreload = true 
}: MusicPlayerProps) => {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pulse, setPulse] = useState(false);

  const { title, artist, year } = parseMusicSuggestion(suggestion);
  const isNative = Capacitor.isNativePlatform();
  const isIOSWeb =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent);
  // iOS (Safari/WKWebView) é bem rígido com autoplay: iniciar mídia depois de um fetch async
  // frequentemente não conta como “gesture” do usuário.
  const requiresUserGestureToStart = isNative || isIOSWeb;

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    };
  }, []);

  // Build the iframe src URL
  const getPlayerUrl = useCallback((videoId: string): string => {
    if (isNative) {
      // On native platforms (iOS/Android), use the relay HTML to avoid Error 153
      // The relay page loads the YouTube embed in a first-party context
      return `/youtube-embed.html?v=${encodeURIComponent(videoId)}`;
    } else {
      // On web, use youtube-nocookie directly (works fine in browsers)
      const params = new URLSearchParams({
        autoplay: '1',
        playsinline: '1',
        rel: '0',
        modestbranding: '1',
        enablejsapi: '0', // mantemos desabilitado; iOS tende a exigir “gesture” de qualquer forma
      });
      return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
    }
  }, [isNative]);

  const resolveYouTubeVideo = useCallback(
    async ({ mode }: { mode: 'preload' | 'user' }) => {
      // Evita refazer busca se já temos um vídeo resolvido
      if (youtubeVideoId) return { videoId: youtubeVideoId, thumbnail: videoThumbnail };

      if (mode === 'user') {
        setPlayerState('loading');
        setErrorMessage('');
      } else {
        // Preload não deve “quebrar” a UI em caso de falha
        console.log('[MusicPlayer] Preloading YouTube video for:', title, artist);
      }

      try {
        console.log('[MusicPlayer] Searching YouTube for:', title, artist, { mode });

        const { data, error } = await supabase.functions.invoke('youtube-search', {
          body: { title, artist },
        });

        if (error) {
          console.error('[MusicPlayer] YouTube search error:', error, { mode });
          if (mode === 'user') {
            const errorMsg = error.message?.includes('timeout') 
              ? 'Conexão lenta. Tente novamente.'
              : 'Erro de conexão. Verifique sua internet.';
            setErrorMessage(errorMsg);
            setPlayerState('error');
          } else {
            setPlayerState('idle');
          }
          return null;
        }

        if (data?.videoId) {
          console.log('[MusicPlayer] Found video:', data.videoId);
          setYoutubeVideoId(data.videoId);
          setVideoThumbnail(data.thumbnail || null);

          // Importante: em iOS/native, iniciar autoplay depois de um fetch async costuma ser bloqueado.
          // Então a gente apenas “prepara” e pede um toque para iniciar.
          if (mode === 'user') {
            setPlayerState(requiresUserGestureToStart ? 'ready' : 'playing');
          } else {
            setPlayerState('idle');
          }

          return { videoId: data.videoId as string, thumbnail: (data.thumbnail as string) || null };
        }

        if (mode === 'user') {
          setErrorMessage(`Música "${title}" não encontrada. Tente os links abaixo.`);
          setPlayerState('error');
        } else {
          setPlayerState('idle');
        }
        return null;
      } catch (err) {
        console.error('[MusicPlayer] YouTube search failed:', err, { mode });
        if (mode === 'user') {
          setErrorMessage('Erro ao buscar música');
          setPlayerState('error');
        } else {
          setPlayerState('idle');
        }
        return null;
      }
    },
    [artist, requiresUserGestureToStart, title, videoThumbnail, youtubeVideoId]
  );

  const startPlayback = useCallback(
    (videoId: string) => {
      const src = getPlayerUrl(videoId);
      console.log('[MusicPlayer] Starting playback', {
        videoId,
        isNative,
        isIOSWeb,
        requiresUserGestureToStart,
        src,
      });

      setErrorMessage('');
      setPlayerState('playing');

      // Define src diretamente (melhora a chance de ser contabilizado como gesto do usuário)
      if (iframeRef.current) {
        iframeRef.current.src = src;
      }
    },
    [getPlayerUrl, isIOSWeb, isNative, requiresUserGestureToStart]
  );

  // Preload: resolve o vídeo assim que a sugestão aparece, para o clique do usuário ser “só play”
  useEffect(() => {
    setPlayerState('idle');
    setErrorMessage('');
    setYoutubeVideoId(null);
    setVideoThumbnail(null);

    if (!suggestion) return;
    if (!autoPreload) return;

    // não await para não bloquear render
    resolveYouTubeVideo({ mode: 'preload' });
  }, [autoPreload, resolveYouTubeVideo, suggestion]);

  const handlePlayClick = useCallback(() => {
    console.log('[MusicPlayer] Play click', {
      playerState,
      hasVideoId: Boolean(youtubeVideoId),
      isNative,
      isIOSWeb,
      requiresUserGestureToStart,
    });

    if (playerState === 'playing') {
      // Stop playback
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
      setErrorMessage('');
      setPlayerState('idle');
      return;
    }

    // Se já resolvemos o vídeo, iniciamos imediatamente pelo gesto do usuário
    if (youtubeVideoId) {
      startPlayback(youtubeVideoId);
      return;
    }

    // Caso contrário, buscamos (pode exigir um novo toque em iOS/native)
    void (async () => {
      const resolved = await resolveYouTubeVideo({ mode: 'user' });
      if (!resolved?.videoId) return;

      if (requiresUserGestureToStart) {
        // iOS/native: pede novo toque (ou o preload já terá resolvido antes)
        console.log('[MusicPlayer] Video resolved; waiting for user gesture to start');
        setErrorMessage('Pronto! Toque em Play novamente para iniciar o áudio.');
        setPlayerState('ready');
        return;
      }

      startPlayback(resolved.videoId);
    })();
  }, [
    isIOSWeb,
    isNative,
    playerState,
    requiresUserGestureToStart,
    resolveYouTubeVideo,
    startPlayback,
    youtubeVideoId,
  ]);

  const handleClose = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = 'about:blank';
    }
    setErrorMessage('');
    setPlayerState('idle');
  }, []);

  const handleSpotifyClick = () => {
    window.open(getSpotifyUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleYouTubeMusicClick = () => {
    window.open(getYouTubeMusicUrl(title, artist), "_blank", "noopener,noreferrer");
  };

  const handleIframeLoad = useCallback(() => {
    console.log('[MusicPlayer] Iframe loaded successfully');
  }, []);

  const handleIframeError = useCallback(() => {
    console.error('[MusicPlayer] Iframe load error');
    setErrorMessage('Erro ao carregar o player');
    setPlayerState('error');
  }, []);

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
               playerState === 'ready' ? 'Pronto para tocar' :
               playerState === 'playing' ? 'Tocando agora' :
               playerState === 'error' ? 'Erro ao carregar' :
               'Toque para ouvir'}
            </p>
          </div>
          {playerState === 'playing' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* YouTube Player iframe - Minimal visible size to enable audio playback on iOS */}
        {/* iOS blocks audio from completely hidden/off-screen iframes */}
        {youtubeVideoId && (
          <div className="relative w-full h-1 overflow-hidden rounded bg-muted/20 mb-4">
            <iframe
              ref={iframeRef}
              src={playerState === 'playing' ? getPlayerUrl(youtubeVideoId) : 'about:blank'}
              className="absolute top-0 left-0 w-full h-[200px] opacity-[0.01] pointer-events-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
            {/* Visual progress bar effect */}
            {playerState === 'playing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-pulse" />
            )}
          </div>
        )}

        {/* Loading state */}
        {playerState === 'loading' && (
          <div className="mb-4 rounded-lg bg-muted/30 aspect-video flex items-center justify-center animate-fade-in">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {playerState === 'ready' && errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10 animate-fade-in">
            <p className="text-sm text-foreground">{errorMessage}</p>
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
        {(playerState === 'idle' || playerState === 'error' || playerState === 'ready') && (
          <div className="flex items-center gap-3">
            {/* Album art (thumbnail only, no play icon) */}
            <div 
              className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden"
              style={videoThumbnail ? { backgroundImage: `url(${videoThumbnail})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!videoThumbnail && <Music2 className="h-6 w-6 text-primary/60" />}
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
            
            {/* Listening tip - how to enjoy the music */}
            {listeningTip && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">💫 Como curtir? </span>
                  {listeningTip}
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
                Spotify
              </Button>

              {/* YouTube Music Button */}
              <Button
                variant="outline"
                onClick={handleYouTubeMusicClick}
                className="flex-1 h-10 gap-2 bg-[#FF0000]/10 border-[#FF0000]/30 hover:bg-[#FF0000]/20 text-foreground text-xs"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#FF0000]">
                  <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm4.872 16.32l-5.76-3.36V16.8L5.952 12l5.16-4.8v3.84l5.76-3.36v8.64z"/>
                </svg>
                YouTube Music
              </Button>
            </div>
          </div>
        )}

        {/* Always show selection reason when idle */}
        {playerState === 'idle' && selectionReason && (
          <div className="mt-3 pt-3 border-t border-primary/10">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary font-medium">Por que essa música? </span>
                {selectionReason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
