import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build telemetry - log which bundle is loaded (critical for iOS debugging)
console.log("[App] WEB_BUILD_ID:", __WEB_BUILD_ID__);

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
