// Analytics tracking utilities
// Note: Uses fetch directly since the table types may not be synced yet

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = (): "mobile" | "tablet" | "desktop" => {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
};

// Get current user ID if logged in
const getUserId = async (): Promise<string | null> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

// Insert analytics event via REST API
const insertEvent = async (event: Record<string, unknown>) => {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.debug("[Analytics] Insert failed:", error);
  }
};

// Track page view
export const trackPageView = async (path: string, title?: string) => {
  const userId = await getUserId();
  
  await insertEvent({
    user_id: userId,
    session_id: getSessionId(),
    event_type: "page_view",
    page_path: path,
    page_title: title || document.title,
    device_type: getDeviceType(),
    metadata: {
      referrer: document.referrer,
      screen_width: window.innerWidth,
      screen_height: window.innerHeight
    }
  });
};

// Track page duration (call when leaving a page)
export const trackPageDuration = async (path: string, durationMs: number) => {
  const userId = await getUserId();
  
  await insertEvent({
    user_id: userId,
    session_id: getSessionId(),
    event_type: "page_duration",
    page_path: path,
    page_title: document.title,
    duration_ms: Math.round(durationMs),
    device_type: getDeviceType()
  });
};

// Track user interaction
export const trackInteraction = async (
  target: string,
  type: "click" | "scroll" | "swipe" | "submit" | "toggle" | "scan" | "add_collection",
  metadata?: Record<string, unknown>
) => {
  const userId = await getUserId();
  
  await insertEvent({
    user_id: userId,
    session_id: getSessionId(),
    event_type: "interaction",
    page_path: window.location.pathname,
    interaction_type: type,
    interaction_target: target,
    device_type: getDeviceType(),
    metadata: metadata || {}
  });
};

// Track custom event
export const trackEvent = async (
  eventName: string,
  metadata?: Record<string, unknown>
) => {
  const userId = await getUserId();
  
  await insertEvent({
    user_id: userId,
    session_id: getSessionId(),
    event_type: eventName,
    page_path: window.location.pathname,
    device_type: getDeviceType(),
    metadata: metadata || {}
  });
};
