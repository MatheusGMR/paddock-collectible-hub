import { Music2 } from "lucide-react";

interface MusicSuggestionProps {
  suggestion: string;
}

export const MusicSuggestion = ({ suggestion }: MusicSuggestionProps) => {
  if (!suggestion) return null;

  return (
    <div className="pt-3 border-t border-border">
      <div className="flex items-center gap-2 mb-1">
        <Music2 className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs text-primary font-semibold">Música para Ouvir</p>
      </div>
      <p className="text-sm text-foreground/90 italic">
        🎵 {suggestion}
      </p>
    </div>
  );
};
