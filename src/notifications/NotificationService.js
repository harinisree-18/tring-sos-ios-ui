import {Platform, PermissionsAndroid} from 'react-native';
import notifee, {EventType, AndroidImportance} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    console.log('Requesting user permission for notifications...');
    console.log('Platform:', Platform.OS);
    console.log('Platform Version:', Platform.Version);
    
    if (Platform.OS === 'android') {
      console.log('Creating Android notification channel...');
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });
      console.log('Android notification channel created successfully');

      if (Platform.Version >= 33) {
        console.log('Requesting POST_NOTIFICATIONS permission...');
        const status = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        console.log('POST_NOTIFICATIONS permission status:', status);
        if (status !== 'granted') {
          console.warn('Notification permission denied');
        }
      }
    }

    if (messaging && requestPermission) {
      console.log('Requesting FCM permission...');
      
      // For iOS, register device for remote messages first
      if (Platform.OS === 'ios') {
        try {
          console.log('Registering iOS device for remote messages...');
          await messaging.registerDeviceForRemoteMessages();
          console.log('iOS device registered for remote messages successfully');
        } catch (error) {
          console.error('Failed to register iOS device for remote messages:', error);
          // Continue anyway as this might already be registered
        }
      }
      
      const authStatus = await requestPermission(messaging);
      console.log('FCM permission status:', authStatus);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
      
      console.log('FCM permission enabled:', enabled);
      return enabled;
    }

    console.log('No messaging or requestPermission available');
    return false;
  } catch (error) {
    console.error('Error requesting user permission:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

export async function getFCMToken() {
  try {
    console.log('Getting FCM token...');
    console.log('Messaging available:', !!messaging);
    
    if (!messaging) {
      console.warn('Firebase messaging not available');
      return null;
    }

    try {
      const token = await messaging.getToken();
      console.log('FCM Token retrieved successfully:', token ? 'Yes' : 'No');
      console.log('FCM Token length:', token ? token.length : 0);
      return token;
    } catch (tokenError) {
      console.log('Initial FCM token retrieval failed:', tokenError.message);
      
      // For iOS, try to register device and retry
      if (Platform.OS === 'ios' && tokenError.message.includes('unregistered')) {
        try {
          console.log('Attempting to register iOS device for remote messages...');
          await messaging.registerDeviceForRemoteMessages();
          console.log('iOS device registered, retrying FCM token retrieval...');
          
          const retryToken = await messaging.getToken();
          console.log('FCM Token retrieved on retry:', retryToken ? 'Yes' : 'No');
          return retryToken;
        } catch (registrationError) {
          console.error('Failed to register iOS device:', registrationError);
          return null;
        }
      }
      
      throw tokenError;
    }
  } catch (error) {
    console.error('Failed to get FCM token', error);
    console.error('Error details:', error.message);
    return null;
  }
}

export async function createNotificationChannel() {
  try {
    console.log('Creating high importance notification channel...');
    await notifee.createChannel({
      id: 'high_importance_channel',
      name: 'High Importance Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    console.log('High importance notification channel created successfully');
  } catch (error) {
    console.error('Error creating notification channel:', error);
    console.error('Error details:', error.message);
  }
}

export function setupNotificationHandlers() {
  try {
    console.log('Setting up notification handlers...');
    console.log('Messaging available:', !!messaging);
    console.log('onMessage available:', !!onMessage);
    console.log('setBackgroundMessageHandler available:', !!setBackgroundMessageHandler);
    
    initializeSound();

    if (!messaging || !onMessage || !setBackgroundMessageHandler) {
      console.warn(
        'Firebase messaging not available for notification handlers',
      );
      return;
    }

    // Set up notifee event listener for notification interactions
    console.log('Setting up notifee event listeners...');
    notifee.onForegroundEvent(({type, detail}) => {
      console.log('Notifee foreground event:', type, detail);
      handleNotificationEvent(type, detail);
    });

    notifee.onBackgroundEvent(async ({type, detail}) => {
      console.log('Notifee background event:', type, detail);
      handleNotificationEvent(type, detail);
    });

    // Set up FCM token refresh listener
    if (messaging) {
      console.log('Setting up FCM token refresh listener...');
      messaging.onTokenRefresh(async (fcmToken) => {
        console.log('FCM token refreshed:', fcmToken);
        try {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          console.log('New FCM token stored in AsyncStorage');
        } catch (error) {
          console.error('Failed to store new FCM token:', error);
        }
      });
      
      // Also set up automatic token refresh when app becomes active
      console.log('Setting up automatic FCM token refresh...');
      const refreshTokenOnAppActive = async () => {
        try {
          console.log('App became active, refreshing FCM token...');
          const currentToken = await messaging.getToken();
          if (currentToken) {
            await AsyncStorage.setItem('fcmToken', currentToken);
            console.log('FCM token refreshed and stored on app active');
          }
        } catch (error) {
          console.error('Failed to refresh FCM token on app active:', error);
        }
      };
      
      // This will be called from the main app when it becomes active
      global.refreshFCMToken = refreshTokenOnAppActive;
    }

    // Foreground notification
    console.log('Setting up foreground message handler...');
    onMessage(messaging, async remoteMessage => {
      console.log('Foreground notification received:', remoteMessage);
      console.log('Notification data:', remoteMessage.data);
      console.log('SOS ID present:', !!remoteMessage.data?.sosId);

      if (remoteMessage.data?.sosId) {
        console.log('SOS notification detected in foreground');
        // Check if this is the sender's own SOS notification
        const currentUserId = await AsyncStorage.getItem('user').then(userStr => {
          try {
            return userStr ? JSON.parse(userStr).id : null;
          } catch (e) {
            return null;
          }
        });
        
        const sosEmployeeId = remoteMessage.data?.employeeId;
        console.log('Current user ID:', currentUserId);
        console.log('SOS employee ID:', sosEmployeeId);
        
        if (currentUserId && sosEmployeeId && currentUserId.toString() === sosEmployeeId.toString()) {
          console.log('This is the sender\'s own SOS notification, not playing sound');
        } else {
          console.log('SOS notification detected, playing emergency sound...');
          playEmergencySound();
        }
      } else {
        console.log('Non-SOS notification received');
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
    console.log('Setting up background message handler...');
    setBackgroundMessageHandler(messaging, async remoteMessage => {
      console.log('Background notification received:', remoteMessage);
      console.log('Background notification data:', remoteMessage.data);
      console.log('Background SOS ID present:', !!remoteMessage.data?.sosId);

      if (remoteMessage.data?.sosId) {
        console.log('Background SOS notification detected');
        // Check if this is the sender's own SOS notification
        const currentUserId = await AsyncStorage.getItem('user').then(userStr => {
          try {
            return userStr ? JSON.parse(userStr).id : null;
          } catch (e) {
            return null;
          }
        });
        
        const sosEmployeeId = remoteMessage.data?.employeeId;
        console.log('Background - Current user ID:', currentUserId);
        console.log('Background - SOS employee ID:', sosEmployeeId);
        
        if (currentUserId && sosEmployeeId && currentUserId.toString() === sosEmployeeId.toString()) {
          console.log('Background: This is the sender\'s own SOS notification, not playing sound');
        } else {
          console.log('Background SOS notification detected, playing emergency sound...');
          playEmergencySound();
        }
      } else {
        console.log('Background: Non-SOS notification received');
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
  console.log('Notification event received:', type);
  console.log('Notification detail:', detail);
  console.log('Notification data:', detail.notification?.data);

  if (type === EventType.PRESS || type === EventType.DISMISSED) {
    console.log('Notification action:', type, detail.notification);

    if (detail.notification?.data?.sosId && isEmergencySoundPlaying()) {
      console.log('Stopping emergency sound due to notification interaction');
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
