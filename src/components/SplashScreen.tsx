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
        transition-opacity duration-400 ease-out
        ${isFading ? "opacity-0" : "opacity-100"}
      `}
      style={{
        backgroundColor: "#0E1117",
      }}
    >
      {/* Primary Glow - Cyan/Blue emanating from center */}
      <div
        className="absolute inset-0 animate-glow-pulse"
        style={{
          background: `radial-gradient(
            ellipse 50% 50% at 50% 45%,
            rgba(76, 195, 255, 0.12) 0%,
            rgba(76, 195, 255, 0.04) 40%,
            transparent 70%
          )`,
        }}
      />
      
      {/* Secondary Glow - Deep blue for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(
            ellipse 70% 60% at 50% 55%,
            rgba(30, 64, 175, 0.08) 0%,
            transparent 60%
          )`,
        }}
      />

      {/* Logo Container */}
      <div 
        className={`
          relative z-10 flex items-center justify-center
          transform transition-all duration-500 ease-out
          ${isFading ? "scale-95 opacity-0" : "scale-100 opacity-100"}
        `}
      >
        {/* Paddock Logo */}
        <div 
          className="w-28 h-28 flex items-center justify-center rounded-3xl overflow-hidden"
          style={{
            backgroundColor: "#0E1117",
          }}
        >
          <img
            src={paddockLogo}
            alt="Paddock"
            className="w-full h-full object-contain"
            style={{
              filter: "drop-shadow(0 0 60px rgba(76, 195, 255, 0.25))",
              mixBlendMode: "lighten",
            }}
          />
        </div>
      </div>

      {/* Subtle bottom indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10">
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
