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
  } = useGuidedTips();

  const [spotlightPos, setSpotlightPos] = useState<SpotlightPosition | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Calculate spotlight position based on target element
  const calculatePositions = useCallback(() => {
    if (!currentTip) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 400;
    const padding = isMobile ? 12 : 16;
    
    // Responsive tooltip width - use percentage on mobile
    const tooltipWidth = Math.min(viewportWidth - padding * 2, 320);
    const tooltipHeight = 180; // Approximate height

    if (currentTip.targetSelector) {
      const element = document.querySelector(currentTip.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const spotPadding = 8;
        
        setSpotlightPos({
          top: rect.top - spotPadding,
          left: rect.left - spotPadding,
          width: rect.width + spotPadding * 2,
          height: rect.height + spotPadding * 2,
        });

        // Calculate tooltip position based on targetPosition
        let top = 0;
        let left = 0;

        switch (currentTip.targetPosition) {
          case "top":
            top = rect.top - tooltipHeight - 16;
            left = (viewportWidth - tooltipWidth) / 2; // Center horizontally on mobile
            break;
          case "bottom":
            top = rect.bottom + 16;
            left = (viewportWidth - tooltipWidth) / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = padding; // Align to left edge with padding
            break;
          case "right":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = padding; // On mobile, still align left for safety
            break;
          default:
            top = viewportHeight / 2 - tooltipHeight / 2;
            left = (viewportWidth - tooltipWidth) / 2;
        }

        // Ensure tooltip stays within viewport with safe margins
        const safeMargin = padding;
        left = Math.max(safeMargin, Math.min(left, viewportWidth - tooltipWidth - safeMargin));
        top = Math.max(safeMargin, Math.min(top, viewportHeight - tooltipHeight - safeMargin));

        setTooltipStyle({
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
          width: `${tooltipWidth}px`,
          maxWidth: `calc(100vw - ${padding * 2}px)`,
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
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
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

  if (!isTipsActive || !currentTip) return null;

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
