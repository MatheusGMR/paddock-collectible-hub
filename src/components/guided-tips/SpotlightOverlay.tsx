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

    if (currentTip.targetSelector) {
      const element = document.querySelector(currentTip.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        
        setSpotlightPos({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position based on targetPosition
        const tooltipWidth = 300;
        const tooltipHeight = 160;
        let top = 0;
        let left = 0;

        switch (currentTip.targetPosition) {
          case "top":
            top = rect.top - tooltipHeight - 20;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "bottom":
            top = rect.bottom + 20;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - 20;
            break;
          case "right":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + 20;
            break;
          default:
            top = window.innerHeight / 2 - tooltipHeight / 2;
            left = window.innerWidth / 2 - tooltipWidth / 2;
        }

        // Ensure tooltip stays within viewport
        left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
        top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

        setTooltipStyle({
          position: "fixed",
          top: `${top}px`,
          left: `${left}px`,
          width: `${tooltipWidth}px`,
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
        width: "300px",
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
        {/* Dark overlay with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightPos && (
                <rect
                  x={spotlightPos.left}
                  y={spotlightPos.top}
                  width={spotlightPos.width}
                  height={spotlightPos.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.85)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Spotlight border glow */}
        {spotlightPos && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute rounded-xl border-2 border-primary/60 pointer-events-none"
            style={{
              top: spotlightPos.top,
              left: spotlightPos.left,
              width: spotlightPos.width,
              height: spotlightPos.height,
              boxShadow: "0 0 20px rgba(76, 195, 255, 0.4)",
            }}
          />
        )}

        {/* Tooltip card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          style={tooltipStyle}
          className="bg-card border border-border rounded-2xl p-4 shadow-2xl"
        >
          {/* Skip button */}
          <button
            onClick={skipAllTips}
            className="absolute -top-2 -right-2 p-1.5 bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Title */}
          <h3 className="text-lg font-bold text-foreground mb-2">
            {currentTip.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {currentTip.description}
          </p>

          {/* Footer with progress and action */}
          <div className="flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex gap-1.5">
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
              className="gap-1"
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
