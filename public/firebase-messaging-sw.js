// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB7sqIUVHT5FLyaNPlVhr_moe_RjjhHIpU",
  authDomain: "pacfu-portal.firebaseapp.com",
  projectId: "pacfu-portal",
  storageBucket: "pacfu-portal.firebasestorage.app",
  messagingSenderId: "200278852782",
  appId: "1:200278852782:web:46f540cb0a53a7dcd1993f"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Announcement';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new announcement',
    icon: '/psau-logo.png',
    badge: '/psau-logo.png',
    tag: 'announcement',
    data: payload.data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('/announcements') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/announcements');
        }
      })
    );
  }
});
