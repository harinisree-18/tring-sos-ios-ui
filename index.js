/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {playEmergencySound, initializeSound} from './src/services/soundService';

// Initialize sound when the app starts (even in background)
try {
  initializeSound();
} catch (error) {
  console.error('Error initializing sound:', error);
}

// Import Firebase messaging with error handling
let messaging = null;

// Use conditional imports for better error handling
const loadFirebaseModules = async () => {
  try {
    // Import Firebase configuration
    const { initializeFirebase } = await import('./src/config/firebase');
    
    // Initialize Firebase
    const firebaseInitialized = await initializeFirebase();
    if (!firebaseInitialized) {
      console.warn('Firebase initialization failed in index.js, skipping messaging setup');
      return;
    }
    
    const firebaseMessaging = await import('@react-native-firebase/messaging');
    messaging = firebaseMessaging.default;
    console.log('Firebase modules loaded successfully in index.js');

    // Set up background message handler only if messaging is available
    if (messaging) {
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Message handled in the background!', remoteMessage);

        // Play emergency sound for SOS notifications
        if (remoteMessage.data?.sosId) {
          try {
            playEmergencySound();
          } catch (error) {
            console.error('Error playing emergency sound:', error);
          }
        }
      });
    }
  } catch (error) {
    console.error('Firebase messaging not available in index.js:', error);
  }
};

// Load Firebase modules
loadFirebaseModules();

AppRegistry.registerComponent(appName, () => App);
