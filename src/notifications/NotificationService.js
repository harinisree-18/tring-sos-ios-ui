import {Platform, PermissionsAndroid} from 'react-native';
import notifee, {EventType, AndroidImportance} from '@notifee/react-native';
import {
  playEmergencySound,
  stopEmergencySound,
  initializeSound,
  isEmergencySoundPlaying,
} from '../services/soundService';

// --- Modular Firebase imports with error handling ---
let messaging = null;
let getMessaging,
  onMessage,
  setBackgroundMessageHandler,
  requestPermission,
  AuthorizationStatus,
  getApp;

// Use conditional imports for better error handling
const loadFirebaseModules = async () => {
  try {
    const firebaseMessaging = await import('@react-native-firebase/messaging');
    const firebaseApp = await import('@react-native-firebase/app');

    getMessaging = firebaseMessaging.getMessaging;
    onMessage = firebaseMessaging.onMessage;
    setBackgroundMessageHandler = firebaseMessaging.setBackgroundMessageHandler;
    requestPermission = firebaseMessaging.requestPermission;
    AuthorizationStatus = firebaseMessaging.AuthorizationStatus;
    getApp = firebaseApp.getApp;

    messaging = getMessaging(getApp());
    console.log('Firebase modules loaded successfully');
  } catch (error) {
    console.error('Firebase messaging not available:', error);
  }
};

// Load Firebase modules
loadFirebaseModules();

export async function requestUserPermission() {
  try {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      if (Platform.Version >= 33) {
        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (status !== 'granted') {
          console.warn('Notification permission denied');
        }
      }
    }

    if (messaging && requestPermission) {
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      return enabled;
    }

    return false;
  } catch (error) {
    console.error('Error requesting user permission:', error);
    return false;
  }
}

export async function getFCMToken() {
  try {
    if (!messaging) {
      console.warn('Firebase messaging not available');
      return null;
    }

    const token = await messaging.getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token', error);
    return null;
  }
}

export async function createNotificationChannel() {
  try {
    await notifee.createChannel({
      id: 'high_importance_channel',
      name: 'High Importance Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch (error) {
    console.error('Error creating notification channel:', error);
  }
}

export function setupNotificationHandlers() {
  try {
    initializeSound();

    if (!messaging || !onMessage || !setBackgroundMessageHandler) {
      console.warn(
        'Firebase messaging not available for notification handlers',
      );
      return;
    }

    // Set up notifee event listener for notification interactions
    notifee.onForegroundEvent(({type, detail}) => {
      handleNotificationEvent(type, detail);
    });

    notifee.onBackgroundEvent(async ({type, detail}) => {
      handleNotificationEvent(type, detail);
    });

    // Foreground notification
    onMessage(messaging, async remoteMessage => {
      console.log('Foreground notification:', remoteMessage);

      if (remoteMessage.data?.sosId) {
        playEmergencySound();
      }

      await notifee.displayNotification({
        id: remoteMessage.data?.sosId || 'default',
        title: remoteMessage.notification?.title || 'New Notification',
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'high_importance_channel',
          sound: 'default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          ongoing: true,
        },
        ios: {
          foregroundPresentationOptions: {
            badge: true,
            sound: true,
            banner: true,
            list: true,
          },
        },
        data: remoteMessage.data,
      });
    });

    // Background or quit state
    setBackgroundMessageHandler(messaging, async remoteMessage => {
      console.log('Background notification:', remoteMessage);

      if (remoteMessage.data?.sosId) {
        playEmergencySound();
      }

      await notifee.displayNotification({
        id: remoteMessage.data?.sosId || 'default',
        title: remoteMessage.notification?.title || 'New Notification',
        body: remoteMessage.notification?.body,
        android: {
          channelId: 'high_importance_channel',
          sound: 'default',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          ongoing: true,
        },
        ios: {
          foregroundPresentationOptions: {
            badge: true,
            sound: true,
            banner: true,
            list: true,
          },
        },
        data: remoteMessage.data,
      });
    });
  } catch (error) {
    console.error('Error setting up notification handlers:', error);
  }
}

// Global navigation handler - will be set by the main component
let navigationHandler = null;

export function setNavigationHandler(handler) {
  console.log(
    'Setting navigation handler:',
    handler ? 'handler set' : 'handler cleared',
  );
  navigationHandler = handler;
}

function handleNotificationEvent(type, detail) {
  console.log('Notification event:', type, detail);

  if (type === EventType.PRESS || type === EventType.DISMISSED) {
    console.log('Notification action:', type, detail.notification);

    if (detail.notification?.data?.sosId && isEmergencySoundPlaying()) {
      stopEmergencySound();
    }

    if (type === EventType.PRESS) {
      // Navigate to alerts page when notification is clicked
      console.log('Notification pressed, navigating to alerts');
      if (navigationHandler) {
        try {
          navigationHandler('alerts');
          console.log('Navigation handler called successfully');
        } catch (error) {
          console.error('Error in navigation handler:', error);
        }
      } else {
        console.warn('Navigation handler not set - cannot navigate to alerts');
      }
    }
  }
}

// Export a function to manually trigger navigation (for testing)
export function triggerNavigationToAlerts() {
  console.log('Manually triggering navigation to alerts');
  if (navigationHandler) {
    try {
      navigationHandler('alerts');
      console.log('Manual navigation to alerts triggered successfully');
    } catch (error) {
      console.error('Error in manual navigation:', error);
    }
  } else {
    console.warn('Navigation handler not set - cannot manually navigate');
  }
}
