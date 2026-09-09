/**
 * Guarded service worker registration.
 *
 * The generated PWA worker (/sw.js) must never run in dev or in Lovable
 * previews — it would serve stale HTML inside the editor iframe.
 * In those contexts the push worker (/push-sw.js) is registered on its own,
 * so notifications keep working while offline caching stays off.
 */

const APP_SW_URL = "/sw.js";
export const PUSH_SW_URL = "/push-sw.js";

function isBlockedHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

/** Whether the offline (PWA) worker may be registered in this context. */
export function canUseAppServiceWorker(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isBlockedHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

/** Path of the worker that owns push notifications in the current context. */
export function pushServiceWorkerUrl(): string {
  return canUseAppServiceWorker() ? APP_SW_URL : PUSH_SW_URL;
}

async function unregisterAppServiceWorker() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((r) => (r.active?.scriptURL || r.waiting?.scriptURL || "").includes(APP_SW_URL))
        .map((r) => r.unregister()),
    );
  } catch (error) {
    console.warn("[PWA] Failed to unregister app service worker:", error);
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!canUseAppServiceWorker()) {
    await unregisterAppServiceWorker();
    try {
      await navigator.serviceWorker.register(PUSH_SW_URL);
    } catch (error) {
      console.warn("[PWA] Push worker registration skipped:", error);
    }
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(APP_SW_URL);
    console.log("[PWA] Service worker registered:", registration.scope);
  } catch (error) {
    console.warn("[PWA] Service worker registration failed:", error);
  }
}
