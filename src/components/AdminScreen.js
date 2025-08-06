import React, { useState, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  TouchableOpacity,
  Text,
  AppState,
} from 'react-native';
import { database } from './config/firestore';
import { ref, onValue, off, orderByChild, query } from 'firebase/database';
import api from './config/axios';
import Header from '../Admin/Header';
import AlertItem from '../Admin/AlertItem';
import SwipeOutItem from '../Admin/SwipeOutItem';
import EmptyState from '../Admin/EmptyState';
import CreateUserModal from '../Admin/CreateUserModal';
import AlertDetailsModal from '../Admin/AlertDetailsModal';
import Tabs from '../Admin/Tabs';
import LiveLocationScreen from './LiveLocationScreen';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import LiveStreamViewer from '../Admin/LiveStreamViewer';
import EmployeeListScreen from './EmployeeListScreen';
import AdminChatScreen from './AdminChatScreen';
import AdminMapScreen from './AdminMapScreen';
import theme from '../utils/theme';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { setNavigationHandler } from '../notifications/NotificationService';

function getPaginationRange(currentPage, totalPages) {
  const delta = 2;
  const range = [];
  let left = Math.max(2, currentPage - delta);
  let right = Math.min(totalPages - 1, currentPage + delta);
  if (currentPage - delta <= 2) right = 1 + 2 * delta;
  if (currentPage + delta >= totalPages - 1) left = totalPages - 2 * delta;
  left = Math.max(2, left);
  right = Math.min(totalPages - 1, right);
  for (let i = left; i <= right; i++) {
    range.push(i);
  }
  return range;
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

export default function AdminScreen({ userId, backToLogin, initialNavigation, onNavigationHandled }) {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [swipeOuts, setSwipeOuts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [navPage, setNavPage] = useState('alerts'); // 'alerts', 'citizen', or 'maps'
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  const [locationUserId, setLocationUserId] = useState(0);
  const [locationEmployeeName, setLocationEmployeeName] = useState(null);
  const [locationSosId, setLocationSosId] = useState(null);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [showStreamViewer, setShowStreamViewer] = useState(false);
  const [streamAlert, setStreamAlert] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleAlerts, setVisibleAlerts] = useState(20);
  const [showBottomNav, setShowBottomNav] = useState(true);

  // Handle initial navigation from notification
  useEffect(() => {
    if (initialNavigation === 'alerts') {
      setNavPage('alerts');
      if (onNavigationHandled) {
        onNavigationHandled();
      }
    }
  }, [initialNavigation, onNavigationHandled]);

  // Set up notification navigation handler
  useEffect(() => {
    setNavigationHandler(page => {
      console.log('AdminScreen navigation handler called with page:', page);
      if (page === 'alerts') {
        console.log('Setting navPage to alerts');
        setNavPage('alerts');
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up AdminScreen navigation handler');
      setNavigationHandler(null);
    };
  }, []);

  // Lazy loading handler
  const handleLoadMore = () => {
    if (visibleAlerts < alerts.length) {
      setVisibleAlerts(prev => Math.min(prev + 20, alerts.length));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const alertsRef = ref(database, 'sos_alerts');
    const swipeOutsRef = ref(database, 'swipe_outs');

    const alertsQuery = query(alertsRef, orderByChild('createdAt'));
    const swipeOutsQuery = query(swipeOutsRef, orderByChild('timestamp'));

    const onSosValueChange = onValue(alertsQuery, snapshot => {
      const alertsData = [];

      snapshot.forEach(child => {
        const alert = { id: child.key, ...child.val() };
        if (alert.is_admin == true) {
          alertsData.push(alert);
        }
      });

      setAlerts(alertsData.reverse());
      setRefreshing(false);
    });

    const onSwipeOutChange = onValue(swipeOutsQuery, snapshot => {
      const swipeOutData = [];

      snapshot.forEach(child => {
        const swipeOut = { id: child.key, ...child.val() };
        swipeOutData.push(swipeOut);
      });

      setSwipeOuts(swipeOutData.reverse());
    });

    return () => {
      off(alertsRef, 'value', onSosValueChange);
      off(swipeOutsRef, 'value', onSwipeOutChange);
    };
  }, []);

  useEffect(() => {
    if (navPage !== 'citizen') return;
    let isMounted = true;
    const fetchCitizenUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);
        const response = await api.get('/users/by-role/1'); //1 is citizen role
        if (isMounted) setUsers(response.data);
      } catch (err) {
        if (isMounted) setUsersError('Failed to load users');
      } finally {
        if (isMounted) setUsersLoading(false);
      }
    };
    fetchCitizenUsers();
    return () => {
      isMounted = false;
    };
  }, [navPage]);

  useEffect(() => {
    if (refreshing) {
      setTimeout(() => {
        setRefreshing(false);
      }, 5000);
    }
  }, [refreshing]);

  const acknowledgeAlert = async alertId => {
    try {
      setLoading(true);
      // console.log('sfdd', alertId, userId);
      const response = await api.post('/sos-alerts/acknowledge', {
        alertId: Number(alertId) || 0,
        acknowledgerId: userId,
      });

      if (response.data.success) {
        setAlerts(
          alerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert,
          ),
        );
      }
    } catch (error) {
      console.error('Acknowledgment failed:', error);
      if (error.response) {
        console.log('Error response:', error.response);
        console.log('Error response data:', error.response.data);
      }
      Alert.alert('Error', 'Failed to acknowledge alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLocation = location => {
    if (!location) {
      Alert.alert(
        'No Location',
        'Location data is not available for this alert',
      );
      return;
    }

    let lat, lng;

    try {
      if (typeof location === 'string') {
        [lat, lng] = location.split(',').map(Number);
      } else if (location.type === 'Point' && location.coordinates) {
        [lng, lat] = location.coordinates;
      } else {
        throw new Error('Invalid location format');
      }

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates');
      }
    } catch (error) {
      console.error('Location parsing error:', error);
      Alert.alert('Invalid Location', 'The location format is invalid');
      return;
    }

    const mapUrl = Platform.select({
      ios: `http://maps.apple.com/?ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.google.com/maps?q=${lat},${lng}`,
    });

    Linking.openURL(mapUrl);
  };

  const handleViewAlertDetails = alert => {
    setSelectedAlert(alert);
    setShowAlertDetails(true);
  };
  if (showLiveLocation) {
    return (
      <View style={styles.container}>
        <LiveLocationScreen
          onBack={() => setShowLiveLocation(false)}
          employeeId={locationUserId}
          employeeName={locationEmployeeName}
          sosId={locationSosId}
        />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Header
        onLogout={backToLogin}
        onLanguagePress={() => setLanguageModalVisible(true)}
      />

      <LanguageSelector
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
        onLanguageChange={() => { }}
      />

      {/* Bottom Navbar */}
      {showBottomNav && (
        <View style={styles.adminBottomNavBar}>
          <TouchableOpacity style={styles.adminBottomNavItem} onPress={() => setNavPage('alerts')}>
            <Icon name="warning" size={28} color={navPage === 'alerts' ? '#6a1b9a' : '#888'} />
            <Text style={[styles.adminBottomNavLabel, navPage === 'alerts' && styles.adminBottomNavLabelActive]}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminBottomNavItem} onPress={() => setNavPage('citizen')}>
            <Icon name="people" size={28} color={navPage === 'citizen' ? '#6a1b9a' : '#888'} />
            <Text style={[styles.adminBottomNavLabel, navPage === 'citizen' && styles.adminBottomNavLabelActive]}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.adminBottomNavItem} onPress={() => setNavPage('maps')}>
            <Icon name="map" size={28} color={navPage === 'maps' ? '#6a1b9a' : '#888'} />
            <Text style={[styles.adminBottomNavLabel, navPage === 'maps' && styles.adminBottomNavLabelActive]}>Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <SkeletonPlaceholder borderRadius={8}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={{ marginBottom: 20 }}>
                <View style={{ height: 80, borderRadius: 8 }} />
              </View>
            ))}
          </SkeletonPlaceholder>
        </View>
      ) : navPage === 'maps' ? (
        <AdminMapScreen
          userId={userId}
          onBack={() => setNavPage('alerts')}
        />
      ) : navPage === 'citizen' ? (
        selectedEmployee ? (
          <View style={{ flex: 1 }}>
            <AdminChatScreen
              employeeId={selectedEmployee.id || selectedEmployee._id || selectedEmployee.uid}
              employeeName={selectedEmployee.name}
              onBack={() => {
                setSelectedEmployee(null);
                setShowBottomNav(true);
              }}
            />
          </View>
        ) : (
          <EmployeeListScreen
            onSelectEmployee={(employee) => {
              setSelectedEmployee(employee);
              setShowBottomNav(false);
            }}
            employees={users}
            loading={usersLoading}
            error={usersError}
          />
        )
      ) : (
        <FlatList
          data={alerts.slice(0, visibleAlerts)}
          renderItem={({ item }) => (
            <AlertItem
              item={item}
              onPress={() => handleViewAlertDetails(item)}
              onLongPress={() => handleOpenLocation(item.location)}
              onLiveLocation={() => {
                setLocationUserId(item.userId || item.employeeId);
                setLocationSosId(item.id);
                setLocationEmployeeName(item.userName || item.employeeName);
                setShowLiveLocation(true);
              }}
              onOpenStream={alert => {
                setStreamAlert(alert);
                setShowStreamViewer(true);
              }}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContainer,
            alerts.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={<EmptyState activeTab={navPage} />}
          refreshing={refreshing}
          onRefresh={() => setRefreshing(true)}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      <CreateUserModal
        visible={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
      />

      <AlertDetailsModal
        visible={showAlertDetails}
        alert={selectedAlert}
        onClose={() => setShowAlertDetails(false)}
        onAcknowledge={acknowledgeAlert}
        onOpenLocation={handleOpenLocation}
      />

      {showStreamViewer && streamAlert && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <LiveStreamViewer
            alertId={streamAlert.id}
            onClose={() => setShowStreamViewer(false)}
            userName='Admin'
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius,
    margin: 10,
    padding: 15,
    ...theme.shadow,
  },
  button: {
    borderRadius: theme.borderRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    margin: 10,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: theme.colors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderTopLeftRadius: theme.borderRadius,
    borderTopRightRadius: theme.borderRadius,
    ...theme.shadow,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyListContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  liveLocationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  liveLocationButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  liveLocationModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  paginationButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  pageNumberBox: {
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginHorizontal: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pageNumberBoxActive: {
    backgroundColor: theme.colors.primary,
  },
  pageNumberText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
  pageNumberTextActive: {
    color: theme.colors.textLight,
  },
  ellipsis: {
    color: '#888',
    fontSize: 18,
    marginHorizontal: 4,
    fontWeight: 'bold',
  },
  paginationText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  adminBottomNavBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 100,
  },
  adminBottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  adminBottomNavLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  adminBottomNavLabelActive: {
    color: '#6a1b9a',
    fontWeight: 'bold',
  },
});
