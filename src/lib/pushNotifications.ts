import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// ─── Types ───────────────────────────────────────────────────────
export interface PushSubscribeResult {
  success: boolean;
  reason?: 'iframe_context' | 'sw_failed' | 'vapid_missing' | 'permission_denied' | 'token_timeout' | 'edge_function_error' | 'not_supported';
}

// ─── Native (Capacitor) helpers ──────────────────────────────────
let nativePlugin: typeof import('@capacitor/push-notifications').PushNotifications | null = null;

async function getNativePlugin() {
  if (!nativePlugin) {
    try {
      console.log('[Push Native] Importing @capacitor/push-notifications...');
      const mod = await Promise.race([
        import('@capacitor/push-notifications'),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('import_timeout_5s')), 5000)),
      ]);
      nativePlugin = mod.PushNotifications;
      console.log('[Push Native] Import successful, plugin ready');
    } catch (err) {
      console.error('[Push Native] Import failed or timed out:', err);
      throw err;
    }
  }
  return nativePlugin;
}

// ─── Public API ──────────────────────────────────────────────────

/** Whether the current environment supports push at all */
export function isPushSupported(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Current permission status */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (Capacitor.isNativePlatform()) {
    return 'default';
  }
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Request notification permission */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      console.log('[Push Native] Requesting permissions...');
      const plugin = await getNativePlugin();
      
      const currentStatus = await plugin.checkPermissions();
      console.log('[Push Native] Current permission status:', JSON.stringify(currentStatus));
      
      if (currentStatus.receive === 'granted') {
        console.log('[Push Native] Already granted, skipping request');
        return 'granted';
      }
      
      const result = await Promise.race([
        plugin.requestPermissions(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      console.log('[Push Native] requestPermissions result:', JSON.stringify(result));
      return result.receive === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('[Push Native] requestPermissions failed:', error);
      return 'denied';
    }
  }

  if (!isPushSupported()) return 'denied';
  
  try {
    return await Notification.requestPermission();
  } catch (error) {
    console.error('[Push Web] requestPermission failed (possibly iframe context):', error);
    return 'denied';
  }
}

/** Subscribe to push notifications — returns typed result with reason */
export async function subscribeToPush(userId: string): Promise<PushSubscribeResult> {
  if (Capacitor.isNativePlatform()) {
    return subscribeNative(userId);
  }
  return subscribeWeb(userId);
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return unsubscribeNative();
  }
  return unsubscribeWeb();
}

/** Check if currently subscribed */
export async function isSubscribedToPush(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    return localStorage.getItem('push_native_subscribed') === 'true';
  }

  try {
    if (!isPushSupported()) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// ─── Native implementation ───────────────────────────────────────

async function subscribeNative(userId: string): Promise<PushSubscribeResult> {
  try {
    console.log('[Push Native] Starting subscribeNative...');
    let plugin;
    try {
      plugin = await getNativePlugin();
      console.log('[Push Native] Plugin loaded OK');
    } catch (importError) {
      console.error('[Push Native] Failed to load plugin:', importError);
      return { success: false, reason: 'not_supported' };
    }

    // Remove any stale listeners first
    try {
      await plugin.removeAllListeners();
      console.log('[Push Native] Listeners cleared');
    } catch (clearErr) {
      console.warn('[Push Native] removeAllListeners error (non-fatal):', clearErr);
    }

    return new Promise<PushSubscribeResult>((resolve) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.error('[Push Native] Token listener timed out after 20s');
          resolve({ success: false, reason: 'token_timeout' });
        }
      }, 20000);

      plugin.addListener('registration', async (token) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.log('[Push Native] Token received:', token.value?.substring(0, 20) + '...');

        try {
          const { data, error } = await supabase.functions.invoke('push-subscribe', {
            body: {
              action: 'subscribe-native',
              token: token.value,
              platform: Capacitor.getPlatform(),
            },
          });

          console.log('[Push Native] Edge function response:', JSON.stringify(data), 'error:', error);

          if (error) {
            console.error('[Push Native] Failed to save token:', error);
            resolve({ success: false, reason: 'edge_function_error' });
          } else {
            console.log('[Push Native] Subscription saved successfully');
            localStorage.setItem('push_native_subscribed', 'true');
            resolve({ success: true });
          }
        } catch (invokeError) {
          console.error('[Push Native] Invoke error:', invokeError);
          resolve({ success: false, reason: 'edge_function_error' });
        }
      });

      plugin.addListener('registrationError', (err) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.error('[Push Native] Registration error:', JSON.stringify(err));
        resolve({ success: false, reason: 'permission_denied' });
      });

      console.log('[Push Native] Calling register() (handles permission + APNs)...');
      plugin.register().then(() => {
        console.log('[Push Native] register() resolved, waiting for token event...');
      }).catch((regError: Error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        console.error('[Push Native] register() threw:', regError);
        resolve({ success: false, reason: 'permission_denied' });
      });
    });
  } catch (error) {
    console.error('[Push Native] Subscribe error:', error);
    return { success: false, reason: 'not_supported' };
  }
}

async function unsubscribeNative(): Promise<boolean> {
  try {
    await supabase.functions.invoke('push-subscribe', {
      body: { action: 'unsubscribe-native' },
    });
    localStorage.removeItem('push_native_subscribed');
    return true;
  } catch (error) {
    console.error('[Push Native] Unsubscribe error:', error);
    return false;
  }
}

// ─── Web (Service Worker) implementation ─────────────────────────

async function subscribeWeb(userId: string): Promise<PushSubscribeResult> {
  try {
    // 1. Check iframe context
    const isIframe = window.self !== window.top;
    if (isIframe) {
      console.warn('[Push Web] Running inside iframe — Service Workers are blocked in cross-origin iframes');
      return { success: false, reason: 'iframe_context' };
    }

    // 2. Check basic support
    if (!isPushSupported()) {
      console.warn('[Push Web] Push API not supported in this browser');
      return { success: false, reason: 'not_supported' };
    }

    // 3. Request permission (unified — no need to call separately)
    console.log('[Push Web] Requesting notification permission...');
    try {
      const permission = await Notification.requestPermission();
      console.log('[Push Web] Permission result:', permission);
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }
    } catch (permError) {
      console.error('[Push Web] Permission request failed:', permError);
      return { success: false, reason: 'permission_denied' };
    }

    // 4. Get VAPID key from Edge Function
    console.log('[Push Web] Fetching VAPID key...');
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-subscribe', {
      body: { action: 'getVapidKey' },
    });

    if (vapidError || !vapidData?.publicKey) {
      console.error('[Push Web] Failed to get VAPID key:', vapidError, vapidData);
      return { success: false, reason: 'vapid_missing' };
    }
    console.log('[Push Web] VAPID key received');

    // 5. Register Service Worker
    console.log('[Push Web] Registering Service Worker...');
    if (!('serviceWorker' in navigator)) {
      console.error('[Push Web] navigator.serviceWorker not available');
      return { success: false, reason: 'sw_failed' };
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push Web] SW registered, scope:', registration.scope);
    } catch (swError) {
      console.error('[Push Web] SW registration failed:', swError);
      return { success: false, reason: 'sw_failed' };
    }

    await navigator.serviceWorker.ready;
    console.log('[Push Web] SW ready');

    // 6. Subscribe to PushManager
    console.log('[Push Web] Subscribing to PushManager...');
    const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
    console.log('[Push Web] PushManager subscription created');

    const subscriptionJson = subscription.toJSON();

    // 7. Save subscription to Edge Function
    console.log('[Push Web] Saving subscription to backend...');
    const { error } = await supabase.functions.invoke('push-subscribe', {
      body: {
        action: 'subscribe',
        subscription: {
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        },
      },
    });

    if (error) {
      console.error('[Push Web] Failed to save subscription:', error);
      return { success: false, reason: 'edge_function_error' };
    }

    console.log('[Push Web] ✅ Subscription complete!');
    return { success: true };
  } catch (error) {
    console.error('[Push Web] Unexpected error:', error);
    return { success: false, reason: 'sw_failed' };
  }
}

async function unsubscribeWeb(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await (registration as any).pushManager.getSubscription();

    if (subscription) {
      await supabase.functions.invoke('push-subscribe', {
        body: { action: 'unsubscribe', endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Push unsubscription error:', error);
    return false;
  }
}

// ─── Utility ─────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
