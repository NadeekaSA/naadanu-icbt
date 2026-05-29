import { supabase } from './supabase';

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Strip any whitespace, quotes, or invalid characters just in case
  const cleanBase64String = base64String.replace(/[^a-zA-Z0-9\-_]/g, '');
  
  const padding = '='.repeat((4 - (cleanBase64String.length % 4)) % 4);
  const base64 = (cleanBase64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (e) {
    console.error('Base64 decode failed for string:', base64);
    throw e;
  }
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
}

/**
 * Registers the Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service Worker registered successfully with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return undefined;
    }
  }
  return undefined;
}

/**
 * Subscribes the current user to push notifications
 */
export async function subscribeUserToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return false;
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('VITE_VAPID_PUBLIC_KEY environment variable is not defined.');
    return false;
  }

  try {
    // 1. Ensure Service Worker is registered and active
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await registerServiceWorker();
    }

    if (!registration) {
      console.error('No service worker registration is available.');
      return false;
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was denied.');
      return false;
    }

    // 3. Subscribe to Push Service
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    };

    // Unsubscribe from any existing subscription to avoid VAPID key mismatch errors
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }

    subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('Push subscription obtained:', subscription);

    // 4. Extract keys
    const authKey = arrayBufferToBase64(subscription.getKey('auth'));
    const p256dhKey = arrayBufferToBase64(subscription.getKey('p256dh'));

    if (!authKey || !p256dhKey) {
      throw new Error('Failed to retrieve keys from push subscription');
    }

    // 5. Store/Sync subscription details in Supabase
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        auth: authKey,
        p256dh: p256dhKey
      }
    };

    // Check if subscription already exists for this endpoint
    const { data: existing, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching subscription:', fetchError);
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          participant_id: userId,
          keys: subscriptionData.keys
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({
          participant_id: userId,
          endpoint: subscriptionData.endpoint,
          keys: subscriptionData.keys
        });

      if (insertError) throw insertError;
    }

    console.log('Web Push subscription synced successfully with Supabase.');
    return true;
  } catch (error) {
    console.error('Error subscribing user to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribes the user from push notifications on the current browser/device
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    // Remove subscription from Supabase first
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', subscription.endpoint);

    if (error) {
      console.error('Error deleting subscription from Supabase:', error);
    }

    // Unsubscribe from browser's push service
    const unsubscribed = await subscription.unsubscribe();
    console.log('Push subscription removed successfully:', unsubscribed);
    return unsubscribed;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}
