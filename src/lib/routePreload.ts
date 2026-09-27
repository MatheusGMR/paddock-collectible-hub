// Reuse the same import promises that React.lazy requests when a tab opens.
const routeImports: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/mercado": () => import("@/pages/Mercado"),
  "/scanner": () => import("@/pages/Scanner"),
  "/notifications": () => import("@/pages/Notifications"),
  "/profile": () => import("@/pages/Profile"),
};

export const preloadRoute = (path: string) => {
  const load = routeImports[path];
  if (load) void load().catch(() => undefined);
};