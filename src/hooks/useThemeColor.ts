import { useEffect } from "react";

// Default background color from CSS variables (--background: 220 22% 7%)
const DEFAULT_THEME_COLOR = "#0E1117";
const SCANNER_THEME_COLOR = "#000000";

/**
 * Hook to dynamically set the theme-color meta tag for the notch/status bar
 * @param color - The color to set, or use predefined values
 */
export function useThemeColor(variant: "default" | "scanner" = "default") {
  useEffect(() => {
    const color = variant === "scanner" ? SCANNER_THEME_COLOR : DEFAULT_THEME_COLOR;
    
    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", color);
    }

    // Cleanup: restore default color when component unmounts
    return () => {
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", DEFAULT_THEME_COLOR);
      }
    };
  }, [variant]);
}
