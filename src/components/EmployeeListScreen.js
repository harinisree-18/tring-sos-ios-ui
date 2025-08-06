import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import api from './config/axios';
import AdminChatScreen from './AdminChatScreen';
import CreateUserModal from '../Admin/CreateUserModal';
import {useTranslation} from 'react-i18next';
import theme from '../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {firestore} from './config/firestore';

const EmployeeListScreen = ({
  onSelectEmployee,
  employees = [],
  loading = false,
  error = null,
}) => {
  const {t} = useTranslation();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  // Real-time listeners for unread messages
  useEffect(() => {
    if (!employees || employees.length === 0) return;

    const listeners = [];

    const setupListeners = async () => {
      for (const emp of employees) {
        const empId = String(emp.id || emp._id || emp.uid);
        if (!empId) continue;

        const CHAT_ID = `employee_${empId}_admins`;
        const MESSAGES_COLLECTION = `chats/${CHAT_ID}/messages`;

        const q = query(
          collection(firestore, MESSAGES_COLLECTION),
          orderBy('timestamp', 'desc'),
        );

        const unsubscribe = onSnapshot(q, async snapshot => {
          const messages = snapshot.docs.map(doc => doc.data());
          const lastMsg = messages[0];

          if (lastMsg) {
            // Update last message content
            let messageText = '';
            try {
              const parsed = JSON.parse(lastMsg.text);
              if (parsed && parsed.type === 'location') {
                messageText = '📍 Location shared';
              } else {
                messageText = lastMsg.text;
              }
            } catch (e) {
              messageText = lastMsg.text;
            }

            setLastMessages(prev => ({
              ...prev,
              [empId]: messageText,
            }));

            // Update unread badge
            if (
              String(lastMsg.senderId) === empId &&
              lastMsg.text &&
              lastMsg.text.trim() !== ''
            ) {
              const lastRead = await AsyncStorage.getItem(
                `adminLastRead_${empId}`,
              );
              const msgTimestamp = lastMsg.timestamp?.toMillis
                ? lastMsg.timestamp.toMillis()
                : lastMsg.timestamp?.seconds
                ? lastMsg.timestamp.seconds * 1000
                : Number(lastMsg.timestamp);

              const showBadge = !lastRead || msgTimestamp > Number(lastRead);

              setUnreadCounts(prev => ({
                ...prev,
                [empId]: showBadge,
              }));
            }
          }
        });

        listeners.push(unsubscribe);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
    };
  }, [employees]);

  const handleSelectEmployee = async item => {
    const empId = item.id || item._id || item.uid;
    // Set last read timestamp to now
    await AsyncStorage.setItem(`adminLastRead_${empId}`, Date.now().toString());
    setUnreadCounts(prev => ({...prev, [empId]: false}));
    setSelectedEmployee(item);
    if (onSelectEmployee) onSelectEmployee(item);
  };

  const renderItem = ({item}) => {
    const empId = String(item.id || item._id || item.uid);
    const hasUnread = unreadCounts[empId];
    const lastMessage =
      lastMessages[empId] ||
      t('chat.noMessagesYet', 'No messages yet', {
        name: item.name || item.userName,
      });

    return (
      <TouchableOpacity
        style={[styles.item, hasUnread && styles.itemHighlight]}
        onPress={() => handleSelectEmployee(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name ? item.name[0].toUpperCase() : '?'}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {item.name || t('common.unnamed', 'Unnamed')}
          </Text>
          <Text
            style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
        {hasUnread && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{t('common.new', 'New')}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4f8cff" />
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{color: 'red'}}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('chat.chats', 'Chats')}</Text>
      </View>

      <FlatList
        data={employees}
        keyExtractor={item => item.id || item._id || item.uid}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {t('chat.noChatsFound', 'No chats found.')}
          </Text>
        }
      />

      <CreateUserModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
      />

      {selectedEmployee && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedEmployee(null)}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
            <AdminChatScreen
              employeeId={
                selectedEmployee.id ||
                selectedEmployee._id ||
                selectedEmployee.uid
              }
              employeeName={selectedEmployee.name}
              onBack={() => setSelectedEmployee(null)}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 70,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4f8cff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  id: {
    fontSize: 12,
    color: '#888',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontStyle: 'italic',
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
  closeButton: {
    padding: 12,
    backgroundColor: '#eee',
    alignItems: 'flex-end',
  },
  closeButtonText: {
    color: '#4f8cff',
    fontWeight: 'bold',
    fontSize: 16,
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
    shadowOffset: {width: 0, height: 2},
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
  itemHighlight: {
    backgroundColor: '#e3eafc', // or any highlight color you like
  },
  lastMessage: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  lastMessageUnread: {
    color: '#4f8cff',
    fontWeight: 'bold',
  },
});

export default EmployeeListScreen;
