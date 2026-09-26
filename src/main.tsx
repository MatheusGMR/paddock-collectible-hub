import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/pwa";

const RECOVERY_FLAG = "paddock_recovered";

async function purgeAndReload() {
  if (sessionStorage.getItem(RECOVERY_FLAG)) return; // evita loop
  sessionStorage.setItem(RECOVERY_FLAG, "1");
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch (e) {
    console.warn("[App] Recovery failed:", e);
  }
  window.location.reload();
}
(window as unknown as { __paddockRecover: () => void }).__paddockRecover = () => {
  sessionStorage.removeItem(RECOVERY_FLAG);
  void purgeAndReload();
};

// Cache-busting: force reload when build changes
const currentBuild = __WEB_BUILD_ID__;
const storedBuild = localStorage.getItem("app_build_id");
localStorage.setItem("app_build_id", currentBuild);
if (storedBuild && storedBuild !== currentBuild) {
  void purgeAndReload();
}

window.addEventListener("load", () => {
  void registerServiceWorker();
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
  setTimeout(() => sessionStorage.removeItem(RECOVERY_FLAG), 10000);
} catch (e) {
  console.error("[App] Render failed:", e);
  void purgeAndReload();
}
