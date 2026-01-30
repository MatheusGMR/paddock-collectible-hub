import { supabase } from '@/integrations/supabase/client';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Get current permission status
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Request notification permission
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }
  
  const permission = await Notification.requestPermission();
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    // Get VAPID public key from edge function
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-subscribe', {
      body: { action: 'getVapidKey' },
    });
    
    if (vapidError || !vapidData?.publicKey) {
      console.error('Failed to get VAPID key:', vapidError);
      return false;
    }
    
    const registration = await registerServiceWorker();
    if (!registration) return false;
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    // Subscribe to push
    const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
    
    const subscriptionJson = subscription.toJSON();
    
    // Save subscription to database via edge function
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
    
    console.log('Push subscription successful');
    return true;
  } catch (error) {
    console.error('Push subscription error:', error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Remove from database
      await supabase.functions.invoke('push-subscribe', {
        body: {
          action: 'unsubscribe',
          endpoint: subscription.endpoint,
        },
      });
      
      // Unsubscribe from browser
      await subscription.unsubscribe();
    }
    
    return true;
  } catch (error) {
    console.error('Push unsubscription error:', error);
    return false;
  }
}

// Check if currently subscribed
export async function isSubscribedToPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return !!subscription;
  } catch {
    return false;
  }
}

// Utility: Convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
