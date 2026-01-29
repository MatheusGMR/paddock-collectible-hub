import { useEffect, useState } from "react";
import paddockLogo from "@/assets/paddock-logo.png";

interface SplashScreenProps {
  onComplete: () => void;
  minimumDuration?: number;
}

export const SplashScreen = ({ 
  onComplete, 
  minimumDuration = 1800 
}: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Minimum display time for brand recognition
    const timer = setTimeout(() => {
      setIsFading(true);
      // Allow fade animation to complete before calling onComplete
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 400);
    }, minimumDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minimumDuration]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center
        bg-[#0E1117]
        transition-opacity duration-400 ease-out
        ${isFading ? "opacity-0" : "opacity-100"}
      `}
    >
      {/* Logo Container */}
      <div 
        className={`
          flex items-center justify-center
          transform transition-all duration-500 ease-out
          ${isFading ? "scale-95 opacity-0" : "scale-100 opacity-100"}
        `}
      >
        {/* Paddock Logo */}
        <img
          src={paddockLogo}
          alt="Paddock"
          className="w-28 h-28 object-contain"
          style={{
            filter: "drop-shadow(0 0 40px rgba(76, 195, 255, 0.15))",
          }}
        />
      </div>

      {/* Subtle bottom indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="w-8 h-1 bg-[#4CC3FF]/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#4CC3FF]/60 rounded-full animate-pulse"
            style={{
              width: isFading ? "100%" : "30%",
              transition: "width 1.5s ease-out",
            }}
          />
        </div>
      </div>
    </div>
  );
};
