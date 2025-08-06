import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Image,
  TouchableWithoutFeedback,
  SafeAreaView,
  Keyboard,
  Dimensions,
} from 'react-native';

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  collection,
  orderBy,
} from 'firebase/firestore';

const { height } = Dimensions.get('window');
import { firestore } from './config/firestore';
import theme from '../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialIcons'; // If using vector icons
import { PermissionsAndroid } from 'react-native';
import { Linking } from 'react-native';
import ParsedText from 'react-native-parsed-text';
import MapView, { Marker } from 'react-native-maps';

async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location to send it in chat.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // For iOS, you may need to use a library or check Info.plist
  return true;
}

const ChatScreen = ({ employee, onBack, onReadMessages }) => {
  const employeeId = employee?.id;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [endedLocations, setEndedLocations] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Debug logging
  console.log('ChatScreen - employee:', employee);
  console.log('ChatScreen - employeeId:', employeeId);

  // Keyboard listeners for custom handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Validate employee ID
  if (!employeeId) {
    console.error('ChatScreen: No employee ID provided');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: No employee ID provided</Text>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 20, padding: 10, backgroundColor: '#4f8cff' }}>
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const EMPLOYEE_ID = employeeId;
  const CHAT_ID = `employee_${EMPLOYEE_ID}_admins`;
  const MESSAGES_COLLECTION = `chats/${CHAT_ID}/messages`;
  const TYPING_DOC = `chats/${CHAT_ID}`;
  const typingDocRef = doc(firestore, TYPING_DOC);
  const messagesQuery = query(
    collection(firestore, MESSAGES_COLLECTION),
    orderBy('timestamp', 'asc'),
  );
  const chatDocRef = doc(firestore, TYPING_DOC);

  // Listen for messages
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
        setLoading(false);
      },
      error => {
        console.error('Firestore onSnapshot error:', error);
        setMessages([]);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [MESSAGES_COLLECTION]);

  // Load persisted ended locations on mount
  useEffect(() => {
    const loadEndedLocations = async () => {
      try {
        console.log('Loading ended locations for employee:', employeeId);

        // First, try to get the current state from Firestore
        const locationStateRef = doc(firestore, `location_states/${employeeId}`);
        const locationStateDoc = await getDoc(locationStateRef);

        if (locationStateDoc.exists()) {
          const data = locationStateDoc.data();
          if (data.endedMessageIds && data.endedMessageIds.length > 0) {
            console.log('Found ended message IDs in Firestore:', data.endedMessageIds);
            setEndedLocations(new Set(data.endedMessageIds));

            // Update AsyncStorage with the Firestore data
            await AsyncStorage.setItem(
              `endedLocations_${employeeId}`,
              JSON.stringify(data.endedMessageIds)
            );
            return;
          }
        }

        // Fallback to AsyncStorage if no Firestore data
        const stored = await AsyncStorage.getItem(
          `endedLocations_${employeeId}`,
        );
        if (stored) {
          const endedIds = JSON.parse(stored);
          console.log('Found ended message IDs in AsyncStorage:', endedIds);
          setEndedLocations(new Set(endedIds));
        } else {
          console.log('No ended locations found');
        }
      } catch (error) {
        console.error('Error loading ended locations:', error);
      }
    };

    if (employeeId) {
      loadEndedLocations();
    }
  }, [employeeId]);

  // Listen for location state changes from admin
  useEffect(() => {
    if (!employeeId) return;

    const locationStateRef = doc(firestore, `location_states/${employeeId}`);

    const unsubscribe = onSnapshot(locationStateRef, docSnapshot => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        if (data.locationEnded && data.endedMessageIds) {
          // Add all ended message IDs to our set and persist it
          setEndedLocations(prev => {
            const newSet = new Set([...prev, ...data.endedMessageIds]);
            // Persist to AsyncStorage
            AsyncStorage.setItem(
              `endedLocations_${employeeId}`,
              JSON.stringify([...newSet]),
            );
            return newSet;
          });
        }
      }
    });

    return unsubscribe;
  }, [employeeId]);

  // Listen for typing indicator
  useEffect(() => {
    const unsubscribe = onSnapshot(typingDocRef, docSnapshot => {
      const data = docSnapshot.data();
      if (data && data.typing) {
        // Check if any admin is typing (any typing entry that's not the current employee)
        const adminTyping = Object.entries(data.typing).some(
          ([uid, isTyping]) => uid !== EMPLOYEE_ID && isTyping,
        );
        setOtherTyping(adminTyping);
      } else {
        setOtherTyping(false);
      }
    });

    return unsubscribe;
  }, [TYPING_DOC, EMPLOYEE_ID]);

  // Handle typing status
  useEffect(() => {
    const updateTyping = async () => {
      await setDoc(
        typingDocRef,
        { typing: { [EMPLOYEE_ID]: typing } },
        { merge: true },
      );
    };
    updateTyping();
    // Set typing to false after 2s of inactivity
    if (typing) {
      const timeout = setTimeout(() => setTyping(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [typing, EMPLOYEE_ID, TYPING_DOC]);

  const sendMessage = async (
    messageText,
    isLocation = false,
    lat = null,
    lng = null,
  ) => {
    try {
      console.log('sendMessage called with:', { messageText, isLocation, lat, lng, EMPLOYEE_ID });

      if (!messageText.trim() && !isLocation) {
        console.log('Message is empty and not a location');
        return;
      }

      if (!EMPLOYEE_ID) {
        console.error('No EMPLOYEE_ID available');
        alert('Error: No user ID available');
        return;
      }

      const chatDoc = await getDoc(chatDocRef);
      console.log('Chat doc exists:', chatDoc.exists());

      if (!chatDoc.exists()) {
        console.log('Creating new chat document');
        await setDoc(
          chatDocRef,
          {
            participants: [EMPLOYEE_ID],
            employeeId: EMPLOYEE_ID,
            isGroup: true,
            createdAt: new Date(),
          },
          { merge: true },
        );
      }

      let textToSend = messageText;
      if (isLocation && lat && lng) {
        console.log('Creating location message with:', { lat, lng });
        textToSend = JSON.stringify({
          type: 'location',
          latitude: lat,
          longitude: lng,
          url: `https://maps.google.com/?q=${lat},${lng}`,
        });
        console.log('Location message JSON:', textToSend);
      }

      console.log('Adding message to collection:', MESSAGES_COLLECTION);
      const messageRef = await addDoc(collection(firestore, MESSAGES_COLLECTION), {
        senderId: EMPLOYEE_ID,
        text: textToSend.trim(),
        timestamp: new Date(),
      });
      console.log('Message added successfully:', messageRef.id);

      setInput('');
      setTyping(false);

      await setDoc(
        chatDocRef,
        {
          lastMessage: {
            text: textToSend.trim(),
            timestamp: new Date(),
          },
        },
        { merge: true },
      );
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) {
      return; // Don't send empty messages or if already sending
    }
    const messageToSend = input.trim();
    setInput(''); // Clear input immediately
    setSending(true);
    try {
      await sendMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = async () => {
    console.log('handleSendLocation called');
    try {
      const hasPermission = await requestLocationPermission();
      console.log('Location permission granted:', hasPermission);

      if (!hasPermission) {
        alert('Location permission denied');
        return;
      }

      console.log('Getting current position...');
      Geolocation.getCurrentPosition(
        position => {
          console.log('Location obtained:', position);
          const { latitude, longitude } = position.coords;
          console.log('Sending location:', { latitude, longitude });
          sendMessage('', true, latitude, longitude);
        },
        async error => {
          console.error('Geolocation error:', error);

          // Try to get last known location as fallback
          if (error.code === 3) { // Timeout error
            console.log('Trying to get last known location...');
            try {
              Geolocation.getLastKnownPosition(
                position => {
                  if (position) {
                    console.log('Last known location obtained:', position);
                    const { latitude, longitude } = position.coords;
                    console.log('Sending last known location:', { latitude, longitude });
                    sendMessage('', true, latitude, longitude);
                  } else {
                    alert('Location request timed out and no last known location available. Please try again or use the "Test Loc" button.');
                  }
                },
                lastError => {
                  console.error('Last known location error:', lastError);
                  alert('Location request timed out. Please try again or use the "Test Loc" button.');
                }
              );
            } catch (fallbackError) {
              console.error('Fallback location error:', fallbackError);
              alert('Location request timed out. Please try again or use the "Test Loc" button.');
            }
          } else {
            let errorMessage = 'Could not get location';

            switch (error.code) {
              case 1:
                errorMessage = 'Location permission denied. Please enable location access in settings.';
                break;
              case 2:
                errorMessage = 'Location unavailable. Please try again.';
                break;
              case 3:
                errorMessage = 'Location request timed out. Please check your GPS signal and try again.';
                break;
              case 4:
                errorMessage = 'Location service not available. Please try again.';
                break;
              default:
                errorMessage = 'Could not get location: ' + error.message;
            }

            alert(errorMessage);
          }
        },
        {
          enableHighAccuracy: false, // Changed to false for faster response
          timeout: 30000, // Increased timeout to 30 seconds
          maximumAge: 60000, // Increased maximum age to 1 minute
          distanceFilter: 10, // Only update if moved 10 meters
        },
      );
    } catch (error) {
      console.error('Error in handleSendLocation:', error);
      alert('Error getting location: ' + error.message);
    }
  };

  // In renderItem, use improved bubble style for WhatsApp/Instagram look
  const renderItem = ({ item, index }) => {
    const isMe = item.senderId === EMPLOYEE_ID;
    let isLocation = false;
    let locationData = null;
    try {
      const parsed = JSON.parse(item.text);
      if (
        parsed &&
        parsed.type === 'location' &&
        parsed.latitude &&
        parsed.longitude
      ) {
        isLocation = true;
        locationData = parsed;
      }
    } catch (e) { }

    if (isLocation && locationData) {
      const isLocationEnded = endedLocations.has(item.id);

      return (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: isMe ? 'flex-end' : 'flex-start',
            marginBottom: 1,
          }}>
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isMe
                ? { borderBottomRightRadius: 6, borderBottomLeftRadius: 12 }
                : { borderBottomLeftRadius: 6, borderBottomRightRadius: 12 },
              isLocationEnded && styles.endedLocationBubble,
            ]}>
            {/* <ParsedText
              style={[styles.messageText, isMe && styles.messageTextMe, { marginBottom: 4 }]}
              parse={[
                { type: 'url', style: { color: 'blue', textDecorationLine: 'underline' }, onPress: url => Linking.openURL(url) },
              ]}
            >
              {locationData.url}
            </ParsedText> */}
            <TouchableWithoutFeedback
              onPress={() => Linking.openURL(locationData.url)}>
              <View>
                <MapView
                  style={{
                    width: 260,
                    height: 100,
                    borderRadius: 8,
                    marginTop: 10,
                    backgroundColor: '#f0f0f0',
                    borderWidth: 1,
                    borderColor: '#ddd',
                    opacity: isLocationEnded ? 0.5 : 1,
                  }}
                  initialRegion={{
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  pointerEvents="none"
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}>
                  <Marker
                    coordinate={{
                      latitude: locationData.latitude,
                      longitude: locationData.longitude,
                    }}
                  />
                </MapView>
              </View>
            </TouchableWithoutFeedback>

            {/* Location Ended Indicator */}
            {isLocationEnded && (
              <View style={styles.endedLocationIndicator}>
                <Text style={styles.endedLocationText}>Location Ended</Text>
              </View>
            )}

            <Text style={styles.timestamp}>
              {item.timestamp?.toDate
                ? item.timestamp.toDate().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
                : ''}
            </Text>
          </View>
        </View>
      );
    }

    // fallback for normal messages
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          marginBottom: 1,
        }}>
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isMe
              ? { borderBottomRightRadius: 6, borderBottomLeftRadius: 12 }
              : { borderBottomLeftRadius: 6, borderBottomRightRadius: 12 },
          ]}>
          <ParsedText
            style={[styles.messageText, isMe && styles.messageTextMe]}
            parse={[
              {
                type: 'url',
                style: { color: 'blue', textDecorationLine: 'underline' },
                onPress: url => Linking.openURL(url),
              },
            ]}>
            {item.text}
          </ParsedText>
          <Text style={styles.timestamp}>
            {item.timestamp?.toDate
              ? item.timestamp.toDate().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>
        No messages yet. Start the conversation!
      </Text>
    </View>
  );

  useEffect(() => {
    if (
      !loading &&
      messages.length > 0 &&
      typeof onReadMessages === 'function'
    ) {
      // Find the last admin message (not sent by current employee)
      const lastAdminMessage = messages
        .filter(msg => msg.senderId !== EMPLOYEE_ID)
        .pop();

      if (lastAdminMessage?.timestamp?.toMillis) {
        AsyncStorage.setItem(
          'controlRoomLastRead',
          lastAdminMessage.timestamp.toMillis().toString(),
        );
      } else if (messages.length > 0) {
        // Fallback: use the last message timestamp
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.timestamp?.toMillis) {
          AsyncStorage.setItem(
            'controlRoomLastRead',
            lastMsg.timestamp.toMillis().toString(),
          );
        }
      }

      onReadMessages();
    }
  }, [loading, messages, onReadMessages, EMPLOYEE_ID]);

  return (
    <View style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : (
        <>
          {/* Fixed Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.previousButton} onPress={onBack}>
              <Text style={styles.previousButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{`Control Room`}</Text>
            </View>
          </View>

          {/* Fixed Message Area - This should NOT move */}
          <View style={styles.fixedMessageContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesContainer}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
              ListEmptyComponent={renderEmptyState}
              style={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        </>
      )}

      {/* Input Container - This should move with keyboard */}
      <View style={[styles.inputContainer, { marginBottom: keyboardHeight }]}>
        <TouchableOpacity
          onPress={handleSendLocation}
          style={styles.iconButton}>
          <Icon name="location-on" size={28} color="#4f8cff" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={text => {
            setInput(text);
            if (text.trim()) {
              setTyping(true);
              // Clear existing timeout
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              // Set new timeout to stop typing indicator after 2 seconds
              typingTimeoutRef.current = setTimeout(() => {
                setTyping(false);
              }, 2000);
            } else {
              setTyping(false);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
            }
          }}
          placeholder="Type a message..."
          placeholderTextColor="black"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
          multiline={true}
          maxHeight={100}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!input.trim() || sending}>
          <Text style={[
            styles.sendButtonText,
            (!input.trim() || sending) && styles.sendButtonTextDisabled
          ]}>
            {sending ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  mainContainer: { 
    flex: 1,
  },
  fixedMessageContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: { flexGrow: 1 },
  messagesList: { flex: 1 },
  messagesContainer: {
    padding: 12,
    paddingBottom: 120,
    flexGrow: 1
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: '#e3e2e1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  messageText: {
    fontSize: 14,
    color: '#222',
  },
  messageTextMe: {
    color: 'black',
  },
  timestamp: {
    fontSize: 9,
    color: '#aaa',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : height * 0.03,
    backgroundColor: '#f8fafd',
    borderTopWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: '#4f8cff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    marginLeft: 0,
    borderWidth: 1,
    borderColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#f0f4fa',
    alignSelf: 'flex-start',
  },
  backButtonIcon: {
    marginRight: 6,
    color: theme.colors.primary,
    fontSize: 22,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
  },
  previousButton: {
    padding: 2,
    marginRight: 8,
  },
  previousButtonText: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Location ending styles
  endedLocationBubble: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  endedLocationIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  endedLocationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
