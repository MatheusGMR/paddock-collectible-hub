import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuidedTips } from "@/contexts/GuidedTipsContext";

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const SpotlightOverlay = () => {
  const {
    currentTip,
    currentTipIndex,
    totalTipsInScreen,
    nextTip,
    skipAllTips,
    isTipsActive,
    isOnboardingComplete,
  } = useGuidedTips();

  const [spotlightPos, setSpotlightPos] = useState<SpotlightPosition | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Calculate spotlight position based on target element
  const calculatePositions = useCallback(() => {
    if (!currentTip) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Safe margins - larger on mobile to avoid edge clipping
    const safeMargin = 16;
    
    // Responsive tooltip width - ensure it fits within screen with margins
    const maxTooltipWidth = Math.min(viewportWidth - safeMargin * 2, 320);
    const tooltipHeight = 200; // Approximate height with some buffer

    if (currentTip.targetSelector) {
      const element = document.querySelector(currentTip.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const spotPadding = 8;
        
        // Ensure spotlight stays within viewport
        const spotTop = Math.max(0, rect.top - spotPadding);
        const spotLeft = Math.max(0, rect.left - spotPadding);
        const spotWidth = Math.min(rect.width + spotPadding * 2, viewportWidth - spotLeft);
        const spotHeight = Math.min(rect.height + spotPadding * 2, viewportHeight - spotTop);
        
        setSpotlightPos({
          top: spotTop,
          left: spotLeft,
          width: spotWidth,
          height: spotHeight,
        });

        // Calculate tooltip position - prioritize visibility
        let top = 0;
        let left = safeMargin; // Default to left margin

        // Center horizontally within safe margins
        left = (viewportWidth - maxTooltipWidth) / 2;

        switch (currentTip.targetPosition) {
          case "top":
            // Position above target, but check if there's space
            top = rect.top - tooltipHeight - 20;
            if (top < safeMargin) {
              // Not enough space above, position below instead
              top = rect.bottom + 20;
            }
            break;
          case "bottom":
            // Position below target
            top = rect.bottom + 20;
            if (top + tooltipHeight > viewportHeight - safeMargin) {
              // Not enough space below, position above instead
              top = rect.top - tooltipHeight - 20;
            }
            break;
          case "left":
          case "right":
            // Position vertically centered relative to target
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            break;
          default:
            // Center on screen
            top = (viewportHeight - tooltipHeight) / 2;
        }

        // Final clamp to ensure tooltip stays within viewport
        left = Math.max(safeMargin, Math.min(left, viewportWidth - maxTooltipWidth - safeMargin));
        top = Math.max(safeMargin, Math.min(top, viewportHeight - tooltipHeight - safeMargin));

        setTooltipStyle({
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
          width: `${maxTooltipWidth}px`,
        });
      } else {
        // Target element not found - center the tooltip
        setSpotlightPos(null);
        setTooltipStyle({
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `${maxTooltipWidth}px`,
          maxWidth: `calc(100vw - ${safeMargin * 2}px)`,
        });
      }
    } else {
      // Center position (no target element)
      setSpotlightPos(null);
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: `${maxTooltipWidth}px`,
        maxWidth: `calc(100vw - ${safeMargin * 2}px)`,
      });
    }
  }, [currentTip]);

  // Recalculate on tip change or window resize
  useEffect(() => {
    if (currentTip) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(calculatePositions, 100);
      window.addEventListener("resize", calculatePositions);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", calculatePositions);
      };
    }
  }, [currentTip, calculatePositions]);

  // Don't show tips during onboarding or if not active
  if (!isTipsActive || !currentTip || !isOnboardingComplete) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-auto"
        onClick={(e) => {
          // Only allow clicks on the tooltip, block everything else
          e.stopPropagation();
        }}
      >
        {/* Dark overlay with spotlight cutout using clip-path for better rendering */}
        {spotlightPos ? (
          <>
            {/* Top overlay */}
            <div 
              className="absolute left-0 right-0 top-0 bg-black/90"
              style={{ height: spotlightPos.top }}
            />
            {/* Bottom overlay */}
            <div 
              className="absolute left-0 right-0 bottom-0 bg-black/90"
              style={{ top: spotlightPos.top + spotlightPos.height }}
            />
            {/* Left overlay */}
            <div 
              className="absolute left-0 bg-black/90"
              style={{ 
                top: spotlightPos.top, 
                width: spotlightPos.left,
                height: spotlightPos.height 
              }}
            />
            {/* Right overlay */}
            <div 
              className="absolute right-0 bg-black/90"
              style={{ 
                top: spotlightPos.top, 
                left: spotlightPos.left + spotlightPos.width,
                height: spotlightPos.height 
              }}
            />
          </>
        ) : (
          /* Full dark overlay when no target element */
          <div className="absolute inset-0 bg-black/90" />
        )}

        {/* Spotlight border glow - enhanced visibility */}
        {spotlightPos && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute rounded-2xl pointer-events-none"
            style={{
              top: spotlightPos.top,
              left: spotlightPos.left,
              width: spotlightPos.width,
              height: spotlightPos.height,
              border: "3px solid hsl(var(--primary))",
              boxShadow: "0 0 0 4px rgba(76, 195, 255, 0.3), 0 0 30px rgba(76, 195, 255, 0.5), inset 0 0 20px rgba(76, 195, 255, 0.1)",
            }}
          >
            {/* Pulsing ring animation */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-[-6px] rounded-2xl border-2 border-primary/40"
            />
          </motion.div>
        )}

        {/* Tooltip card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          style={tooltipStyle}
          className="bg-card border border-border rounded-2xl p-4 shadow-2xl overflow-hidden"
        >
          {/* Skip button */}
          <button
            onClick={skipAllTips}
            className="absolute top-2 right-2 p-1.5 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-2 pr-8">
            {currentTip.title}
          </h3>

          {/* Description */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
            {currentTip.description}
          </p>

          {/* Footer with progress and action */}
          <div className="flex items-center justify-between gap-2">
            {/* Progress dots */}
            <div className="flex gap-1.5 flex-shrink-0">
              {Array.from({ length: totalTipsInScreen }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentTipIndex
                      ? "w-4 bg-primary"
                      : i < currentTipIndex
                      ? "w-1.5 bg-primary/50"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Action button */}
            <Button
              onClick={nextTip}
              size="sm"
              className="gap-1 flex-shrink-0"
            >
              {currentTip.action || "Próximo"}
              {currentTipIndex < totalTipsInScreen - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
