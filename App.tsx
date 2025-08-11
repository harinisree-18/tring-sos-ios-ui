import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  PermissionsAndroid,
  LogBox,
  NativeModules,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import EmployeeScreen from './src/components/EmployeeScreen';
import AdminScreen from './src/components/AdminScreen';
import api from './src/components/config/axios';
import {
  requestUserPermission,
  getFCMToken,
  createNotificationChannel,
} from './src/notifications/NotificationService';
import {
  setupNotificationHandlers,
  triggerNavigationToAlerts,
} from './src/notifications/NotificationService';
import axios from './src/components/config/axios';
import './src/i18n';
import LanguageSelector from './src/components/LanguageSelector';
import {useTranslation} from 'react-i18next';
import i18n from './src/i18n';
import fallDetectionService from './src/services/fallDetectionService';

// Import Firebase messaging with improved error handling
let messaging: any = null;
let FirebaseMessagingTypes: any = null;

// Use conditional imports for better error handling
const loadFirebaseModules = async () => {
  try {
    // Import Firebase configuration
    const { initializeFirebase } = await import('./src/config/firebase');
    
    // Initialize Firebase
    const firebaseInitialized = await initializeFirebase();
    if (!firebaseInitialized) {
      console.warn('Firebase initialization failed, skipping messaging setup');
      return;
    }
    
    const firebaseMessaging = await import('@react-native-firebase/messaging');
    messaging = firebaseMessaging.default;
    FirebaseMessagingTypes = firebaseMessaging.FirebaseMessagingTypes;
    console.log('Firebase modules loaded successfully in App.tsx');
  } catch (error) {
    console.error('Firebase messaging not available in App.tsx:', error);
  }
};

// Load Firebase modules
loadFirebaseModules();

import SignUp from './src/components/SignUp';
import ForgotPassword from './src/components/ForgotPassword';
import backgroundLocationService from './src/services/backgroundLocationService';

const {width, height} = Dimensions.get('window');

// Hide all yellow box warnings
LogBox.ignoreAllLogs(true);

// Suppress specific warnings
LogBox.ignoreLogs([
  'Package @mauron85/react-native-background-geolocation contains invalid configuration: "dependency.hooks" is not allowed.',
  'Please verify it\'s properly linked using "react-native config" command and contact the package maintainers about this.',
]);

// Optionally, suppress all red box errors (UI overlay)
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler =
    ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (defaultHandler) defaultHandler(error, isFatal);
  });
}

// Add global test function for manual testing
if (__DEV__) {
  (global as any).testNotificationNavigation = () => {
    console.log('Manual test: Triggering navigation to alerts');
    triggerNavigationToAlerts();
  };
}

// Validation helper functions
const validatePhoneNumber = (phone: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

const validatePassword = (password: string | any[]) => {
  return password.length >= 6;
};

const formatPhoneNumber = (phone: string) => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  } else if (cleaned.length <= 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10,
    )}`;
  }
};

export default function App() {
  const {t} = useTranslation();
  const [role, setRole] = useState<string | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fcmToken, setFcmToken] = useState('');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);
  const [showSignUpPage, setShowSignUpPage] = useState(false);
  const [showForgotPasswordPage, setShowForgotPasswordPage] = useState(false);
  const [loginErrors, setLoginErrors] = useState<
    Record<string, string | undefined>
  >({});
  const [appVersion] = useState('1.0.0');

  // Navigation state for notification handling
  const [initialNavigation, setInitialNavigation] = useState<string | null>(
    null,
  );

  useEffect(() => {
    try {
      if (i18n.isInitialized) {
        setI18nReady(true);
        return;
      }

      const onInitialized = () => {
        setI18nReady(true);
        console.log('i18n initialized');
      };
      const onFailed = () => {
        setI18nReady(true);
        console.error('i18n failed to load');
      };

      i18n.on('initialized', onInitialized);
      i18n.on('failedLoading', onFailed);

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        setI18nReady(true);
        console.log('i18n timeout - forcing ready state');
      }, 5000);

      return () => {
        clearTimeout(timeout);
        i18n.off('initialized', onInitialized);
        i18n.off('failedLoading', onFailed);
      };
    } catch (error) {
      console.error('Error in i18n initialization:', error);
      setI18nReady(true);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }

        // Only initialize Firebase if it's properly configured
        try {
          await requestUserPermission();
          await createNotificationChannel();
          setupNotificationHandlers();
          // Get and log the FCM token
          const token = await getFCMToken();
          if (token) {
            setFcmToken(token);
            console.log('FCM Token:', token);
            // Store FCM token in AsyncStorage for future use
            await AsyncStorage.setItem('fcmToken', token);
            console.log('FCM token stored in AsyncStorage during app initialization');
          }
        } catch (firebaseError) {
          console.warn('Firebase initialization failed, continuing without notifications:', firebaseError);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    // Set up app state change listener for FCM token refresh
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && global.refreshFCMToken) {
        console.log('App became active, calling FCM token refresh...');
        global.refreshFCMToken();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Handle notification when app is opened from quit state
    const handleInitialNotification = async () => {
      if (messaging) {
        try {
          const remoteMessage = await messaging().getInitialNotification();
          if (remoteMessage) {
            console.log(
              'Notification caused app to open from quit state:',
              remoteMessage,
            );
            // Set initial navigation to alerts for both admin and user
            setInitialNavigation('alerts');
            console.log('Initial navigation set to alerts');
          }
        } catch (error) {
          console.error('Error getting initial notification:', error);
        }
      } else {
        console.warn(
          'Firebase messaging not available for initial notification check',
        );
      }
    };

    // Cleanup function
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };

    // Check if user is logged in
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');

        if (token && userData) {
          const user = JSON.parse(userData);
          setRole(user?.role?.name || user?.role);
          setUserId(user.id);
          setUserName(user.name);
          setLoginModalVisible(false);

          // After user is loaded, check for initial notification
          await handleInitialNotification();
        } else {
          // Even if not logged in, check for initial notification
          await handleInitialNotification();
        }
      } catch (error: any) {
        console.error('Error checking login status:', error);
      }
    };

    initializeApp();
    checkLoginStatus();
  }, []);

  // Fall detection is now controlled by the toggle in EmployeeScreen
  // and will be started/stopped based on user preference

  if (!i18nReady) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0'}}>
        <ActivityIndicator size="large" color="#3949ab" />
        <Text style={{marginTop: 10, color: '#333'}}>Loading translations...</Text>
      </View>
    );
  }

  // Show SignUp page if requested
  if (showSignUpPage) {
    return (
      <SignUp
        onClose={() => setShowSignUpPage(false)}
        onSignUpSuccess={() => {
          setShowSignUpPage(false);
          if (!userId && !role) {
            Alert.alert(t('common.success'), t('common.signUpSuccess'));
          }
        }}
      />
    );
  }

  // Show ForgotPassword page if requested
  if (showForgotPasswordPage) {
    return <ForgotPassword onClose={() => setShowForgotPasswordPage(false)} />;
  }

  const validateLoginForm = () => {
    const errors = {};

    if (!phone.trim()) {
      (errors as any).phone = 'Phone number is required';
    } else if (!validatePhoneNumber(phone)) {
      (errors as any).phone =
        'Please enter a valid phone number (10-15 digits)';
    }

    if (!password) {
      (errors as any).password = 'Password is required';
    } else if (!validatePassword(password)) {
      (errors as any).password = 'Password must be at least 6 characters long';
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Get the FCM token with error handling
      let fcmToken = null;
      try {
        fcmToken = await getFCMToken();
        console.log('FCM Token to send:', fcmToken);
      } catch (error) {
        console.warn('Failed to get FCM token:', error);
      }

      const response = await api.post('/auth/login', {
        phone: phone?.replaceAll('-', '')?.toString(),
        password,
        fcmToken: fcmToken,
        platform: Platform.OS,
        appVersion: appVersion,
      });

      console.log('Login response:', response.data);

      if (response.data.access_token && response.data.user) {
        console.log('access_token_current', response.data.access_token);
        await AsyncStorage.setItem('token', response.data.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store FCM token for future use
        if (fcmToken) {
          await AsyncStorage.setItem('fcmToken', fcmToken);
          console.log('FCM token stored in AsyncStorage');
        }

        setRole(
          response.data.user.role?.name || response.data.user.role || null,
        );
        setUserId(response.data.user.id);
        setUserName(response.data.user.name);
        setLoginModalVisible(false);
        setLoginErrors({});
      } else {
        Alert.alert(t('auth.loginFailed'), t('auth.invalidCredentials'));
      }
    } catch (error) {
      const err: any = error;
      let errorMessage = t('auth.loginError');
      if (err.response) {
        errorMessage = err.response.data.message || errorMessage;
      } else if (err.request) {
        errorMessage = t('auth.noResponse');
      }
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    if (loginErrors.phone) {
      setLoginErrors({...loginErrors, phone: undefined});
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (loginErrors.password) {
      setLoginErrors({...loginErrors, password: undefined});
    }
  };

  const handleLogout = async () => {
    try {
      // Get the current FCM token with error handling
      let currentFcmToken = null;
      try {
        currentFcmToken = await getFCMToken();
      } catch (error) {
        console.warn('Failed to get FCM token for logout:', error);
      }

      // Make logout API call with FCM token if available
      if (currentFcmToken) {
        try {
          await api.post('/auth/logout', {
            userId: userId || 0,
            fcm_token: currentFcmToken,
          });
          console.log('Logout API call successful');
        } catch (apiError: any) {
          console.error('Logout API call failed:', apiError);
          // Continue with local logout even if API call fails
        }
      }
      await backgroundLocationService.stop();
      // Clear background location SharedPreferences (native)
      try {
        await backgroundLocationService.clearPreferences();
      } catch (e) {
        console.log('unable to clear the prefs', e);
        // Ignore errors, continue logout
      }
      // Clear local storage and state
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.clear();
      setRole(null);
      setUserId(null);
      setUserName('');
      setPhone('');
      setPassword('');
      setLoginErrors({});
      setLoginModalVisible(true);
      setInitialNavigation(null);
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Language Selector Modal */}
      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onLanguageChange={() => {}}
      />
      {/* Login Modal */}
      <Modal visible={loginModalVisible} transparent animationType="fade">
        <LinearGradient
          colors={['#1a237e', '#283593', '#3949ab']}
          style={styles.gradientBackground}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{t('common.welcome')}</Text>
                  <Text style={styles.modalSubtitle}>{t('common.signIn')}</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{t('common.phone')}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        loginErrors.phone ? styles.inputError : undefined,
                      ]}
                      placeholder={t('common.enterPhone')}
                      placeholderTextColor="#a0a0a0"
                      value={phone}
                      onChangeText={handlePhoneChange}
                      autoCapitalize="none"
                      keyboardType="phone-pad"
                    />
                    {loginErrors.phone && (
                      <Text style={styles.errorText}>{loginErrors.phone}</Text>
                    )}
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      {t('common.password')}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        loginErrors.password ? styles.inputError : undefined,
                      ]}
                      placeholder={t('common.enterPassword')}
                      placeholderTextColor="#a0a0a0"
                      value={password}
                      onChangeText={handlePasswordChange}
                      secureTextEntry={!isPasswordVisible}
                    />
                    {loginErrors.password && (
                      <Text style={styles.errorText}>
                        {loginErrors.password}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => setShowForgotPasswordPage(true)}>
                    <Text style={styles.forgotPasswordText}>
                      {t('common.forgotPassword')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.loginButtonText}>
                        {t('common.login')}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      {t('common.dontHaveAccount')}
                      <Text
                        style={styles.footerLink}
                        onPress={() => setShowSignUpPage(true)}>
                        {t('common.signUp')}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {/* Citizen Dashboard */}
      {role === 'citizen' && (
        <EmployeeScreen
          userId={userId}
          userName={userName}
          backToLogin={handleLogout}
          fcmToken={fcmToken}
          initialNavigation={initialNavigation}
          onNavigationHandled={() => setInitialNavigation(null)}
        />
      )}

      {/* Admin Dashboard */}
      {role === 'admin' && (
        <AdminScreen
          userId={userId}
          backToLogin={handleLogout}
          initialNavigation={initialNavigation}
          onNavigationHandled={() => setInitialNavigation(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f8f8'},
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 25,
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#1a237e',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  inputError: {
    borderColor: '#ff6b6b',
    borderWidth: 1,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 5,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#1a237e',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1a237e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#1a237e',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#1a237e',
    fontWeight: 'bold',
  },
  languageGlobeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
