import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
  TouchableWithoutFeedback,
  Alert,
  Dimensions,
  Keyboard,
} from 'react-native';

const { height } = Dimensions.get('window');

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
import { firestore } from './config/firestore';
import theme from '../utils/theme';
import ParsedText from 'react-native-parsed-text';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_ID = 'admin_1'; // TODO: Replace with real admin ID from auth context

const AdminChatScreen = ({ employeeId, employeeName, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [endedLocations, setEndedLocations] = useState(new Set());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);

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

  const CHAT_ID = `employee_${employeeId}_admins`;
  const MESSAGES_COLLECTION = `chats/${CHAT_ID}/messages`;
  const TYPING_DOC = `chats/${CHAT_ID}`;
  const typingDocRef = doc(firestore, TYPING_DOC);
  const messagesQuery = query(
    collection(firestore, MESSAGES_COLLECTION),
    orderBy('timestamp', 'asc'),
  );
  const chatDocRef = doc(firestore, TYPING_DOC);

  // Load persisted ended locations on mount
  useEffect(() => {
    const loadEndedLocations = async () => {
      try {
        console.log('Admin loading ended locations for employee:', employeeId);

        // First, try to get the current state from Firestore
        const locationStateRef = doc(firestore, `location_states/${employeeId}`);
        const locationStateDoc = await getDoc(locationStateRef);

        if (locationStateDoc.exists()) {
          const data = locationStateDoc.data();
          if (data.endedMessageIds && data.endedMessageIds.length > 0) {
            console.log('Admin found ended message IDs in Firestore:', data.endedMessageIds);
            setEndedLocations(new Set(data.endedMessageIds));

            // Update AsyncStorage with the Firestore data
            await AsyncStorage.setItem(
              `adminEndedLocations_${employeeId}`,
              JSON.stringify(data.endedMessageIds)
            );
            return;
          }
        }

        // Fallback to AsyncStorage if no Firestore data
        const stored = await AsyncStorage.getItem(`adminEndedLocations_${employeeId}`);
        if (stored) {
          const endedIds = JSON.parse(stored);
          console.log('Admin found ended message IDs in AsyncStorage:', endedIds);
          setEndedLocations(new Set(endedIds));
        } else {
          console.log('Admin: No ended locations found');
        }
      } catch (error) {
        console.error('Error loading admin ended locations:', error);
      }
    };

    if (employeeId) {
      loadEndedLocations();
    }
  }, [employeeId]);

  // Listen for messages
  useEffect(() => {
    console.log('AdminChatScreen: Setting up message listener for:', MESSAGES_COLLECTION);
    setLoading(true);
    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('AdminChatScreen: Received messages:', msgs.length);
        msgs.forEach(msg => {
          console.log('AdminChatScreen: Message:', {
            id: msg.id,
            senderId: msg.senderId,
            text: msg.text,
            timestamp: msg.timestamp
          });
        });
        setMessages(msgs);
        setLoading(false);
      },
      error => {
        console.error('AdminChatScreen: Error listening to messages:', error);
        setMessages([]);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [MESSAGES_COLLECTION]);

  // Listen for location state changes from shared document
  useEffect(() => {
    if (!employeeId) return;

    const locationStateRef = doc(firestore, `location_states/${employeeId}`);

    const unsubscribe = onSnapshot(locationStateRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        if (data.locationEnded && data.endedMessageIds) {
          // Add all ended message IDs to our set and persist it
          setEndedLocations(prev => {
            const newSet = new Set([...prev, ...data.endedMessageIds]);
            // Persist to AsyncStorage
            AsyncStorage.setItem(`adminEndedLocations_${employeeId}`, JSON.stringify([...newSet]));
            return newSet;
          });
        }
      }
    });

    return unsubscribe;
  }, [employeeId]);

  // Listen for typing indicator (employee typing)
  useEffect(() => {
    const unsubscribe = onSnapshot(typingDocRef, docSnapshot => {
      const data = docSnapshot.data();
      if (data && data.typing && data.typing[employeeId]) {
        setOtherTyping(!!data.typing[employeeId]);
      } else {
        setOtherTyping(false);
      }
    });
    return unsubscribe;
  }, [TYPING_DOC, employeeId]);

  // Handle typing status (admin typing)
  useEffect(() => {
    const updateTyping = async () => {
      await setDoc(typingDocRef, { typing: { [ADMIN_ID]: typing } }, { merge: true });
    };
    updateTyping();
    if (typing) {
      const timeout = setTimeout(() => setTyping(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [typing, ADMIN_ID, TYPING_DOC]);

  const handleSend = async () => {
    if (!input.trim()) return;
    // Ensure chat document exists before sending first message
    const chatDoc = await getDoc(chatDocRef);
    if (!chatDoc.exists()) {
      await setDoc(
        chatDocRef,
        {
          participants: [employeeId, ADMIN_ID],
          employeeId: employeeId,
          isGroup: true,
          createdAt: new Date(),
        },
        { merge: true },
      );
    }
    await addDoc(collection(firestore, MESSAGES_COLLECTION), {
      senderId: ADMIN_ID,
      text: input.trim(),
      timestamp: new Date(),
    });
    setInput('');
    setTyping(false);
    await setDoc(
      chatDocRef,
      {
        lastMessage: {
          text: input.trim(),
          timestamp: new Date(),
        },
      },
      { merge: true },
    );
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleEndLocation = async (messageId) => {
    console.log('Admin ending location for message:', messageId);

    // Add to state and persist to AsyncStorage
    setEndedLocations(prev => {
      const newSet = new Set([...prev, messageId]);
      const newArray = [...newSet];

      // Persist to AsyncStorage
      AsyncStorage.setItem(`adminEndedLocations_${employeeId}`, JSON.stringify(newArray));

      // Update the shared state document to indicate location has been ended
      const sharedStateRef = doc(firestore, `location_states/${employeeId}`);
      setDoc(sharedStateRef, {
        locationEnded: true,
        endedMessageIds: newArray, // Use the new array instead of current state
        endedAt: new Date(),
        endedBy: ADMIN_ID
      }, { merge: true });

      return newSet;
    });
  };

  const handleReEnableLocation = async (messageId) => {
    console.log('Admin re-enabling location for message:', messageId);

    // Remove from state and persist to AsyncStorage
    setEndedLocations(prev => {
      const newSet = new Set([...prev]);
      newSet.delete(messageId);
      const newArray = [...newSet];

      // Persist to AsyncStorage
      AsyncStorage.setItem(`adminEndedLocations_${employeeId}`, JSON.stringify(newArray));

      // Update the shared state document
      const sharedStateRef = doc(firestore, `location_states/${employeeId}`);
      setDoc(sharedStateRef, {
        locationEnded: newArray.length > 0,
        endedMessageIds: newArray,
        endedAt: newArray.length > 0 ? new Date() : null,
        endedBy: newArray.length > 0 ? ADMIN_ID : null
      }, { merge: true });

      return newSet;
    });
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === ADMIN_ID;
    let isLocation = false;
    let locationData = null;
    try {
      const parsed = JSON.parse(item.text);
      console.log('AdminChatScreen: Parsed message:', parsed);
      if (parsed && parsed.type === 'location' && parsed.latitude && parsed.longitude) {
        isLocation = true;
        locationData = parsed;
        console.log('AdminChatScreen: Location message detected:', locationData);
      }
    } catch (e) {
      console.log('AdminChatScreen: Failed to parse message as JSON:', e.message);
    }

    if (isLocation && locationData) {
      const isLocationEnded = endedLocations.has(item.id);

      return (
        <View style={{
          flexDirection: 'row',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          marginBottom: 1,
        }}>
          <View style={[
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
            <TouchableWithoutFeedback onPress={() => Linking.openURL(locationData.url)}>
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
                  rotateEnabled={false}
                >
                  <Marker coordinate={{ latitude: locationData.latitude, longitude: locationData.longitude }} />
                </MapView>
              </View>
            </TouchableWithoutFeedback>

            {/* End Location Button - only show if location is not ended and message is from employee */}
            {!isMe && !isLocationEnded && (
              <TouchableOpacity
                style={styles.endLocationButton}
                onPress={() => {
                  Alert.alert(
                    'End Location Tracking',
                    'Are you sure you want to end the location tracking for this user?',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'End Location',
                        style: 'destructive',
                        onPress: () => handleEndLocation(item.id),
                      },
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Text style={styles.endLocationButtonText}>End Location</Text>
              </TouchableOpacity>
            )}

            {/* Location Ended Indicator - Top */}
            {isLocationEnded && (
              <View style={styles.endedLocationIndicator}>
                <Text style={styles.endedLocationText}>Location Ended</Text>
              </View>
            )}

            {/* Re-enable Location Button - Bottom */}
            {isLocationEnded && !isMe && (
              <TouchableOpacity
                style={styles.reEnableLocationButton}
                onPress={() => {
                  Alert.alert(
                    'Re-enable Location Tracking',
                    'Are you sure you want to re-enable location tracking for this user?',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Re-enable',
                        style: 'default',
                        onPress: () => handleReEnableLocation(item.id),
                      },
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Text style={styles.reEnableLocationButtonText}>↻</Text>
              </TouchableOpacity>
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
      <View style={{
        flexDirection: 'row',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        marginBottom: 1,
      }}>
        <View style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleOther,
          isMe
            ? { borderBottomRightRadius: 6, borderBottomLeftRadius: 12 }
            : { borderBottomLeftRadius: 6, borderBottomRightRadius: 12 },
        ]}>
          <ParsedText
            style={[styles.messageText, isMe && styles.messageTextMe]}
            parse={[
              { type: 'url', style: { color: 'blue', textDecorationLine: 'underline' }, onPress: url => Linking.openURL(url) },
            ]}
          >
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {employeeName || `Employee ${employeeId}`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f8cff" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : (
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
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {otherTyping && (
            <Text style={styles.typingIndicator}>Employee is typing...</Text>
          )}
        </View>
      )}

      {/* Input Container - This should move with keyboard */}
      <View style={[styles.inputContainer, { marginBottom: keyboardHeight }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={text => {
            setInput(text);
            setTyping(true);
          }}
          placeholder="Type a message..."
          placeholderTextColor="black"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={true}
          maxHeight={100}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { 
    flex: 1,
  },
  fixedMessageContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#4f8cff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
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
    padding: 8,
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
    padding: 10,
    color: theme.colors.text,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4f8cff',
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 28,
    marginLeft: 0,
    borderWidth: 1,
    borderColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  typingIndicator: {
    fontStyle: 'italic',
    color: '#888',
    marginLeft: 12,
    marginBottom: 4,
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
  // Location ending styles
  endedLocationBubble: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  endLocationButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  endLocationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  reEnableLocationButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  reEnableLocationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AdminChatScreen;
