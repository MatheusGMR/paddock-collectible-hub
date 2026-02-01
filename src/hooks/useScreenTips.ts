import { useEffect } from "react";
import { useGuidedTips } from "@/contexts/GuidedTipsContext";

/**
 * Hook to automatically trigger guided tips when entering a screen
 * @param screen - The screen identifier (feed, scanner, mercado, profile, notifications, item-detail)
 * @param delay - Optional delay before showing tips (default: 500ms)
 */
export const useScreenTips = (screen: string, delay: number = 500) => {
  const { startScreenTips, hasUnseenTips, isTipsActive } = useGuidedTips();

  useEffect(() => {
    // Don't start if already showing tips
    if (isTipsActive) return;

    // Check if this screen has unseen tips
    if (hasUnseenTips(screen)) {
      const timer = setTimeout(() => {
        startScreenTips(screen);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [screen, delay, startScreenTips, hasUnseenTips, isTipsActive]);

  return { hasUnseenTips: hasUnseenTips(screen) };
};
