import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import app, { db } from '@/lib/firebase';
import { toast } from '@/hooks/use-toast';

const VAPID_KEY = 'BD3SOEL9skyAtZC4mrB9ajF3M_KKD1--mFatZRETKCZ-qlVsj8150frfBkBxtUjGG-hSA-louo8iPwsRbfE9UsQ';

let messaging: ReturnType<typeof getMessaging> | null = null;

// Initialize messaging only in browser environment
const initMessaging = () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
      return messaging;
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      return null;
    }
  }
  return null;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);

    const msg = initMessaging();
    if (!msg) {
      console.error('Messaging not initialized');
      return null;
    }

    // Get FCM token
    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      // Save token to Firestore
      await saveFcmToken(userId, token);
      console.log('FCM Token obtained and saved');
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Save FCM token to Firestore
export const saveFcmToken = async (userId: string, token: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { fcmToken: token }, { merge: true });
    console.log('FCM token saved for user:', userId);
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

// Get FCM token for a user
export const getFcmToken = async (userId: string): Promise<string | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return userDoc.data()?.fcmToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Setup foreground message handler
export const setupForegroundMessageHandler = (): void => {
  const msg = initMessaging();
  if (!msg) return;

  onMessage(msg, (payload) => {
    console.log('Received foreground message:', payload);
    
    // Show toast notification
    toast({
      title: payload.notification?.title || 'New Announcement',
      description: payload.notification?.body || 'You have a new announcement',
    });

    // Also show browser notification
    if (Notification.permission === 'granted') {
      new Notification(payload.notification?.title || 'New Announcement', {
        body: payload.notification?.body || 'You have a new announcement',
        icon: '/psau-logo.png',
      });
    }
  });
};

// Check if notifications are supported and enabled
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Get current permission status
export const getNotificationPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
