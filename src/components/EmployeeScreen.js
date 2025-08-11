import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
  Modal,
  AppState,
  Image,
  Switch,
  NativeModules,
  TextInput,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {database} from './config/firestore';
import {firestore} from './config/firestore';
import {
  ref,
  onValue,
  off,
  orderByChild,
  equalTo,
  limitToLast,
  push,
  query,
  set,
} from 'firebase/database';
import {
  collection,
  doc,
  onSnapshot,
  orderBy as orderByFirestore,
  setDoc,
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
// Note: Messaging functionality moved to NotificationService
import api from './config/axios.js';
import LanguageSelector from '../components/LanguageSelector';
import {useTranslation} from 'react-i18next';
import { shakeListener } from 'react-native-simple-shake';
import {
  startStreaming,
  stopStreaming,
  getIsStreaming,
} from '../services/streamService';
import UserListScreen from './UserListScreen';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import galleryService from '../services/galleryService';
import locationService from '../services/locationService';
import theme from '../utils/theme';
import ListUserAlerts from './listUserAlerts';
import {fetchRoutes, fetchContacts} from '../services/endpoints';
import backgroundLocationService from '../services/backgroundLocationService';
import fallDetectionService from '../services/fallDetectionService';
import MapScreen from './MapScreen';
import MyRoutesScreen from './MyRoutesScreen';
import SafetyTipsScreen from './SafetyTipsScreen';
import AreYouSafeScreen from './AreYouSafeScreen';
import {
  playEmergencySound,
  stopEmergencySound,
  isEmergencySoundPlaying,
} from '../services/soundService';
import Loader from './Loader';
import {updateLocation} from '../utils/mapsGeocoding';
import {setNavigationHandler} from '../notifications/NotificationService';
import {DeviceEventEmitter} from 'react-native';
import {FALL_DETECTION_EVENTS} from '../services/fallDetectionService';

const {width, height} = Dimensions.get('window');

const NAV_HOME = 'home';
const NAV_ALERTS = 'alerts';
const NAV_CHAT = 'chat';
const NAV_MAP = 'map';
const NAV_ROUTES = 'routes';

function BottomNavBar({current, onChange}) {
  const {t} = useTranslation();
  return (
    <View style={styles.bottomNavBar}>
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => onChange(NAV_HOME)}>
        <Icon
          name="home"
          size={28}
          color={current === NAV_HOME ? '#6a1b9a' : '#888'}
        />
        <Text
          style={[
            styles.bottomNavLabel,

            current === NAV_HOME && styles.bottomNavLabelActive,
            ,
          ]}>
          {t('common.home')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => onChange(NAV_ALERTS)}>
        <Icon
          name="warning"
          size={28}
          color={current === NAV_ALERTS ? '#6a1b9a' : '#888'}
        />
        <Text
          style={[
            styles.bottomNavLabel,

            current === NAV_ALERTS && styles.bottomNavLabelActive,
            ,
          ]}>
          {t('common.alerts')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => onChange(NAV_CHAT)}>
        <Icon
          name="chat"
          size={28}
          color={current === NAV_CHAT ? '#6a1b9a' : '#888'}
        />
        <Text
          style={[
            styles.bottomNavLabel,

            current === NAV_CHAT && styles.bottomNavLabelActive,
            ,
          ]}>
          {t('common.chat')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => onChange(NAV_MAP)}>
        <Icon
          name="map"
          size={28}
          color={current === NAV_MAP ? '#6a1b9a' : '#888'}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            current === NAV_MAP && styles.bottomNavLabelActive,
          ]}>
          {t('common.map')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.bottomNavItem}
        onPress={() => onChange(NAV_ROUTES)}>
        <Icon
          name="location-on"
          size={28}
          color={current === NAV_ROUTES ? '#6a1b9a' : '#888'}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            current === NAV_ROUTES && styles.bottomNavLabelActive,
          ]}>
          {t('common.myRoutes')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Utility to fetch user toggles
async function fetchUserToggles(userId) {
  const res = await api.get(`/users/${userId}`);
  return {
    isAudioAllowed: res.data.isAudioAllowed,
    isVideoAllowed: res.data.isVideoAllowed,
    isControllerAllowed: res.data.isControllerAllowed,
  };
}

export default function EmployeeScreen({
  userId,
  userName,
  backToLogin,
  fcmToken,
  initialNavigation,
  onNavigationHandled,
}) {
  // Log FCM token for debugging
  useEffect(() => {
    if (fcmToken) {
      console.log('EmployeeScreen: FCM Token available:', fcmToken);
    } else {
      console.log('EmployeeScreen: No FCM Token available');
    }
    
    // Also check AsyncStorage for FCM token
    const checkFCMTokenInStorage = async () => {
      try {
        const storedFCMToken = await AsyncStorage.getItem('fcmToken');
        console.log('EmployeeScreen: FCM Token in AsyncStorage:', storedFCMToken ? 'Available' : 'Not available');
        if (storedFCMToken) {
          console.log('EmployeeScreen: Stored FCM Token length:', storedFCMToken.length);
        }
        
        // If no FCM token in storage, try to get a fresh one
        if (!storedFCMToken) {
          console.log('No FCM token in storage, attempting to get fresh token...');
          try {
            const { getFCMToken } = require('../notifications/NotificationService');
            const freshToken = await getFCMToken();
            if (freshToken) {
              await AsyncStorage.setItem('fcmToken', freshToken);
              console.log('Fresh FCM token obtained and stored during initialization');
            }
          } catch (error) {
            console.error('Failed to get fresh FCM token during initialization:', error);
          }
        }
      } catch (error) {
        console.error('EmployeeScreen: Error checking FCM token in AsyncStorage:', error);
      }
    };
    
    checkFCMTokenInStorage();
  }, [fcmToken]);
  const [isSending, setIsSending] = useState(false);
  const [isSafe, setIsSafe] = useState(true);
  const [lastSwipeOut, setLastSwipeOut] = useState(null);
  const [location, setLocation] = useState('Goa');
  const [pendingSafetyCheck, setPendingSafetyCheck] = useState(null);
  const pulseAnim = new Animated.Value(1);
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);
  const [showSafetyConfirmation, setShowSafetyConfirmation] = useState(false);
  const [isSosActive, setIsSosActive] = useState(false);
  const [isLiveLocationSharing, setIsLiveLocationSharing] = useState(false);
  const {t, i18n} = useTranslation();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [sosId, setSosId] = useState(null);
  const [navPage, setNavPage] = useState(NAV_HOME);
  const [showChat, setShowChat] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [showUserDetailsPage, setShowUserDetailsPage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSafetyTipsPage, setShowSafetyTipsPage] = useState(false);
  const [uploadTimeout, setUploadTimeout] = useState(null);
  const [isLoading, setISLoading] = useState(false);

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState({
    primary: null,
    secondary: null,
    others: [], // { id, name, phone, relationship }
  });
  const [editingContact, setEditingContact] = useState(null); // { ...contact, type, index }
  const [addContactModal, setAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    relationship: '',
  });
  const [contactValidationErrors, setContactValidationErrors] = useState({
    name: '',
    phone: '',
    relationship: '',
  });
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState(false);
  const [showAreYouSafeScreen, setShowAreYouSafeScreen] = useState(false);
  const [isFallDetection, setIsFallDetection] = useState(false);
  const [isFallDetected, setIsFallDetected] = useState(false);

  // Add state and ref for slider animation
  const [showProfileSlider, setShowProfileSlider] = useState(false);
  const profileSliderAnim = useRef(new Animated.Value(-300)).current; // width of slider
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);

  // Function to get current location and update location state
  const updateCurrentLocation = async () => {
    await updateLocation(setLocation);
  };

  // Check sound status when Alerts page is shown
  useEffect(() => {
    if (navPage === NAV_ALERTS) {
      (async () => {
        const playing = await isEmergencySoundPlaying();
        setIsSoundPlaying(!!playing);
      })();
    }
  }, [navPage]);
  useEffect(() => {
    const checkForPendingNotifications = async () => {
      const storedSwipeOut = await AsyncStorage.getItem('lastSwipeOut');
      if (storedSwipeOut) {
        const swipeOutTime = new Date(storedSwipeOut);
        const now = new Date();
        const diffMinutes = (now - swipeOutTime) / (1000 * 60);

        if (now.getHours() >= 19 && diffMinutes >= 90 && diffMinutes < 135) {
          setShowSafetyConfirmation(true);
        }
      }
    };

    checkForPendingNotifications();
    fetchRoutes(userId);

    // Get current location on component mount
    updateCurrentLocation();
  }, [userId]);
  useEffect(() => {
    // Handle app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Check if any notification caused the app to open
        messaging()
          .getInitialNotification()
          .then(remoteMessage => {
            if (remoteMessage) {
              console.log('Notification caused app to open:', remoteMessage);
              // Navigate to alerts page when notification is clicked
              setNavPage(NAV_ALERTS);
            }
          });

        // Update location when app becomes active
        updateCurrentLocation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    (async () => {
      if (userId) {
        await backgroundLocationService.setUserId(String(userId));
        const numbers = await fetchContacts(userId);
        // console.log("numbers", JSON.stringify(numbers));
        await AsyncStorage.setItem('numbers', JSON.stringify(numbers));
      }
    })();
  }, [userId]);

  // Set up notification navigation handler
  useEffect(() => {
    setNavigationHandler(page => {
      console.log('EmployeeScreen navigation handler called with page:', page);
      if (page === 'alerts') {
        console.log('Setting navPage to NAV_ALERTS');
        setNavPage(NAV_ALERTS);
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up EmployeeScreen navigation handler');
      setNavigationHandler(null);
    };
  }, []);

  // Listen for fall detection events - only when fall detection is enabled
  useEffect(() => {
    if (!isFallDetection) {
      return; // Don't set up listener if fall detection is disabled
    }

    const fallDetectionListener = DeviceEventEmitter.addListener(
      FALL_DETECTION_EVENTS.FALL_DETECTED,
      async event => {
        console.log('Fall detected event received:', event);

        // Only trigger if this is for the current user and fall detection is still enabled
        if (event.userId === userId && !isSosActive && isFallDetection) {
          console.log('Triggering SOS from fall detection');

          // Show alert to user
          Alert.alert(
            'Fall Detected',
            'A harsh drop was detected. SOS alert is being triggered automatically.',
            [{text: 'OK'}],
          );

          // Trigger the same SOS flow as the manual button
          // await handleSOS(false);

          setIsFallDetected(true);
          setShowAreYouSafeScreen(true);
        }
      },
    );

    return () => {
      fallDetectionListener.remove();
    };
  }, [userId, isSosActive, isFallDetection]);
  const handleProfileImageClick = () => {
    if (userDetails?.profileImage) {
      setShowImageModal(true);
    } else {
      handleProfileImageChange();
    }
  };

  const handleProfileImageChange = async () => {
    if (uploadingImage) return; // Prevent multiple uploads

    try {
      const imageUri = await galleryService.openGallery();
      if (imageUri) {
        setUploadingImage(true);

        console.log('Starting image upload for user:', userId);
        console.log('Selected image URI:', imageUri);

        // Add a small delay to prevent race conditions
        await new Promise(resolve => setTimeout(resolve, 100));

        // Upload image to backend
        let uploadResponse;
        try {
          uploadResponse = await galleryService.uploadImage(imageUri, userId);

          console.log('Upload response received:', uploadResponse);

          if (uploadResponse && uploadResponse.imageUrl) {
            // Update the user details with the uploaded image URL
            const updatedUserDetails = {
              ...userDetails,
              profileImage: uploadResponse.imageUrl,
              imageUrl: uploadResponse.imageUrl, // Also update the backend field
            };
            setUserDetails(updatedUserDetails);

            Alert.alert(
              t('common.success', 'Success'),
              t(
                'employee.profileImageUpdated',
                'Profile image updated successfully',
              ),
            );
          } else {
            console.error('Invalid upload response:', uploadResponse);
            throw new Error('No image URL received from server');
          }
        } catch (uploadError) {
          console.error('Upload failed, trying fallback:', uploadError);

          // Fallback: Update UI with local image temporarily
          // const updatedUserDetails = {
          //   ...userDetails,
          //   profileImage: imageUri,
          // };
          // setUserDetails(updatedUserDetails);

          // Alert.alert(
          //   t('common.warning', 'Warning'),
          //   'Image uploaded locally but server sync failed. Please try again later.',
          // );

          return; // Exit early since we handled the error
        }
      }
    } catch (error) {
      console.error('Error selecting/uploading profile image:', error);

      // Don't show error alert for cancelled gallery selection
      if (error.message !== 'Gallery selection was cancelled') {
        let errorMessage = t(
          'employee.failedToUpdateProfileImage',
          'Failed to update profile image',
        );

        // Provide more specific error messages
        if (error.message.includes('Server error:')) {
          errorMessage = error.message;
        } else if (error.message.includes('Network error:')) {
          errorMessage =
            'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Upload failed:')) {
          errorMessage = error.message;
        }

        Alert.alert(t('common.error', 'Error'), errorMessage);
      }
    } finally {
      // Clear any existing timeout
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
      }

      // Add a small delay before resetting the upload state
      const timeout = setTimeout(() => {
        setUploadingImage(false);
      }, 500);

      setUploadTimeout(timeout);
    }
  };

  const handleSafeArrivalConfirmation = async () => {
    try {
      setIsSending(true);

      await api.post('/confirm-arrival', {
        employeeId: userId,
        timestamp: new Date().toISOString(),
        location: 'Home',
      });

      Alert.alert(t('employee.confirmed'), t('employee.safeArrivalRecorded'));
      setIsSafe(true);
      setShowSafetyConfirmation(false);
      await AsyncStorage.removeItem('lastSwipeOut');
    } catch (error) {
      Alert.alert(t('common.error'), t('employee.failedToConfirmArrival'));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    const swipeOutRef = ref(database, 'swipe_outs');
    const swipeOutQuery = query(
      swipeOutRef,
      orderByChild('employeeId'),
      equalTo(userId),
      limitToLast(1),
    );

    const unsubscribeSwipeOut = onValue(swipeOutQuery, snapshot => {
      if (snapshot.exists()) {
        const swipeOutData = snapshot.val();
        const key = Object.keys(swipeOutData)[0];
        const swipeOut = swipeOutData[key];

        if (swipeOut.status === 'pending') {
          setLastSwipeOut(new Date(swipeOut.timestamp));
          setIsSafe(false);
        }
      }
    });

    const safetyCheckRef = ref(database, 'safety_checks');
    const safetyCheckQuery = query(
      safetyCheckRef,
      orderByChild('employeeId'),
      equalTo(userId),
      limitToLast(1),
    );

    const unsubscribeSafetyCheck = onValue(safetyCheckQuery, snapshot => {
      if (snapshot.exists()) {
        const safetyData = snapshot.val();
        const key = Object.keys(safetyData)[0];
        const safetyCheck = safetyData[key];

        setPendingSafetyCheck(safetyCheck);

        if (safetyCheck.status === 'confirmed') {
          setIsSafe(true);
        } else if (safetyCheck.status === 'pending') {
          setIsSafe(false);
        }
      }
    });

    const loadPersistedData = async () => {
      const storedSwipeOut = await AsyncStorage.getItem('lastSwipeOut');
      if (storedSwipeOut) {
        const time = new Date(storedSwipeOut);
        setLastSwipeOut(time);

        const now = new Date();
        if (now.getTime() - time.getTime() < 135 * 60 * 1000) {
          setIsSafe(false);
        }
      }
    };

    loadPersistedData();

    return () => {
      off(swipeOutRef, 'value', unsubscribeSwipeOut);
      off(safetyCheckRef, 'value', unsubscribeSafetyCheck);
    };
  }, [userId]);

  useEffect(() => {
    const subscription = shakeListener(() => {
      if (!isSosActive) {
        handleSOS();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isSosActive]);

  const sendSOS = async (triggerAdmin, retryCount = 0) => {
    const maxRetries = 2;
    try {
      const toggles = await fetchUserToggles(userId);
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location for emergency services',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Location permission denied');
          return;
        }
      }

      Geolocation.getCurrentPosition(
        async position => {
          const {latitude, longitude} = position.coords;
          try {
            // Get FCM token for SOS notification
            let fcmToken = await AsyncStorage.getItem('fcmToken');
            console.log('FCM token for SOS alert:', fcmToken ? 'Available' : 'Not available');
            
            // If no FCM token, try to get a fresh one
            if (!fcmToken) {
              console.log('No FCM token found, attempting to get fresh token...');
              try {
                const { getFCMToken } = require('../notifications/NotificationService');
                fcmToken = await getFCMToken();
                if (fcmToken) {
                  await AsyncStorage.setItem('fcmToken', fcmToken);
                  console.log('Fresh FCM token obtained and stored');
                }
              } catch (error) {
                console.error('Failed to get fresh FCM token:', error);
              }
            }
            
            const sosPayload = {
              userId: userId,
              location: JSON.stringify({
                type: 'Point',
                coordinates: [longitude, latitude],
                address: 'Live Location',
              }),
              // timestamp: new Date().toISOString(),
              is_live: true,
              is_admin: toggles?.isControllerAllowed,
              fcmToken: fcmToken, // Include FCM token for notifications
            };
            
            console.log('SOS alert payload:', sosPayload);
            
            const response = await api.post('/sos-alerts', sosPayload);

            if (response.data.success) {
              console.log('SOS alert created successfully:', response.data);
              console.log('SOS ID:', response.data.alert.id);
              console.log('Employee Name:', response.data.alert.employeeName);
              console.log('User Name from state:', userName);
              
              Alert.alert(
                t('employee.sosActivated'),
                t('employee.helpOnTheWayLiveLocation'),
              );
              // startLocationTracking();
              const {id, employeeName: alertEmployeeName} = response.data.alert;
              
              // Use userName from state if employeeName is not available
              const finalEmployeeName = alertEmployeeName || userName || 'Unknown Employee';
              console.log('Final Employee Name to use:', finalEmployeeName);
              
              // Update Firebase sos_routes with initial location
              try {
                const locationsRef = ref(
                  database,
                  `sos_routes/${userId}/${id}/locations`,
                );
                push(locationsRef, {
                  latitude,
                  longitude,
                  timestamp: new Date().toISOString(),
                });
                console.log('Initial location sent to Firebase sos_routes');
              } catch (firebaseError) {
                console.error('Error updating Firebase sos_routes:', firebaseError);
              }
              
              let constraints = {};
              if (toggles.isAudioAllowed && toggles.isVideoAllowed) {
                constraints = {audio: true, video: true};
              } else if (toggles.isAudioAllowed) {
                constraints = {audio: true, video: false};
              } else if (toggles.isVideoAllowed) {
                constraints = {audio: false, video: true};
              } else {
                constraints = {};
                return;
              }

              // Start audio/video streaming with alertId and employeeId

              if (Object.keys(constraints).length > 0) {
                await startStreaming(
                  id.toString(),
                  userId.toString(),
                  constraints,
                );
              }
              await setPersistedSosId(id);
              startLocationTracking(id);

              // Backend automatically sends SOS notifications to contacts and admin
              console.log('SOS alert created successfully. Backend will handle sending notifications to contacts and admin.');
            } else {
              Alert.alert(
                t('common.error'),
                response.data.message || t('employee.failedToSendLocationData'),
              );
            }
          } catch (error) {
            console.log('send sos error', error);
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
              if (retryCount < maxRetries) {
                console.log(`SOS timeout, retrying... (${retryCount + 1}/${maxRetries})`);
                setTimeout(() => {
                  sendSOS(triggerAdmin, retryCount + 1);
                }, 2000); // Wait 2 seconds before retry
              } else {
                Alert.alert(
                  t('common.error'),
                  'SOS request timed out after multiple attempts. Please check your internet connection and try again.',
                );
              }
            } else {
              Alert.alert(
                t('employee.locationError'),
                t('employee.couldNotGetLocation'),
              );
              sendSOSWithoutLocation(triggerAdmin);
            }
          }
        },
        error => {
          console.log('error', error);
          Alert.alert(
            t('employee.locationError'),
            t('employee.couldNotGetLocation'),
          );
          sendSOSWithoutLocation(triggerAdmin);
        },
        {enableHighAccuracy: false, timeout: 15000},
      );
    } catch (error) {
      console.log('sendSOS general error:', error);
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        if (retryCount < maxRetries) {
          console.log(`SOS general timeout, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => {
            sendSOS(triggerAdmin, retryCount + 1);
          }, 2000); // Wait 2 seconds before retry
        } else {
          Alert.alert(
            t('common.error'),
            'SOS request timed out after multiple attempts. Please check your internet connection and try again.',
          );
        }
      } else {
        Alert.alert(t('common.error'), t('employee.failedToSendSOS'));
      }
    } finally {
      setIsSending(false);
    }
  };

  const sendSOSWithoutLocation = async triggerAdmin => {
    try {
      // Get FCM token for SOS notification
      let fcmToken = await AsyncStorage.getItem('fcmToken');
      console.log('FCM token for SOS alert (without location):', fcmToken ? 'Available' : 'Not available');
      
      // If no FCM token, try to get a fresh one
      if (!fcmToken) {
        console.log('No FCM token found (without location), attempting to get fresh token...');
        try {
          const { getFCMToken } = require('../notifications/NotificationService');
          fcmToken = await getFCMToken();
          if (fcmToken) {
            await AsyncStorage.setItem('fcmToken', fcmToken);
            console.log('Fresh FCM token obtained and stored (without location)');
          }
        } catch (error) {
          console.error('Failed to get fresh FCM token (without location):', error);
        }
      }
      
      const sosPayload = {
        userId: userId,
        // employeeName,
        location: 'Location unavailable',
        // timestamp: new Date().toISOString(),
        is_live: true,
        is_admin: triggerAdmin,
        fcmToken: fcmToken, // Include FCM token for notifications
      };
      
      console.log('SOS alert payload (without location):', sosPayload);
      
      const response = await api.post('/sos-alerts', sosPayload);

      if (response.data.success) {
        console.log('SOS alert created successfully (without location):', response.data);
        console.log('SOS ID:', response.data.alert.id);
        
        Alert.alert(
          t('employee.sosActivated'),
          t('employee.helpOnTheWayLiveLocation'),
        );
        // startLocationTracking();
        const {id} = response.data.alert;

        // Start audio/video streaming with alertId and employeeId
        await startStreaming(id.toString(), userId.toString());
        await setPersistedSosId(id);
        startLocationTracking(id);
        // Backend automatically sends SOS notifications to contacts and admin
        console.log('SOS alert created successfully (without location). Backend will handle sending notifications to contacts and admin.');
      }
    } catch (err) {
      console.log('sendSOSWithoutLocation error:', err);
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        Alert.alert(
          t('common.error'),
          'SOS request timed out. Please check your internet connection and try again.',
        );
      } else {
        Alert.alert(t('common.error'), t('employee.failedToSendSOS'));
      }
    }
  };

  let locationWatchId = null;

  // Helper to persist locationWatchId
  const setLocationWatchId = async id => {
    console.log('Setting location watch id', id);
    locationWatchId = id;
    await AsyncStorage.setItem(
      'locationWatchId',
      id !== null && id !== undefined ? id.toString() : '',
    );
  };
  const clearLocationWatchId = async () => {
    locationWatchId = null;
    await AsyncStorage.removeItem('locationWatchId');
  };
  const getLocationWatchId = async () => {
    const id = await AsyncStorage.getItem('locationWatchId');
    console.log('Getting location watch id', id);
    return id !== null && id !== undefined ? parseInt(id, 10) : null;
  };

  // Helper to persist sosId
  const setPersistedSosId = async id => {
    setSosId(id);
    await AsyncStorage.setItem('sosId', id ? id.toString() : '');
  };
  const clearPersistedSosId = async () => {
    setSosId(null);
    await AsyncStorage.removeItem('sosId');
  };
  const getPersistedSosId = async () => {
    const id = await AsyncStorage.getItem('sosId');
    return id ? id : null;
  };

  // Native background location tracking
  useEffect(() => {
    const handleLocationTracking = async () => {
      if (isSosActive && sosId && userId) {
        try {
          console.log('[INFO] Starting native background location tracking');
          await locationService.startLocationTracking(
            userId.toString(),
            sosId.toString(),
          );
        } catch (error) {
          console.error(
            '[ERROR] Failed to start native location tracking:',
            error,
          );
        }
      } else if (!isSosActive && locationService.isLocationTrackingActive()) {
        try {
          console.log('[INFO] Stopping native background location tracking');
          await locationService.stopLocationTracking();
        } catch (error) {
          console.error(
            '[ERROR] Failed to stop native location tracking:',
            error,
          );
        }
      }
    };

    handleLocationTracking();

    return () => {
      // Cleanup when component unmounts
      if (locationService.isLocationTrackingActive()) {
        locationService.stopLocationTracking().catch(error => {
          console.error('[ERROR] Error during cleanup:', error);
        });
      }
    };
  }, [isSosActive, sosId, userId]);

  // Start/stop location tracking with SOS
  const startLocationTracking = async overrideSosId => {
    console.log('Starting location tracking');
    if (isLiveLocationSharing) return;

    let currentSosId = overrideSosId || sosId;
    if (!currentSosId) {
      currentSosId = await getPersistedSosId();
      if (!currentSosId) {
        console.warn('No sosId found for route tracking');
        return;
      }
      setSosId(currentSosId);
    }

    setIsLiveLocationSharing(true);
    console.log('[INFO] Location tracking started for SOS ID:', currentSosId);

    // The native service will be started by the useEffect when isSosActive becomes true
  };

  const stopLocationTracking = async () => {
    console.log('Stopping location tracking');
    setIsLiveLocationSharing(false);
    stopStreaming();
    await clearPersistedSosId();

    // Stop the native service
    try {
      await locationService.stopLocationTracking();
      console.log('[INFO] Native location tracking stopped');
    } catch (error) {
      console.error('[ERROR] Failed to stop native location tracking:', error);
    }
  };

  const turnOffSosAlert = async sosId => {
    try {
      const response = await api.post('/sos-alerts/turn-off', {sosId});
      if (response.data.success) {
        console.log('SOS alert turned off successfully');
      } else {
        console.warn('Failed to turn off SOS alert:', response.data.message);
      }
    } catch (error) {
      console.error('Error turning off SOS alert:', error);
    }
  };

  // SOS button handler
  const handleSOS = async (triggerAdmin = false) => {
    try {
      await setISLoading(true);
      if (!isSosActive) {
        setIsLiveLocationSharing(true);
        setIsSending(true);
        setIsSosActive(true);
        
        // Show immediate feedback
        Alert.alert(
          'SOS Triggered',
          'Sending emergency alert... Please wait.',
          [{ text: 'OK' }],
          { cancelable: false }
        );
        
        await sendSOS(triggerAdmin);
      } else {
        // Stop live location sharing
        const sos_id = await getPersistedSosId();
        await stopLocationTracking();
        if (sos_id) {
          await turnOffSosAlert(sos_id);
        }
        setIsSosActive(false);
        setIsSending(false);
        
        // Reset Firebase update interval to 30 minutes
        await backgroundLocationService.setFirebaseUpdateInterval(
          30 * 60 * 1000,
        );
        Alert.alert(
          t('employee.sosDeactivated'),
          t('employee.liveLocationStopped'),
        );
      }
      await setISLoading(false);
    } catch (e) {
      console.log('Error in sos alert:', e);
      Alert.alert(
        t('common.error'),
        'Failed to process SOS request. Please try again.',
      );
    } finally {
      setISLoading(false);
    }
  };

  // On mount, check if live location sharing was active
  useEffect(() => {
    (async () => {
      const watchId = await getLocationWatchId();
      const persistedSosId = await getPersistedSosId();
      if (watchId !== null && persistedSosId) {
        setIsLiveLocationSharing(true);
        setIsSosActive(true);
        setSosId(persistedSosId);
      }
    })();
  }, []);

  // On mount, check if the background location service is running using the new native method, and set the toggle state accordingly. Use NativeModules.BackgroundLocationModule.isBackgroundLocationRunning().
  useEffect(() => {
    (async () => {
      if (
        NativeModules.BackgroundLocationModule &&
        NativeModules.BackgroundLocationModule.isBackgroundLocationRunning
      ) {
        try {
          const running =
            await NativeModules.BackgroundLocationModule.isBackgroundLocationRunning();
          setIsLiveTrackingEnabled(!!running);
        } catch (e) {
          setIsLiveTrackingEnabled(false);
        }
      }
    })();
  }, []);

  // AppState: send location if live sharing is on
  useEffect(() => {
    const handleAppStateChange = async nextAppState => {
      console.log('App state changed to:', nextAppState);
      if (nextAppState === 'active' && isLiveLocationSharing) {
        // When app becomes active, get current position and send it
        Geolocation.getCurrentPosition(
          position => {
            const {latitude, longitude} = position.coords;
            const liveLocationRef = ref(
              database,
              `live_locations/${userId}/locations`,
            );
            push(liveLocationRef, {
              latitude,
              longitude,
              timestamp: new Date().toISOString(),
            });
            // Also update the SOS route if we have an active SOS
            if (sosId) {
              const locationsRef = ref(
                database,
                `sos_routes/${userId}/${sosId}/locations`,
              );
              push(locationsRef, {
                latitude,
                longitude,
                timestamp: new Date().toISOString(),
              });
            }
          },
          error => {
            console.log('Location error on resume', error);
          },
          {enableHighAccuracy: false, timeout: 15000},
        );
      }

      // Update location display when app becomes active
      if (nextAppState === 'active') {
        updateCurrentLocation();
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isLiveLocationSharing, userId, sosId]);

  const handleSwipeOut = async () => {
    const now = new Date();
    if (now.getHours() < 19) {
      Alert.alert(
        t('employee.swipeOutNotAllowed'),
        t('employee.swipeOutAfter7pm'),
      );
      return;
    }

    try {
      const swipeOutTime = now;
      setLastSwipeOut(swipeOutTime);
      setIsSafe(false);

      const res = await api.post('/swipe-out', {
        employeeId: userId,
        employeeName: userName,
        location,
      });

      const confirmedTime = new Date(res.data.timestamp);
      setLastSwipeOut(confirmedTime);

      await AsyncStorage.setItem('lastSwipeOut', confirmedTime.toISOString());
      await AsyncStorage.setItem('employeeId', userId.toString());

      Alert.alert(
        t('employee.swipeOutRecorded'),
        t('employee.time', {time: confirmedTime.toLocaleTimeString()}),
      );
    } catch (error) {
      setLastSwipeOut(null);
      setIsSafe(true);
      console.error('Swipe out failed:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('employee.failedToRecordSwipeOut'),
      );
    }
  };

  const confirmSafety = async () => {
    try {
      await api.post('/confirm-safety', {
        employeeId: userId,
      });

      setIsSafe(true);
      await AsyncStorage.removeItem('lastSwipeOut');
      Alert.alert(
        t('employee.safetyConfirmed'),
        t('employee.thankYouForConfirmingSafety'),
      );
    } catch (error) {
      console.error('Safety confirmation failed:', error);
      Alert.alert(t('common.error'), t('employee.failedToConfirmSafety'));
    }
  };

  const toggleEmergencyOptions = () => {
    setShowEmergencyOptions(!showEmergencyOptions);
  };

  const handleLogout = () => {
    Alert.alert(
      t('common.confirmLogout'),
      t('common.logoutMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: backToLogin,
        },
      ],
      {cancelable: true},
    );
  };

  const handleToggleLiveTracking = async value => {
    setIsLiveTrackingEnabled(value);
    if (value) {
      await backgroundLocationService.start();
    } else {
      await backgroundLocationService.stop();
    }
  };

  const handleToggleFallDetection = async value => {
    setIsFallDetection(value);

    // Persist the fall detection state
    try {
      await AsyncStorage.setItem('fallDetectionEnabled', JSON.stringify(value));

      if (value) {
        // Start fall detection service
        fallDetectionService.setUserId(userId);
        await fallDetectionService.start();
        console.log('Fall detection started');
      } else {
        // Stop fall detection service
        await fallDetectionService.stop();
        console.log('Fall detection stopped');
      }
    } catch (error) {
      console.error('Error toggling fall detection:', error);
      Alert.alert('Error', 'Failed to update fall detection setting.');
    }
  };

  // Function to determine font size based on text length
  const getSosButtonFontSize = text => {
    if (text.length > 18) return 14;
    if (text.length > 12) return 16;
    if (text.length > 8) return 18;
    return 20;
  };

  const fetchUserDetails = async () => {
    await setLoadingUserDetails(true);
    try {
      const res = await api.get(`/users/${userId}`);
      const {data} = res;
      if (data) {
        console.log('Employee', data);
        // Map backend imageUrl to profileImage for consistency
        const userDataWithProfileImage = {
          ...data,
          profileImage: data.imageUrl || null,
        };
        setUserDetails(userDataWithProfileImage);
      } else {
        setUserDetails(null);
      }
    } catch (e) {
      setUserDetails(null);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Fetch user details and contacts on mount or when userId changes
  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchEmergencyContacts();

      // Load persisted fall detection state
      const loadFallDetectionState = async () => {
        try {
          const fallDetectionEnabled = await AsyncStorage.getItem(
            'fallDetectionEnabled',
          );
          if (fallDetectionEnabled !== null) {
            const isEnabled = JSON.parse(fallDetectionEnabled);
            setIsFallDetection(isEnabled);

            // Start or stop fall detection based on persisted state
            if (isEnabled) {
              fallDetectionService.setUserId(userId);
              await fallDetectionService.start();
              console.log('Fall detection restored and started');
            } else {
              await fallDetectionService.stop();
              console.log('Fall detection restored and stopped');
            }
          }
        } catch (error) {
          console.error('Error loading fall detection state:', error);
        }
      };

      loadFallDetectionState();
    }
  }, [userId]);

  // Cleanup effect for timeouts
  useEffect(() => {
    return () => {
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
      }
    };
  }, [uploadTimeout]);

  // Listen for location state changes from admin
  useEffect(() => {
    if (!userId) return;

    const locationStateRef = doc(firestore, `location_states/${userId}`);

    const unsubscribe = onSnapshot(locationStateRef, docSnapshot => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        if (data.locationEnded && isSosActive) {
          // Stop location tracking
          handleSOS(false); // This will stop the SOS and location tracking
          Alert.alert(
            'Location Tracking Ended',
            'Your location tracking has been stopped by the admin.',
            [{text: 'OK'}],
          );

          // Clear the state after handling
          setDoc(locationStateRef, {locationEnded: false}, {merge: true});
        }
      }
    });

    return unsubscribe;
  }, [userId, isSosActive]);

  // Fetch contacts from API
  const fetchEmergencyContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await api.get(`/user-contacts/by-user/${userId}`);
      const contacts = res.data || [];
      let primary = null,
        secondary = null,
        others = [];
      contacts.forEach(c => {
        if (c.relationship === 'primary') primary = c;
        else if (c.relationship === 'secondary') secondary = c;
        else others.push(c);
      });
      setEmergencyContacts({primary, secondary, others});
    } catch (e) {
      setEmergencyContacts({primary: null, secondary: null, others: []});
    } finally {
      setLoadingContacts(false);
    }
  };

  // Add contact
  // Phone number validation function
  const validatePhoneNumber = phone => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if it's a valid phone number (10-15 digits)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return false;
    }

    // Basic pattern validation for common phone number formats
    const phoneRegex = /^(\+?[\d\s\-\(\)]{10,15})$/;
    return phoneRegex.test(phone);
  };

  // Check if phone number already exists
  const isPhoneNumberDuplicate = phone => {
    const cleanPhone = phone.replace(/\D/g, '');

    // Check primary contact
    if (emergencyContacts.primary?.phone) {
      const primaryClean = emergencyContacts.primary.phone.replace(/\D/g, '');
      if (primaryClean === cleanPhone) return true;
    }

    // Check secondary contact
    if (emergencyContacts.secondary?.phone) {
      const secondaryClean = emergencyContacts.secondary.phone.replace(
        /\D/g,
        '',
      );
      if (secondaryClean === cleanPhone) return true;
    }

    // Check other contacts
    for (const contact of emergencyContacts.others) {
      if (contact.phone) {
        const contactClean = contact.phone.replace(/\D/g, '');
        if (contactClean === cleanPhone) return true;
      }
    }

    return false;
  };

  // Validate contact form
  const validateContactForm = () => {
    const errors = {
      name: '',
      phone: '',
      relationship: '',
    };

    // Validate name
    if (!newContact.name.trim()) {
      errors.name = 'Name is required';
    } else if (newContact.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    // Validate phone number
    if (!newContact.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhoneNumber(newContact.phone)) {
      errors.phone = 'Please enter a valid phone number';
    } else if (isPhoneNumberDuplicate(newContact.phone)) {
      errors.phone = 'This phone number is already added';
    }

    // Validate relationship
    if (!newContact.relationship.trim()) {
      errors.relationship = 'Relationship is required';
    } else if (newContact.relationship.trim().length < 2) {
      errors.relationship = 'Relationship must be at least 2 characters';
    }

    setContactValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleAddContact = async () => {
    if (!validateContactForm()) {
      return;
    }

    try {
      await api.post('/user-contacts', {
        user_id: userId,
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        relationship: newContact.relationship.trim(),
      });
      setAddContactModal(false);
      setNewContact({name: '', phone: '', relationship: ''});
      setContactValidationErrors({name: '', phone: '', relationship: ''});
      fetchEmergencyContacts();
    } catch (e) {
      console.error('Error adding contact:', e);
      // You can add more specific error handling here if needed
    }
  };

  // Edit contact
  const handleSaveContact = async () => {
    if (!editingContact) return;
    try {
      await api.put(`/user-contacts/${editingContact.id}`, {
        user_id: userId,
        name: editingContact.name,
        phone: editingContact.phone,
        relationship: editingContact.relationship,
        otp: editingContact.otp,
        otp_expires_at: editingContact.otp_expires_at,
        is_verified: editingContact.is_verified,
      });
      setEditingContact(null);
      fetchEmergencyContacts();
    } catch (e) {}
  };

  // Delete contact
  const handleDeleteContact = async id => {
    try {
      await api.delete(`/user-contacts/${id}`);
      fetchEmergencyContacts();
    } catch (e) {}
  };

  // Handlers for editing contacts
  const handleEditContact = (type, index = null) => {
    if (type === 'primary') {
      setEditingContact({...emergencyContacts.primary, type: 'primary'});
    } else if (type === 'secondary') {
      setEditingContact({...emergencyContacts.secondary, type: 'secondary'});
    } else {
      setEditingContact({
        ...emergencyContacts.others[index],
        type: 'other',
        index: index,
      });
    }
  };

  // Render page content based on navPage
  let pageContent = null;
  if (navPage === NAV_HOME) {
    pageContent = (
      <View style={styles.emergencyPageContainer}>
        <Text style={styles.emergencyTitle}>
          {t('employee.emergencyTitle', 'Are you in Emergency?')}
        </Text>
        <Text style={styles.emergencySubtitle}>
          {t(
            'employee.emergencySubtitle',
            'Press the button below and help will reach you soon.',
          )}
        </Text>
        <View style={styles.emergencyButtonPulseContainer}>
          <View style={styles.emergencyPulseOuter} />
          <View style={styles.emergencyPulseMid} />
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={() => handleSOS(true)}
            style={styles.emergencyButtonMain}>
            <Text style={styles.emergencyButtonText}>
              {isSosActive
                ? t('employee.sosTriggered', 'SOS Triggered')
                : t('employee.sendAlert', 'SEND ALERT')}
            </Text>
          </TouchableOpacity>
        </View>
        {isSosActive && (
          <View style={styles.sosStreamingInfoBox}>
            <Icon
              name="videocam"
              size={24}
              color="#fff"
              style={{marginRight: 8, marginLeft: 24}}
            />
            <Text style={styles.sosStreamingInfoText}>
              {t(
                'employee.audioVideoSharing',
                'Your audio/video is being shared with the control room',
              )}
            </Text>
          </View>
        )}

        <View style={styles.sosShakeInstructionBox}>
          <Text style={styles.sosShakeInstructionTitle}>
            {t('employee.notSure', 'Not able to press the button?')}
          </Text>
          <Text style={styles.sosShakeInstructionSub}>
            {t(
              'employee.sosShakeInstruction',
              'Shake your phone to trigger the Alert',
            )}
          </Text>
        </View>
      </View>
    );
  }
  if (showSafetyTipsPage) {
    pageContent = (
      <SafetyTipsScreen onBack={() => setShowSafetyTipsPage(false)} />
    );
  } else if (showUserDetailsPage) {
    pageContent = (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff'}}
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={false}>
        <View style={styles.profileHeaderWavy}>
          <Text style={styles.profileHeaderTitle}>
            {t('employee.userDetails', 'Profile')}
          </Text>
        </View>
        <View style={styles.profileImageContainer}>
          {loadingUserDetails ? (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <ActivityIndicator size="large" color="#6a1b9a" />
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleProfileImageClick}
              style={styles.profileImageTouchable}
              disabled={uploadingImage}>
              {userDetails?.profileImage ? (
                <Image
                  source={{uri: userDetails.profileImage}}
                  style={[
                    styles.profileImage,
                    uploadingImage && styles.profileImageLoading,
                  ]}
                />
              ) : (
                <View
                  style={[styles.profileImage, styles.profileImagePlaceholder]}>
                  <Icon name="person" size={48} color="#ccc" />
                </View>
              )}
              <View style={styles.profileImageOverlay}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="edit" size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.profileInfoBlock}>
          <View style={styles.profileInfoRow}>
            <Icon
              name="person"
              size={22}
              color="#222"
              style={styles.profileInfoIcon}
            />
            <View>
              <Text style={styles.profileInfoLabel}>
                {t('common.fullName', 'Name')}
              </Text>
              <Text style={styles.profileInfoValue}>
                {userDetails?.name ?? 'Nil'}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfoRow}>
            <Icon
              name="phone"
              size={22}
              color="#222"
              style={styles.profileInfoIcon}
            />
            <View>
              <Text style={styles.profileInfoLabel}>
                {t('common.phone', 'Phone no.')}
              </Text>
              <Text style={styles.profileInfoValue}>
                {userDetails?.phone ?? 'Nil'}
              </Text>
            </View>
          </View>
          {/* Emergency Contacts Section */}
          <View style={{marginTop: 24}}>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}>
              <Text style={[styles.profileInfoLabel, {fontSize: 18}]}>
                {t('employee.emergencyContacts', 'Emergency Contacts')}
              </Text>
              {/* Add Contact Button */}
              {emergencyContacts.others.length < 3 && (
                <TouchableOpacity
                  style={styles.addContactBtn}
                  onPress={() => setAddContactModal(true)}>
                  <Icon name="add" size={18} color="#fff" />
                  <Text style={styles.addContactBtnText}>Add Contact</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadingContacts ? (
              <Text>Loading...</Text>
            ) : (
              <>
                {/* Primary Contact */}
                {emergencyContacts.primary && (
                  <View style={styles.emergencyContactRow}>
                    <Text style={styles.emergencyContactKey}>
                      Primary Contact
                    </Text>
                    <Text style={styles.emergencyContactValue}>
                      {emergencyContacts.primary.phone}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleEditContact('primary')}
                      style={styles.emergencyContactEditBtn}>
                      <Icon name="edit" size={18} color="#6a1b9a" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Secondary Contact */}
                {emergencyContacts.secondary && (
                  <View style={styles.emergencyContactRow}>
                    <Text style={styles.emergencyContactKey}>
                      Secondary Contact
                    </Text>
                    <Text style={styles.emergencyContactValue}>
                      {emergencyContacts.secondary.phone}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleEditContact('secondary')}
                      style={styles.emergencyContactEditBtn}>
                      <Icon name="edit" size={18} color="#6a1b9a" />
                    </TouchableOpacity>
                  </View>
                )}
                {/* Other Contacts */}
                {emergencyContacts.others.map((contact, idx) => (
                  <View key={contact.id} style={styles.emergencyContactRow}>
                    <>
                      <Text style={[styles.emergencyContactKey, {flex: 1}]}>
                        {contact.name} ({contact.relationship})
                      </Text>
                      <Text style={[styles.emergencyContactValue, {flex: 1}]}>
                        {contact.phone}
                      </Text>
                    </>
                    <TouchableOpacity
                      onPress={() => handleEditContact('other', idx)}
                      style={styles.emergencyContactEditBtn}>
                      <Icon name="edit" size={18} color="#6a1b9a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteContact(contact.id)}
                      style={styles.emergencyContactDeleteBtn}>
                      <Icon name="delete" size={18} color="#d32f2f" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
        {/* Edit/Save Modal for contacts */}
        {editingContact && (
          <Modal
            visible={!!editingContact}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingContact(null)}>
            <TouchableOpacity
              style={styles.profileDropdownOverlay}
              activeOpacity={1}
              onPressOut={() => setEditingContact(null)}>
              <View
                style={[
                  styles.profileDropdownContent,
                  {minWidth: 300, marginTop: 120, marginLeft: 40},
                ]}>
                <Text
                  style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>
                  Edit Contact
                </Text>
                {editingContact.type === 'other' && (
                  <>
                    <TextInput
                      style={[styles.emergencyContactInput, {marginBottom: 8}]}
                      value={editingContact.name}
                      onChangeText={text =>
                        setEditingContact({...editingContact, name: text})
                      }
                      placeholder="Name"
                    />
                    <TextInput
                      style={[styles.emergencyContactInput, {marginBottom: 8}]}
                      value={editingContact.relationship}
                      onChangeText={text =>
                        setEditingContact({
                          ...editingContact,
                          relationship: text,
                        })
                      }
                      placeholder="Relationship"
                    />
                  </>
                )}
                <TextInput
                  style={styles.emergencyContactInput}
                  value={editingContact.phone}
                  onChangeText={text =>
                    setEditingContact({...editingContact, phone: text})
                  }
                  keyboardType="phone-pad"
                  placeholder="Number"
                  autoFocus
                />
                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: 16,
                    justifyContent: 'flex-end',
                  }}>
                  <TouchableOpacity
                    onPress={() => setEditingContact(null)}
                    style={{marginRight: 16}}>
                    <Text style={{color: '#888', fontWeight: 'bold'}}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveContact}>
                    <Text style={{color: '#6a1b9a', fontWeight: 'bold'}}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        {/* Add Contact Modal */}
        {addContactModal && (
          <Modal
            visible={addContactModal}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setAddContactModal(false);
              setContactValidationErrors({
                name: '',
                phone: '',
                relationship: '',
              });
            }}>
            <TouchableOpacity
              style={styles.profileDropdownOverlay}
              activeOpacity={1}
              onPressOut={() => {
                setAddContactModal(false);
                setContactValidationErrors({
                  name: '',
                  phone: '',
                  relationship: '',
                });
              }}>
              <View
                style={[
                  styles.profileDropdownContent,
                  {minWidth: 300, marginTop: 120, marginLeft: 40},
                ]}>
                <Text
                  style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>
                  Add Emergency Contact
                </Text>
                <TextInput
                  style={[
                    styles.emergencyContactInput,
                    {
                      marginBottom: contactValidationErrors.name ? 4 : 8,
                      borderColor: contactValidationErrors.name
                        ? '#d32f2f'
                        : '#ccc',
                    },
                  ]}
                  value={newContact.name}
                  onChangeText={text => {
                    setNewContact({...newContact, name: text});
                    if (contactValidationErrors.name) {
                      setContactValidationErrors(prev => ({...prev, name: ''}));
                    }
                  }}
                  placeholder="Name"
                  placeholderTextColor="#888"
                  autoFocus
                />
                {contactValidationErrors.name && (
                  <Text style={styles.validationErrorText}>
                    {contactValidationErrors.name}
                  </Text>
                )}
                <TextInput
                  style={[
                    styles.emergencyContactInput,
                    {
                      marginBottom: contactValidationErrors.relationship
                        ? 4
                        : 8,
                      borderColor: contactValidationErrors.relationship
                        ? '#d32f2f'
                        : '#ccc',
                    },
                  ]}
                  value={newContact.relationship}
                  onChangeText={text => {
                    setNewContact({...newContact, relationship: text});
                    if (contactValidationErrors.relationship) {
                      setContactValidationErrors(prev => ({
                        ...prev,
                        relationship: '',
                      }));
                    }
                  }}
                  placeholder="Relationship"
                  placeholderTextColor="#888"
                />
                {contactValidationErrors.relationship && (
                  <Text style={styles.validationErrorText}>
                    {contactValidationErrors.relationship}
                  </Text>
                )}
                <TextInput
                  style={[
                    styles.emergencyContactInput,
                    {
                      marginBottom: contactValidationErrors.phone ? 4 : 8,
                      borderColor: contactValidationErrors.phone
                        ? '#d32f2f'
                        : '#ccc',
                    },
                  ]}
                  value={newContact.phone}
                  onChangeText={text => {
                    setNewContact({...newContact, phone: text});
                    if (contactValidationErrors.phone) {
                      setContactValidationErrors(prev => ({
                        ...prev,
                        phone: '',
                      }));
                    }
                  }}
                  keyboardType="phone-pad"
                  placeholder="Number"
                  placeholderTextColor="#888"
                />
                {contactValidationErrors.phone && (
                  <Text style={styles.validationErrorText}>
                    {contactValidationErrors.phone}
                  </Text>
                )}
                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: 16,
                    justifyContent: 'flex-end',
                  }}>
                  <TouchableOpacity
                    onPress={() => {
                      setAddContactModal(false);
                      setContactValidationErrors({
                        name: '',
                        phone: '',
                        relationship: '',
                      });
                    }}
                    style={{marginRight: 16}}>
                    <Text style={{color: '#888', fontWeight: 'bold'}}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddContact}>
                    <Text style={{color: '#6a1b9a', fontWeight: 'bold'}}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        <TouchableOpacity
          style={{
            margin: 24,
            padding: 12,
            backgroundColor: '#eee',
            borderRadius: 8,
            alignItems: 'center',
          }}
          onPress={() => setShowUserDetailsPage(false)}>
          <Text style={{color: '#6a1b9a', fontWeight: 'bold', fontSize: 16}}>
            {t('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
        

      </ScrollView>
    );
  } else if (navPage === NAV_CHAT) {
    pageContent = (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <UserListScreen
          onBack={() => setNavPage(NAV_HOME)}
          userId={userId}
          hideBottomNav={() => setShowBottomNav(false)}
          showBottomNav={() => setShowBottomNav(true)}
        />
      </SafeAreaView>
    );
  } else if (navPage === NAV_ALERTS) {
    pageContent = (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
          }}>
          <Text style={styles.alert2ButtonText}>{t('admin.alerts')}</Text>
          {isSoundPlaying && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#d32f2f',
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 20,
              }}
              onPress={() => {
                stopEmergencySound();
                setIsSoundPlaying(false);
              }}>
              <Icon
                name="volume-off"
                size={20}
                color="#fff"
                style={{marginRight: 6}}
              />
              <Text style={{color: '#fff', fontWeight: 'bold'}}>
                Stop Sound
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ListUserAlerts
          userId={userId}
          userName={userName || ''}
          soundShow={() => setIsSoundPlaying(true)}
        />
      </SafeAreaView>
    );
  } else if (navPage === NAV_MAP) {
    pageContent = <MapScreen userId={userId} userName={userName} />;
  } else if (navPage === NAV_ROUTES) {
    pageContent = <MyRoutesScreen userId={userId} />;
  } else {
    // Default: Home
    pageContent = (
      <ScrollView style={styles.contentContainer}>
        <View style={styles.emergencyPageContainer}>
          <Text style={styles.emergencyTitle}>
            {t('employee.emergencyTitle', 'Are you in Emergency?')}
          </Text>
          <Text style={styles.emergencySubtitle}>
            {t(
              'employee.emergencySubtitle',
              'Press the button below and help will reach you soon.',
            )}
          </Text>
          <View style={styles.emergencyButtonPulseContainer}>
            <View style={styles.emergencyPulseOuter} />
            <View style={styles.emergencyPulseMid} />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSOS(true)}
              style={styles.emergencyButtonMain}>
              <Text style={styles.emergencyButtonText}>
                {isSosActive
                  ? t('employee.sosTriggered', 'SOS Triggered')
                  : t('employee.sendAlert', 'SEND ALERT')}
              </Text>
            </TouchableOpacity>
          </View>
          
          
          {/* {isSosActive && (
            <View style={styles.sosStreamingInfoBox}>
              <Icon name="videocam" size={24} color="#fff" style={{ marginRight: 8, marginLeft: 24 }} />
              <Text style={styles.sosStreamingInfoText}>{t('employee.audioVideoSharing', 'Your audio/video is being shared with the control room')}</Text>
            </View>
          )} */}
          <View style={styles.sosShakeInstructionBox}>
            <Text style={styles.sosShakeInstructionTitle}>
              {t('employee.notSure', 'Not able to press the button?')}
            </Text>
            <Text style={styles.sosShakeInstructionSub}>
              {t(
                'employee.sosShakeInstruction',
                'Shake your phone to trigger the Alert',
              )}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Handler to change nav and close user details page if open
  const handleNavChange = page => {
    setShowUserDetailsPage(false);
    setShowSafetyTipsPage(false);
    setNavPage(page);
    // Show bottom nav when navigating away from chat
    if (page !== NAV_CHAT) {
      setShowBottomNav(true);
    }
  };

  // Animate slider in/out
  useEffect(() => {
    if (showProfileSlider) {
      Animated.timing(profileSliderAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(profileSliderAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [showProfileSlider]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const checkInitialIntent = async () => {
        try {
          const intent =
            await NativeModules?.IntentLauncher?.getInitialIntent?.();
          // console.log('intent', intent);
          // console.log('intent', intent?.navigateTo);
          if (
            intent &&
            typeof intent === 'object' &&
            intent.navigateTo === 'AreYouSafeScreen'
          ) {
            setShowAreYouSafeScreen(true);
            // Clear the intent after use
            // if (NativeModules?.IntentLauncher?.clearInitialIntent) {
            //   try {
            //     await NativeModules.IntentLauncher.clearInitialIntent();
            //   } catch (e) {
            //     console.log('Failed to clear intent', e);
            //   }
            // }
          }
        } catch (e) {
          console.log('Intent fail', e);
          // Fallback: do nothing
        }
      };

      // Check intent on initial load
      checkInitialIntent();

      // Set up periodic checking for intents when app is active
      let intentCheckInterval;

      const startIntentChecking = () => {
        console.log('Starting periodic intent checking');
        intentCheckInterval = setInterval(checkInitialIntent, 8000); // Check every 6 seconds
      };

      const stopIntentChecking = () => {
        console.log('Stopping periodic intent checking');
        if (intentCheckInterval) {
          clearInterval(intentCheckInterval);
          intentCheckInterval = null;
        }
      };

      // Listen for app state changes
      const handleAppStateChange = nextAppState => {
        console.log('App state changed to:', nextAppState);
        if (nextAppState === 'active') {
          // App came to foreground, start checking for intents
          startIntentChecking();
          // Also check immediately
          checkInitialIntent();
        } else if (
          nextAppState === 'background' ||
          nextAppState === 'inactive'
        ) {
          // App went to background, stop checking
          stopIntentChecking();
        }
      };

      const subscription = AppState.addEventListener(
        'change',
        handleAppStateChange,
      );

      // Start checking if app is already active
      if (AppState.currentState === 'active') {
        startIntentChecking();
      }

      // Cleanup subscription and interval on unmount
      return () => {
        subscription?.remove();
        stopIntentChecking();
      };
    }
  }, []);

  // Add a useEffect to request permissions after login/mount
  useEffect(() => {
    async function requestAllPermissions() {
      if (Platform.OS === 'android') {
        try {
          // Location
          const locationGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (!locationGranted) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              {
                title: 'Location Permission',
                message:
                  'This app needs access to your location for emergency services.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
          }
          // Audio
          const audioGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );
          if (!audioGranted) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              {
                title: 'Audio Permission',
                message:
                  'This app needs access to your microphone for emergency audio streaming.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
          }
          // Video
          const cameraGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CAMERA,
          );
          if (!cameraGranted) {
            await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA,
              {
                title: 'Camera Permission',
                message:
                  'This app needs access to your camera for emergency video streaming.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'OK',
              },
            );
          }
        } catch (err) {
          console.warn('Permission request error:', err);
        }
      }
      // For iOS, recommend using react-native-permissions for similar logic
    }
    requestAllPermissions();
  }, []);

  // Periodic location updates (every 5 minutes)
  useEffect(() => {
    const locationInterval = setInterval(() => {
      updateCurrentLocation();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(locationInterval);
    };
  }, []);

  // Add state for feature toggles
  const [isAudioAllowed, setIsAudioAllowed] = useState(true);
  const [isVideoAllowed, setIsVideoAllowed] = useState(true);
  const [isControllerAllowed, setIsControllerAllowed] = useState(true);

  // Fetch user details and set toggles
  useEffect(() => {
    if (userDetails) {
      setIsAudioAllowed(userDetails.isAudioAllowed ?? true);
      setIsVideoAllowed(userDetails.isVideoAllowed ?? true);
      setIsControllerAllowed(userDetails.isControllerAllowed ?? true);
    }
  }, [userDetails]);

  // Handler to update backend
  const updateUserFeature = async (field, value) => {
    try {
      await api.patch(`/users/${userId}/toggles`, {[field]: value});
    } catch (e) {
      Alert.alert('Error', 'Failed to update setting.');
    }
  };

  if (showAreYouSafeScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <AreYouSafeScreen
          callBack={async snoozeMs => {
            if (snoozeMs) {
              const snoozeUntil = Date.now() + snoozeMs;
              await backgroundLocationService.setSnoozeUntil(snoozeUntil);
            }
            setShowAreYouSafeScreen(false);
            setIsFallDetected(false);
          }}
          onTriggerSOS={() => {
            handleSOS();
            setShowAreYouSafeScreen(false);
          }}
          isFallDetection={isFallDetected}
        />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6a1b9a" />
      <LinearGradient
        colors={['#6a1b9a', '#9c27b0']}
        style={styles.headerContainer}>
        <View style={styles.headerRow}>
          {/* Avatar/Profile Icon (left) */}
          <TouchableOpacity
            onPress={() => {
              setShowSafetyTipsPage(false);
              setShowProfileSlider(true);
            }}
            style={styles.headerAvatarButton}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName && userName.length > 0 ? (
                  userName[0].toUpperCase()
                ) : (
                  <Icon name="person" size={20} color="#fff" />
                )}
              </Text>
            </View>
          </TouchableOpacity>
          {/* Centered Greeting and Location */}
          <View style={styles.headerCenterContent}>
            <Text style={styles.helloText}>
              {t('common.welcome') + ' ' + userName}
            </Text>
            <View style={styles.headerLocationRow}>
              <Icon name="location-on" size={20} color="#fff" />
              <Text style={styles.headerLocationText}>{location + ', IN'}</Text>
            </View>
          </View>
          {/* Language Selector Icon (right) */}
          <TouchableOpacity
            onPress={() => setLanguageModalVisible(true)}
            style={styles.headerIconButton}>
            <Icon name="translate" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      {showProfileSlider && (
        <View
          style={styles.profileSliderAbsoluteOverlay}
          pointerEvents="box-none">
          <TouchableOpacity
            style={styles.profileSliderOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setShowProfileSlider(false);
              // Don't reset showSafetyTipsPage here as it should remain open if it was open
            }}>
            {/* Overlay for dimming and closing on outside click */}
          </TouchableOpacity>
          <Animated.View
            style={[styles.profileSliderContent, {left: profileSliderAnim}]}>
            {/* Close button at the top right of the slider */}
            <TouchableOpacity
              style={styles.profileSliderCloseButton}
              onPress={() => {
                setShowProfileSlider(false);
                // Don't reset showSafetyTipsPage here as it should remain open if it was open
              }}>
              <Icon name="close" size={28} color="#888" />
            </TouchableOpacity>
            <View style={styles.profileSliderHeader}>
              <View style={styles.avatarCircleLarge}>
                <Text style={styles.avatarTextLarge}>
                  {userName && userName.length > 0 ? (
                    userName[0].toUpperCase()
                  ) : (
                    <Icon name="person" size={32} color="#fff" />
                  )}
                </Text>
              </View>
              <View style={{marginLeft: 12}}>
                <Text style={styles.profileDropdownName}>
                  {userDetails?.name ?? userName ?? 'User'}
                </Text>
                <Text style={styles.profileDropdownPhone}>
                  {userDetails?.phone ?? ''}
                </Text>
              </View>
            </View>
            <View style={styles.profileDropdownDivider} />
            <TouchableOpacity
              style={styles.profileDropdownItem}
              onPress={() => {
                setShowProfileSlider(false);
                setShowUserDetailsPage(true);
              }}>
              <Icon
                name="person"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.userDetails', 'Profile')}
              </Text>
            </TouchableOpacity>
            {/* Safety Tips Section */}
            <TouchableOpacity
              style={styles.profileDropdownItem}
              onPress={() => {
                setShowProfileSlider(false);
                setShowSafetyTipsPage(true);
              }}>
              <Icon
                name="security"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.safetyTips', 'Safety Tips')}
              </Text>
            </TouchableOpacity>
            {/* Live Tracking Section (unchanged) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}>
              <Icon
                name="my-location"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.safetyCheckIn', 'Safety check-in')}
              </Text>
              <Switch
                style={{marginLeft: 'auto'}}
                value={isLiveTrackingEnabled}
                onValueChange={handleToggleLiveTracking}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}>
              <Icon
                name="warning"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.fallDetection', 'Fall Detection')}
              </Text>
              <Switch
                style={{marginLeft: 'auto'}}
                value={isFallDetection}
                onValueChange={handleToggleFallDetection}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}>
              <Icon
                name="group"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.allowControlRoom', 'Allow Control Room')}
              </Text>
              <Switch
                style={{marginLeft: 'auto'}}
                value={isControllerAllowed}
                onValueChange={val => {
                  setIsControllerAllowed(val);
                  updateUserFeature('isControllerAllowed', val);
                }}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}>
              <Icon
                name="mic"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.allowAudio', 'Allow Audio')}
              </Text>
              <Switch
                style={{marginLeft: 'auto'}}
                value={isAudioAllowed}
                onValueChange={val => {
                  setIsAudioAllowed(val);
                  updateUserFeature('isAudioAllowed', val);
                }}
              />
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
              }}>
              <Icon
                name="videocam"
                size={20}
                color="#6a1b9a"
                style={{marginRight: 8}}
              />
              <Text style={styles.profileDropdownItemText}>
                {t('employee.allowvideo', 'Allow Video')}
              </Text>
              <Switch
                style={{marginLeft: 'auto'}}
                value={isVideoAllowed}
                onValueChange={val => {
                  setIsVideoAllowed(val);
                  updateUserFeature('isVideoAllowed', val);
                }}
              />
            </View>
            <TouchableOpacity
              style={styles.profileDropdownItem}
              onPress={() => {
                setShowProfileSlider(false);
                handleLogout();
              }}>
              <Icon
                name="logout"
                size={20}
                color="#d32f2f"
                style={{marginRight: 8}}
              />
              <Text
                style={[styles.profileDropdownItemText, {color: '#d32f2f'}]}>
                {t('common.logout', 'Logout')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onLanguageChange={() => {}}
      />
      {isLoading && <Loader />}
      {pageContent}
      {showBottomNav && (
        <BottomNavBar current={navPage} onChange={handleNavChange} />
      )}
      <Modal
        visible={showSafetyConfirmation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSafetyConfirmation(false)}>
        <View style={styles.safetyConfirmationModal}>
          <View style={styles.safetyConfirmationContent}>
            <Icon name="home" size={40} color="#4CAF50" />
            <Text style={styles.safetyConfirmationTitle}>
              {t('employee.confirmSafeArrival')}
            </Text>
            <Text style={styles.safetyConfirmationText}>
              {t('employee.pleaseConfirmSafeArrival')}
            </Text>
            <View style={styles.safetyConfirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmButton]}
                onPress={handleSafeArrivalConfirmation}>
                <Text style={styles.confirmationButtonText}>
                  {t('employee.imHomeSafely')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelButton]}
                onPress={() => setShowSafetyConfirmation(false)}>
                <Text style={styles.confirmationButtonText}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Restore the edit modal for contacts: */}
      {editingContact && (
        <Modal
          visible={!!editingContact}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingContact(null)}>
          <TouchableOpacity
            style={styles.profileDropdownOverlay}
            activeOpacity={1}
            onPressOut={() => setEditingContact(null)}>
            <View
              style={[
                styles.profileDropdownContent,
                {minWidth: 300, marginTop: 120, marginLeft: 40},
              ]}>
              <Text
                style={{fontWeight: 'bold', fontSize: 18, marginBottom: 12}}>
                {t('employee.editContact', 'Edit Contact')}
              </Text>
              {editingContact.type === 'other' && (
                <>
                  <TextInput
                    style={[styles.emergencyContactInput, {marginBottom: 8}]}
                    value={editingContact.name}
                    onChangeText={text =>
                      setEditingContact({...editingContact, name: text})
                    }
                    placeholder={t('common.name', 'Name')}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.emergencyContactInput, {marginBottom: 8}]}
                    value={editingContact.relationship}
                    onChangeText={text =>
                      setEditingContact({...editingContact, relationship: text})
                    }
                    placeholder={t('common.relationship', 'Relationship')}
                  />
                </>
              )}
              <TextInput
                style={styles.emergencyContactInput}
                value={editingContact.phone}
                onChangeText={text =>
                  setEditingContact({
                    ...editingContact,
                    phone: text,
                  })
                }
                keyboardType="phone-pad"
                placeholder={t('common.phone', 'Number')}
                autoFocus
              />
              <View
                style={{
                  flexDirection: 'row',
                  marginTop: 16,
                  justifyContent: 'flex-end',
                }}>
                <TouchableOpacity
                  onPress={() => setEditingContact(null)}
                  style={{marginRight: 16}}>
                  <Text style={{color: '#888', fontWeight: 'bold'}}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveContact}>
                  <Text style={{color: '#6a1b9a', fontWeight: 'bold'}}>
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Profile Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>
                {t('employee.profileImage', 'Profile Image')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                style={styles.imageModalCloseButton}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.imageModalImageContainer}>
              <Image
                source={{uri: userDetails?.profileImage}}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.imageModalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  handleProfileImageChange();
                }}
                style={styles.imageModalEditButton}>
                <Icon
                  name="edit"
                  size={20}
                  color="#fff"
                  style={{marginRight: 8}}
                />
                <Text style={styles.imageModalEditButtonText}>
                  {t('employee.changeProfileImage', 'Change Image')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 24,
    paddingHorizontal: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLocationText: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 6,
    fontWeight: '400',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    flexGrow: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  employeeName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    flexWrap: 'wrap',
    textAlign: 'center',
    width: '100%',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 5,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  statusCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSafe: {
    backgroundColor: '#3bb143',
  },
  statusDanger: {
    backgroundColor: '#f44336',
  },
  statusIndicatorText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#fff',
  },
  statusDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDetailText: {
    marginLeft: 8,
    color: '#555',
    fontSize: 14,
  },
  actionButtonsContainer: {
    marginBottom: 20,
  },
  sosButtonContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  sosButton: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    overflow: 'hidden',
  },
  sosButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosButtonActive: {
    opacity: 0.8,
  },
  sosText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  swipeButton: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 60,
  },
  swipeButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  safetyReminder: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#ffa000',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d4037',
    marginLeft: 8,
  },
  safetyReminderText: {
    color: '#5d4037',
    marginBottom: 15,
    lineHeight: 20,
  },
  safetyButton: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 50,
  },
  safetyButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  moreOptionsButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    marginBottom: 15,
  },
  moreOptionsText: {
    color: '#6a1b9a',
    fontWeight: 'bold',
    marginRight: 5,
  },
  emergencyOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emergencyOptionText: {
    marginLeft: 12,
    color: '#d32f2f',
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: width * 0.43,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    color: '#6a1b9a',
    fontWeight: '500',
  },
  safetyConfirmationModal: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  safetyConfirmationContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  safetyConfirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#333',
  },
  safetyConfirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  safetyConfirmationButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  confirmationButton: {
    padding: 15,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmationButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sosButtonSmall: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.5,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sosButtonGradientSmall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTextSmall: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  alertButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  alertButton: {
    flex: 1,
    backgroundColor: '#A259C6',
    borderRadius: 8,
    marginHorizontal: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alert2ButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 28,
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  alertButtonDisabled: {
    opacity: 0.5,
  },
  sosInstructionContainer: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#ffa000',
  },
  sosInstructionText: {
    color: '#5d4037',
    fontSize: 16,
    lineHeight: 22,
  },
  sosButtonMainContainer: {
    alignItems: 'center',
    marginVertical: 18,
  },
  sosButtonGlossyOuter: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
    shadowColor: '#b71c1c',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  sosButtonGlossyInner: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sosButtonSOS: {
    color: '#d32f2f',
    fontSize: 64,
    fontWeight: 'bold',
    textShadowColor: '#fff',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  sosButtonSOSTriggered: {
    color: '#388e3c', // green for triggered, or pick another highlight color
  },
  sosBottomTextContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
  },
  sosBottomText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sosBottomSubText: {
    color: '#b71c1c',
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  sosShakeInstructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2f7',
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 0,
    borderLeftWidth: 5,
    borderLeftColor: '#4fc3f7',
  },
  sosShakeInstructionText: {
    color: '#00796b',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 'bold',
  },
  bottomNavBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 76,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 100,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomNavLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  bottomNavLabelActive: {
    color: '#6a1b9a',
    fontWeight: 'bold',
  },
  sosPageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 80, // ensure content is above navbar
    position: 'relative',
  },
  sosButtonBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  sosTopText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 28,
    marginBottom: 18,
  },
  sosButtonMainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: width * 0.3,
    overflow: 'hidden',
    elevation: 10,
  },
  sosButtonSolidOuter: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
    backgroundColor: '#d32f2f',
    shadowColor: '#b71c1c',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  sosButtonGlossyOuter: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: '#fff',
    shadowColor: '#b71c1c',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  sosButtonGlossyInner: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sosButtonSOS: {
    color: '#d32f2f',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: '#fff',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  sosShakeInstructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2f7',
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 0,
    borderLeftWidth: 5,
    borderLeftColor: '#4fc3f7',
  },
  sosShakeInstructionText: {
    color: '#00796b',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 'bold',
  },
  sosButtonLogoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 12,
    position: 'relative',
  },
  sosButtonAlertText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1.5,
    textShadowColor: '#b71c1c',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
    textTransform: 'uppercase',
  },
  sosButtonAlertTextCurved: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 0,
    marginTop: 8,
    textShadowColor: '#b71c1c',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
    textTransform: 'uppercase',
    width: width * 0.5,
    alignSelf: 'center',
    // Simulate U-shape with transform
    transform: [{rotate: '-8deg'}, {translateY: 6}],
  },
  sosButtonAlertTextStraight: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 8,
    textShadowColor: '#b71c1c',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
    textTransform: 'uppercase',
    width: width * 0.5,
    alignSelf: 'center',
  },
  sosButtonLogo: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: width * 0.14,
    backgroundColor: 'transparent',
    marginTop: 8,
    alignSelf: 'center',
  },
  profileHeaderWavy: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 16,
  },
  profileEditIcon: {
    position: 'absolute',
    top: 18,
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 4,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  profileImageTouchable: {
    position: 'relative',
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#eee',
  },
  profileImageLoading: {
    opacity: 0.7,
  },
  profileImagePlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6a1b9a',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileInfoBlock: {
    marginTop: 12,
    paddingHorizontal: 32,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfoIcon: {
    marginRight: 18,
    width: 32,
    textAlign: 'center',
  },
  profileInfoLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  profileInfoValue: {
    fontSize: 16,
    color: '#222',
    marginTop: 2,
  },
  emergencyPageContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 90,
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#133366',
    marginTop: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  emergencySubtitle: {
    fontSize: 16,
    color: '#3a3a3a',
    marginBottom: 60,
    textAlign: 'center',
  },
  emergencyButtonPulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    marginTop: 16,
  },
  emergencyPulseOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(211,47,47,0.10)',
    alignSelf: 'center',
    zIndex: 1,
  },
  emergencyPulseMid: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(211,47,47,0.18)',
    alignSelf: 'center',
    zIndex: 2,
  },
  emergencyButtonMain: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 6,
    shadowColor: '#d32f2f',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  sosShakeInstructionBox: {
    backgroundColor: '#f5f7fa',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 24,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sosShakeInstructionTitle: {
    color: '#222b45',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 2,
  },
  sosShakeInstructionSub: {
    color: '#8f9bb3',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
  },
  sosStreamingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff0000',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'center',
    width: '90%',
    borderLeftWidth: 5,
    borderLeftColor: '#ff5252',
    shadowColor: '#ff5252',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sosStreamingInfoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'left',
    flex: 1,
  },
  headerAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#8e24aa',
  },
  avatarText: {
    color: '#8e24aa',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarCircleLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8e24aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userProfileDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 14,
  },
  profileDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: 120,
  },
  profileDropdownContent: {
    marginTop: 90,
    marginLeft: 130,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 240,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  profileDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileDropdownName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  profileDropdownEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileDropdownPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  profileDropdownDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  profileDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileDropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emergencyContactKey: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#222',
    marginRight: 8,
  },
  emergencyContactValue: {
    fontSize: 15,
    color: '#333',
    marginRight: 8,
  },
  emergencyContactInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 6,
    minWidth: 90,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#fafafa',
    marginRight: 8,
  },
  emergencyContactEditBtn: {
    marginLeft: 4,
    padding: 4,
  },
  emergencyContactDeleteBtn: {
    marginLeft: 4,
    padding: 4,
  },
  validationErrorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6a1b9a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addContactBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  profileSliderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    flexDirection: 'row',
    justifyContent: 'flex-start', // ensure slider is on the left
  },
  profileSliderContent: {
    width: 300,
    backgroundColor: '#fff',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,

    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
  },
  profileSliderCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 8,
    // paddingTop: 60,
  },
  profileSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    // paddingTop: 56,
  },
  profileSliderAbsoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    flexDirection: 'row',
    zIndex: 1000,
  },
  profileSliderOverlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  profileSliderContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 1001,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imageModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  imageModalCloseButton: {
    padding: 4,
  },
  imageModalImageContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  imageModalImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  imageModalActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  imageModalEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6a1b9a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  imageModalEditButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
