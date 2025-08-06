// Firebase configuration based on GoogleService-info.plist
export const firebaseConfig = {
  projectId: 'womensos-19b13',
  apiKey: 'AIzaSyD4_xC66hhKZMVn_l1OoiaQ1oA_fLbPxxY',
  databaseURL: 'https://womensos-19b13-default-rtdb.firebaseio.com',
  storageBucket: 'womensos-19b13.firebasestorage.app',
  messagingSenderId: '423810195957',
  appId: '1:423810195957:ios:d0d176d825d316581a80bc',
  clientId: '423810195957-als0bce01kop3gov1vik52qed90hgru4.apps.googleusercontent.com'
};

// Firebase initialization function
export const initializeFirebase = async () => {
  try {
    const firebaseApp = await import('@react-native-firebase/app');
    const app = firebaseApp.default;
    
    // Check if Firebase app is already initialized
    if (!app.apps || app.apps.length === 0) {
      await app.initializeApp(firebaseConfig);
      console.log('Firebase app initialized successfully');
      return true;
    } else {
      console.log('Firebase app already initialized');
      return true;
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
};

export default firebaseConfig; 