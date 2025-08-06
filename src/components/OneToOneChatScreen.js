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
  Dimensions,
  Keyboard,
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
import { firestore } from './config/firestore';
import api from './config/axios';
import theme from '../utils/theme';
import { useTranslation } from 'react-i18next';

const OneToOneChatScreen = ({ contactId, contactName, onBack, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationTrackingEnded, setLocationTrackingEnded] = useState(false);
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

  // Use currentUser.id as the current user ID
  const currentUserId = currentUser?.id;
  console.log('currentUser', currentUser);
  // Create unique chat ID for one-to-one chat
  const CHAT_ID = `one_to_one_${Math.min(currentUserId, contactId)}_${Math.max(
    currentUserId,
    contactId,
  )}`;
  const MESSAGES_COLLECTION = `chats/${CHAT_ID}/messages`;
  const TYPING_DOC = `chats/${CHAT_ID}`;
  const typingDocRef = doc(firestore, TYPING_DOC);
  const messagesQuery = query(
    collection(firestore, MESSAGES_COLLECTION),
    orderBy('timestamp', 'asc'),
  );
  const chatDocRef = doc(firestore, TYPING_DOC);

  const { t } = useTranslation();

  // Listen for messages
  useEffect(() => {
    if (!currentUserId) return;

    setLoading(true);
    const unsubscribe = onSnapshot(
      messagesQuery,
      snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);

        // Note: Location tracking end is now handled by EmployeeScreen
        // through a separate Firestore document, not through chat messages

        setLoading(false);
      },
      error => {
        console.error('Firestore onSnapshot error:', error);
        setMessages([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [MESSAGES_COLLECTION, currentUserId]);

  // Listen for typing indicator
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = onSnapshot(typingDocRef, docSnapshot => {
      const data = docSnapshot.data();
      if (data && data.typing && data.typing[contactId]) {
        setOtherTyping(!!data.typing[contactId]);
      } else {
        setOtherTyping(false);
      }
    });

    return unsubscribe;
  }, [TYPING_DOC, contactId, currentUserId]);

  // Handle typing status
  useEffect(() => {
    if (!currentUserId) return;

    const updateTyping = async () => {
      await setDoc(
        typingDocRef,
        { typing: { [currentUserId]: typing } },
        { merge: true },
      );
    };
    updateTyping();

    if (typing) {
      const timeout = setTimeout(() => setTyping(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [typing, currentUserId, TYPING_DOC]);

  const handleSend = async () => {
    if (!input.trim() || !currentUserId) return;

    // Ensure chat document exists before sending first message
    const chatDoc = await getDoc(chatDocRef);

    if (!chatDoc.exists()) {
      await setDoc(
        chatDocRef,
        {
          participants: [currentUserId, contactId],
          isOneToOne: true,
          createdAt: new Date(),
          contactName: contactName,
        },
        { merge: true },
      );
    }

    // Add a message to the messages collection
    await addDoc(collection(firestore, MESSAGES_COLLECTION), {
      senderId: currentUserId,
      text: input.trim(),
      timestamp: new Date(),
    });

    // Clear input and typing state
    setInput('');
    setTyping(false);

    // Update the last message in the chat doc
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

    // Scroll to bottom
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const renderItem = ({ item }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <View
        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
          {item.text}
        </Text>
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
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateText}>
        {t('chat.noMessagesYet', 'No messages yet. Start the conversation with {{name}}!', { name: contactName })}
      </Text>
    </View>
  );
  if (!currentUserId) {
    console.log('currentUserId', currentUserId);

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>  </Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {contactName || t('chat.contactWithId', { id: contactId })}
          </Text>
          <Text style={styles.headerSubtitle}>{t('chat.oneToOneChat', 'One-to-one chat')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('chat.loadingMessages', 'Loading messages...')}</Text>
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
            <Text style={styles.typingIndicator}>{t('chat.isTyping', { name: contactName })}</Text>
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
          placeholder={t('chat.typeMessage', 'Type a message...')}
          placeholderTextColor="#999"
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!loading}
          multiline={true}
          maxHeight={100}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={loading}>
          <Text style={styles.sendButtonText}>{t('chat.send', 'Send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  fixedMessageContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
  },
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
  messagesContainer: {
    padding: 12,
    paddingBottom: 120,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '75%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#222',
  },
  messageTextMe: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
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
    backgroundColor: theme.colors.primary,
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
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
    marginTop: 12,
  },
});

export default OneToOneChatScreen;
