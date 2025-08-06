import {initializeApp, getApps, getApp} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {getDatabase} from 'firebase/database';
import {getMessaging} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyBbWZaW-41mL8VnfhmJqp1KIQd8xUm84Q0',
  authDomain: 'womensos-19b13.firebaseapp.com',
  databaseURL: 'https://womensos-19b13-default-rtdb.firebaseio.com',
  projectId: 'womensos-19b13',
  storageBucket: 'womensos-19b13.firebasestorage.app',
  messagingSenderId: '423810195957',
  appId: '1:423810195957:android:281f0f8646ef0ae91a80bc',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const database = getDatabase(app);
const firestore = getFirestore(app);

// Initialize messaging (only if supported)
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase messaging not supported:', error);
}

export {database, firestore, messaging};
