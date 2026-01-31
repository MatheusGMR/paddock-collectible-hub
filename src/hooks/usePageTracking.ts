import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, trackPageDuration } from "@/lib/analytics";

/**
 * Hook to automatically track page views and time spent on pages
 */
export const usePageTracking = () => {
  const location = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const lastPath = useRef<string>(location.pathname);

  useEffect(() => {
    // Track page view when path changes
    trackPageView(location.pathname);
    
    // Record duration of previous page
    const previousPath = lastPath.current;
    if (previousPath !== location.pathname) {
      const duration = Date.now() - pageStartTime.current;
      if (duration > 1000) { // Only track if spent more than 1 second
        trackPageDuration(previousPath, duration);
      }
    }
    
    // Reset for new page
    pageStartTime.current = Date.now();
    lastPath.current = location.pathname;
  }, [location.pathname]);

  // Track duration when user leaves/closes the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const duration = Date.now() - pageStartTime.current;
      if (duration > 1000) {
        // Use sendBeacon for reliable tracking on page close
        const sessionId = sessionStorage.getItem("analytics_session_id");
        if (sessionId) {
          navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`,
            JSON.stringify({
              session_id: sessionId,
              event_type: "page_view",
              page_path: location.pathname,
              duration_ms: Math.round(duration),
              device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"
            })
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [location.pathname]);
};
