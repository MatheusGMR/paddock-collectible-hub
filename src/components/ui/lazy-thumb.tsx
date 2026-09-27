import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Converte URL pública do storage em miniatura redimensionada (com fallback ao original). */
export function thumbUrl(src: string, width = 400) {
  if (!src.includes("/storage/v1/object/public/")) return src;
  return `${src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}${src.includes("?") ? "&" : "?"}width=${width}&quality=60&resize=contain`;
}

interface Props {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  onError?: () => void;
}

export function LazyThumb({ src, alt = "", className, width = 400, onError }: Props) {
  const [useOriginal, setUseOriginal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setUseOriginal(false);
    setLoaded(false);
  }, [src]);
  return (
    <img
      src={useOriginal ? src : thumbUrl(src, width)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => { if (!useOriginal && thumbUrl(src, width) !== src) setUseOriginal(true); else onError?.(); }}
      className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
