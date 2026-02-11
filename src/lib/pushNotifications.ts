import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

// ─── Native (Capacitor) helpers ──────────────────────────────────
let nativePlugin: typeof import('@capacitor/push-notifications').PushNotifications | null = null;

async function getNativePlugin() {
  if (!nativePlugin) {
    const mod = await import('@capacitor/push-notifications');
    nativePlugin = mod.PushNotifications;
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
    // On native we can't synchronously know – return 'default' and let the async check handle it
    return 'default';
  }
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Request notification permission */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const plugin = await getNativePlugin();
      const result = await Promise.race([
        plugin.requestPermissions(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]);
      return result.receive === 'granted' ? 'granted' : 'denied';
    } catch (error) {
      console.error('[Push Native] requestPermissions failed:', error);
      return 'denied';
    }
  }

  if (!isPushSupported()) throw new Error('Push notifications not supported');
  return Notification.requestPermission();
}

/** Subscribe to push notifications */
export async function subscribeToPush(userId: string): Promise<boolean> {
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
    // Use local flag – checking permissions alone doesn't mean we registered
    return localStorage.getItem('push_native_subscribed') === 'true';
  }

  try {
    if (!isPushSupported()) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// ─── Native implementation ───────────────────────────────────────

async function subscribeNative(userId: string): Promise<boolean> {
  try {
    const plugin = await getNativePlugin();

    // Remove any stale listeners first
    await plugin.removeAllListeners();

    // Register to get the device token
    await plugin.register();
    console.log('[Push Native] register() called, waiting for token...');

    return new Promise<boolean>((resolve) => {
      // Timeout in case listener never fires
      const timeout = setTimeout(() => {
        console.error('[Push Native] Token listener timed out after 10s');
        resolve(false);
      }, 10000);

      plugin.addListener('registration', async (token) => {
        clearTimeout(timeout);
        console.log('[Push Native] Token received:', token.value?.substring(0, 20) + '...');

        const { error } = await supabase.functions.invoke('push-subscribe', {
          body: {
            action: 'subscribe-native',
            token: token.value,
            platform: Capacitor.getPlatform(),
          },
        });

        if (error) {
          console.error('[Push Native] Failed to save token:', error);
          resolve(false);
        } else {
          console.log('[Push Native] Subscription saved');
          localStorage.setItem('push_native_subscribed', 'true');
          resolve(true);
        }
      });

      plugin.addListener('registrationError', (err) => {
        clearTimeout(timeout);
        console.error('[Push Native] Registration error:', JSON.stringify(err));
        resolve(false);
      });
    });
  } catch (error) {
    console.error('[Push Native] Subscribe error:', error);
    return false;
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

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

async function subscribeWeb(userId: string): Promise<boolean> {
  try {
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-subscribe', {
      body: { action: 'getVapidKey' },
    });

    if (vapidError || !vapidData?.publicKey) {
      console.error('Failed to get VAPID key:', vapidError);
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) return false;

    await navigator.serviceWorker.ready;

    const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    const subscriptionJson = subscription.toJSON();

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
      console.error('Failed to save subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Push subscription error:', error);
    return false;
  }
}

async function unsubscribeWeb(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

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
