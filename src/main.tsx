import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa";

// Cache-busting: force reload when build changes (fixes WKWebView stale cache on iOS)
const currentBuild = __WEB_BUILD_ID__;
const storedBuild = localStorage.getItem("app_build_id");
console.log("[App] WEB_BUILD_ID:", currentBuild, "stored:", storedBuild);

if (storedBuild && storedBuild !== currentBuild) {
  console.log("[App] Build changed, purging caches and reloading...");
  localStorage.setItem("app_build_id", currentBuild);
  if ('caches' in window) {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name))).then(() => {
        (window as Window).location.reload();
      });
    });
  } else {
    (window as Window).location.reload();
  }
} else {
  localStorage.setItem("app_build_id", currentBuild);
}

// Register the service worker (offline support in production, push everywhere else)
window.addEventListener('load', () => {
  void registerServiceWorker();
});

createRoot(document.getElementById("root")!).render(<App />);
