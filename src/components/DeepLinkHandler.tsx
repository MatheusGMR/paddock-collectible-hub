import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export const DeepLinkHandler = () => {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      listenerHandle = await App.addListener("appUrlOpen", async (event) => {
        console.log("[DeepLink] URL received:", event.url);
        
        try {
          const url = new URL(event.url);
          
          // Check for OAuth callback params in query string
          let accessToken = url.searchParams.get("access_token");
          let refreshToken = url.searchParams.get("refresh_token");
          
          // Also check hash fragment (some OAuth flows use this)
          if (!accessToken && url.hash) {
            const hashParams = new URLSearchParams(url.hash.substring(1));
            accessToken = hashParams.get("access_token");
            refreshToken = hashParams.get("refresh_token");
          }
          
          if (accessToken && refreshToken) {
            console.log("[DeepLink] Setting session from OAuth callback");
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error("[DeepLink] Error setting session:", error);
            } else {
              console.log("[DeepLink] Session set successfully");
            }
          }
        } catch (error) {
          console.error("[DeepLink] Error processing URL:", error);
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return null;
};
