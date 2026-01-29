import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaptureButtonProps {
  isRecording: boolean;
  recordingDuration: number;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function CaptureButton({
  isRecording,
  recordingDuration,
  disabled = false,
  onPressStart,
  onPressEnd,
}: CaptureButtonProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Recording duration indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/90 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          <span className="text-sm font-medium text-white">
            {formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {/* Main capture button */}
      <button
        disabled={disabled}
        onMouseDown={onPressStart}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={(e) => {
          e.preventDefault();
          onPressStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          onPressEnd();
        }}
        onTouchCancel={onPressEnd}
        className={cn(
          "relative w-20 h-20 rounded-full transition-all duration-150",
          "bg-white/90 backdrop-blur-sm",
          "border-4 border-white",
          "shadow-lg shadow-black/20",
          "active:scale-95 hover:scale-105",
          "disabled:opacity-50 disabled:pointer-events-none",
          "flex items-center justify-center",
          isRecording && "ring-4 ring-destructive animate-pulse"
        )}
      >
        {/* Inner circle with AI icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            isRecording
              ? "bg-destructive"
              : "bg-gradient-to-br from-primary/10 to-primary/5"
          )}
        >
          <Zap
            className={cn(
              "h-7 w-7 transition-colors",
              isRecording ? "text-white" : "text-primary/40"
            )}
            strokeWidth={2.5}
          />
        </div>

        {/* Outer ring for recording */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-75" />
        )}
      </button>
    </div>
  );
}
