import { DetectionBox } from "@/hooks/useObjectDetection";
import { motion, AnimatePresence } from "framer-motion";

interface DetectionOverlayProps {
  detections: DetectionBox[];
  isModelReady: boolean;
}

const BOX_COLORS = [
  "rgba(16, 185, 129, 0.7)",  // emerald
  "rgba(59, 130, 246, 0.7)",  // blue
  "rgba(245, 158, 11, 0.7)",  // amber
  "rgba(168, 85, 247, 0.7)",  // purple
  "rgba(239, 68, 68, 0.7)",   // red
  "rgba(20, 184, 166, 0.7)",  // teal
  "rgba(236, 72, 153, 0.7)",  // pink
];

/**
 * Renders animated bounding boxes over detected vehicles on the camera feed.
 * Positions use percentage-based coordinates from the detection hook.
 */
export function DetectionOverlay({ detections, isModelReady }: DetectionOverlayProps) {
  if (!isModelReady || detections.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <AnimatePresence>
        {detections.map((box, i) => {
          const color = BOX_COLORS[i % BOX_COLORS.length];
          return (
            <motion.div
              key={`${i}-${Math.round(box.x)}-${Math.round(box.y)}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
            >
              {/* Bounding box border with corner accents */}
              <div
                className="absolute inset-0 rounded-md"
                style={{
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 8px ${color}, inset 0 0 8px ${color.replace("0.7", "0.1")}`,
                }}
              />

              {/* Corner accents for a tech/scanner feel */}
              <CornerAccent position="top-left" color={color} />
              <CornerAccent position="top-right" color={color} />
              <CornerAccent position="bottom-left" color={color} />
              <CornerAccent position="bottom-right" color={color} />

              {/* Confidence label */}
              <div
                className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase"
                style={{
                  backgroundColor: color,
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {Math.round(box.score * 100)}%
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Scanning pulse animation on the whole frame */}
      {detections.length > 0 && (
        <motion.div
          className="absolute inset-0 rounded-none"
          style={{
            border: "1px solid rgba(16, 185, 129, 0.15)",
          }}
          animate={{
            borderColor: [
              "rgba(16, 185, 129, 0.15)",
              "rgba(16, 185, 129, 0.3)",
              "rgba(16, 185, 129, 0.15)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

function CornerAccent({ position, color }: { position: string; color: string }) {
  const size = "8px";
  const thickness = "3px";

  const styles: React.CSSProperties = { position: "absolute" };

  if (position.includes("top")) styles.top = "-1px";
  if (position.includes("bottom")) styles.bottom = "-1px";
  if (position.includes("left")) styles.left = "-1px";
  if (position.includes("right")) styles.right = "-1px";

  const isTop = position.includes("top");
  const isLeft = position.includes("left");

  return (
    <div style={styles}>
      {/* Horizontal line */}
      <div
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 0,
          [isLeft ? "left" : "right"]: 0,
          width: size,
          height: thickness,
          backgroundColor: color,
          borderRadius: "1px",
        }}
      />
      {/* Vertical line */}
      <div
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 0,
          [isLeft ? "left" : "right"]: 0,
          width: thickness,
          height: size,
          backgroundColor: color,
          borderRadius: "1px",
        }}
      />
    </div>
  );
}
