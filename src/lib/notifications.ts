// Push Notification utilities

export class NotificationManager {
  private static instance: NotificationManager;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    }

    return Notification.permission;
  }

  async showMentionNotification(data: {
    title: string;
    body: string;
    senderName: string;
    senderId: number;
    mentionId?: number;
  }): Promise<void> {
    console.log('=== MENTION NOTIFICATION DEBUG ===');
    console.log('Data:', data);
    console.log('Permission status:', Notification.permission);
    console.log('Page visibility:', document.visibilityState);
    console.log('Page has focus:', document.hasFocus());
    console.log('Service worker registration:', this.registration);
    
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return;
    }

    // TEMPORARY: Always show notifications for testing (remove page visibility check)
    // if (document.visibilityState === 'visible' && document.hasFocus()) {
    //   console.log('Page is visible, skipping notification');
    //   return;
    // }
    console.log('Proceeding to show notification...');

    try {
      // Use service worker for persistent notifications
      if (this.registration) {
        console.log('Using service worker notification...');
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'mention-notification',
          data: {
            url: '/chat',
            mentionId: data.mentionId,
            senderId: data.senderId,
            senderName: data.senderName
          },
          requireInteraction: false,
          silent: false
        });
        console.log('Service worker notification shown successfully');
      } else {
        // Fallback to simple notification
        console.log('Using fallback notification...');
        const notification = new Notification(data.title, {
          body: data.body,
          icon: '/favicon.ico',
          tag: 'mention-notification'
        });
        console.log('Fallback notification created:', notification);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      // Ultimate fallback - try simple notification
      try {
        console.log('Trying ultimate fallback notification...');
        const fallbackNotification = new Notification(data.title, {
          body: data.body
        });
        console.log('Ultimate fallback notification shown:', fallbackNotification);
      } catch (fallbackError) {
        console.error('Even fallback notification failed:', fallbackError);
      }
    }
  }

  async showSimpleNotification(title: string, body: string): Promise<void> {
    console.log('=== SIMPLE NOTIFICATION DEBUG ===');
    console.log('Title:', title, 'Body:', body);
    
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Permission not granted for simple notification');
      return;
    }

    // TEMPORARY: Always show for testing
    // if (document.visibilityState === 'visible' && document.hasFocus()) {
    //   return;
    // }
    console.log('Showing simple notification...');

    try {
      if (this.registration) {
        await this.registration.showNotification(title, {
          body: body,
          icon: '/favicon.ico',
          tag: 'chat-notification',
          requireInteraction: false,
          silent: false
        });
      } else {
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          tag: 'chat-notification'
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
}

export const notificationManager = NotificationManager.getInstance();