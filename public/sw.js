// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body || 'You have a new mention',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'mention-notification',
      data: {
        url: data.url || '/chat',
        mentionId: data.mentionId,
        senderId: data.senderId,
        senderName: data.senderName
      },
      actions: [
        {
          action: 'view',
          title: 'View Chat',
          icon: '/favicon.ico'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: true,
      silent: false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'New Mention', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    // Open or focus the chat page
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        const url = event.notification.data?.url || '/chat';
        
        // Check if chat is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/chat') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
  // If action is 'dismiss', just close the notification (already done above)
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});