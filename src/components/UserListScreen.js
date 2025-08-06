import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from './config/axios';
import ChatScreen from './ChatScreen';
import OneToOneChatScreen from './OneToOneChatScreen';
import { useTranslation } from 'react-i18next';
import theme from '../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from './config/firestore';

const UserListScreen = ({ userId, onBack, hideBottomNav, showBottomNav }) => {
  const { t } = useTranslation();
  const [relatedContacts, setRelatedContacts] = useState([]);
  const [requestingUser, setRequestingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showControlRoom, setShowControlRoom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Control room data (always at top)
  const controlRoom = {
    id: 'control_room',
    name: 'Control Room',
    type: 'control_room',
    description: 'Emergency support and assistance',
  };

  useEffect(() => {
    fetchRelatedContacts();
  }, [userId]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!requestingUser?.id) return;

      try {
        const EMPLOYEE_ID = requestingUser.id;
        const CHAT_ID = `employee_${EMPLOYEE_ID}_admins`;
        const MESSAGES_COLLECTION = `chats/${CHAT_ID}/messages`;

        const q = query(
          collection(firestore, MESSAGES_COLLECTION),
          orderBy('timestamp', 'asc'),
        );

        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map(doc => doc.data());

        // Get the last read timestamp
        const lastRead = await AsyncStorage.getItem('controlRoomLastRead');

        let count = 0;

        if (lastRead) {
          // Only count messages that are:
          // 1. NOT sent by the current employee (admin messages)
          // 2. Sent after the last read timestamp
          count = messages.filter(msg => {
            // Skip messages sent by the current employee
            if (msg.senderId === EMPLOYEE_ID) {
              return false;
            }

            // Get message timestamp
            const msgTimestamp = msg.timestamp?.toMillis
              ? msg.timestamp.toMillis()
              : msg.timestamp?.seconds
                ? msg.timestamp.seconds * 1000
                : Number(msg.timestamp);

            // Count only messages after last read
            return msgTimestamp > Number(lastRead);
          }).length;
        } else {
          // If no last read timestamp, count all admin messages
          count = messages.filter(msg => msg.senderId !== EMPLOYEE_ID).length;
        }

        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      }
    };
    fetchUnreadCount();
  }, [requestingUser]);

  const fetchRelatedContacts = async () => {
    try {
      console.log('fetchRelatedContacts called with userId:', userId);
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/user-contacts/by-user-with-matches/${userId}`,
      );
      console.log('API response:', response);
      if (response.status == 200) {
        console.log('response.data:', response.data);
        console.log('requestingUser from API:', response.data.requestingUser);
        setRelatedContacts(response.data.users || []);
        setRequestingUser(response.data.requestingUser);
      } else {
        setError('Failed to fetch contacts');
      }
    } catch (err) {
      console.error('Error fetching related contacts:', err);
      setError(err.response?.data?.message || 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleContactPress = contact => {
    if (contact.type === 'control_room') {
      setShowControlRoom(true);
      setSelectedContact(null);
      hideBottomNav && hideBottomNav();
    } else {
      setSelectedContact(contact.user);
      setShowControlRoom(false);
      hideBottomNav && hideBottomNav();
    }
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleContactPress(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.user.name ? item.user.name[0].toUpperCase() : '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.contactName}>{item.user.name || 'Unnamed'}</Text>
          {item?.phone == requestingUser?.primary_contact && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>
                {item.contact.relationship}
              </Text>
            </View>
          )}
        </View>
        {/* <Text style={styles.contactDetails}>
          {item.department || 'No department'} • {item.role || 'Employee'}
        </Text> */}
        {item.primary_contact && (
          <Text style={styles.contactPhone}>📞 {item.primary_contact}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const renderControlRoomItem = () => (
    <>
      <TouchableOpacity
        style={[
          styles.simpleTile,
          unreadCount > 0 && styles.simpleTileHighlight,
        ]}
        onPress={() => {
          setShowControlRoom(true);
          setUnreadCount(0); // Reset unread count when opening chat
          hideBottomNav && hideBottomNav();
        }}>
        <Icon
          name="security"
          size={28}
          color={theme.colors.primary}
          style={styles.simpleTileIcon}
        />
        <View style={styles.simpleTileTextContainer}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={styles.tileTitle}>{controlRoom.name}</Text>
            {unreadCount > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileSubtitle}>{controlRoom.description}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.hr} />
    </>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchRelatedContacts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderControlRoomItem()}

      {/* Control Room Chat Modal */}
      {showControlRoom && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {requestingUser ? (
              <ChatScreen
                employee={requestingUser}
                onBack={() => {
                  setShowControlRoom(false);
                  showBottomNav && showBottomNav();
                }}
                onReadMessages={() => setUnreadCount(0)}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading user data...</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* One-to-One Chat Modal */}
      {selectedContact && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedContact(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity> 
            </View> */}
            <OneToOneChatScreen
              contactId={selectedContact.id}
              contactName={selectedContact.name}
              onBack={() => {
                setSelectedContact(null);
                showBottomNav && showBottomNav();
              }}
              currentUser={requestingUser}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  list: {
    padding: 16,
  },
  primaryBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  primaryBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  controlRoomItem: {
    backgroundColor: theme.colors.primary,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  controlRoomAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  controlRoomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  contactDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  controlRoomDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contactPhone: {
    fontSize: 12,
    color: '#888',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  unreadBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 40,
    top: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  unreadBadgeText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    padding: 2,
  },
  // Add WhatsApp-style tile styles
  whatsappTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    // No border
  },
  tileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3eafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  tileTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: 8,
  },
  tileSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  newText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 8,
    alignSelf: 'center',
    padding: 0,
  },
  whatsappTileHighlight: {
    // No highlight background
  },
  hr: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 18,
    marginTop: 0,
    marginBottom: 8,
    borderRadius: 1,
  },
  newBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignSelf: 'center',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
    marginRight: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  newBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  simpleTile: {
    flexDirection: 'row',
    alignItems: 'center',
    // No background color
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  simpleTileIcon: {
    marginLeft: 18,
    marginRight: 16,
    // No background, no border radius
  },
  simpleTileTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  simpleTileHighlight: {
    backgroundColor: '#e3eafc',
  },
});

export default UserListScreen;
