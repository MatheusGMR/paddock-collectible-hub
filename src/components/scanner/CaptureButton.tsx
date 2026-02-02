import { cn } from "@/lib/utils";

interface CaptureButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export function CaptureButton({
  disabled = false,
  onClick,
}: CaptureButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main capture button - minimal social media style */}
      <button
        disabled={disabled}
        onClick={onClick}
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
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center border-[3px] border-white/80"
        >
          {/* Inner circle */}
          <div className="w-[58px] h-[58px] rounded-full bg-white/90" />
        </div>
      </button>
    </div>
  );
}
