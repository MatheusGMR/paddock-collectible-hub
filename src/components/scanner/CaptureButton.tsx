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
    <div className="flex flex-col items-center gap-2">
      {/* Recording duration indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/90 rounded-full animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full" />
          <span className="text-sm font-medium text-white">
            {formatDuration(recordingDuration)}
          </span>
        </div>
      )}

      {/* Main capture button - minimal social media style */}
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
        data-tip="capture-button"
        className={cn(
          "relative transition-all duration-200",
          "active:scale-90",
          "disabled:opacity-50 disabled:pointer-events-none",
          "flex items-center justify-center"
        )}
      >
        {/* Outer ring */}
        <div
          className={cn(
            "w-[72px] h-[72px] rounded-full flex items-center justify-center",
            "border-[3px] transition-colors duration-200",
            isRecording 
              ? "border-destructive" 
              : "border-white/80"
          )}
        >
          {/* Inner circle */}
          <div
            className={cn(
              "rounded-full transition-all duration-200",
              isRecording
                ? "w-7 h-7 bg-destructive rounded-lg"
                : "w-[58px] h-[58px] bg-white/90"
            )}
          />
        </div>

        {/* Recording pulse effect */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full border-[3px] border-destructive animate-ping opacity-50" />
        )}
      </button>
    </div>
  );
}
