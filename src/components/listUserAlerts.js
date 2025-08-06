import React, {useState, useEffect, useRef} from 'react';
import {View, FlatList, StyleSheet, RefreshControl, Modal} from 'react-native';
import {database} from './config/firestore';
import {
  ref,
  onValue,
  off,
  orderByChild,
  query,
  equalTo,
} from 'firebase/database';
import AlertItem from '../Admin/AlertItem';
import EmptyState from '../Admin/EmptyState';
import theme from '../utils/theme';
import {useTranslation} from 'react-i18next';
// --- Added imports for modals ---
import AlertDetailsModal from '../Admin/AlertDetailsModal';
import LiveStreamViewer from '../Admin/LiveStreamViewer';
import LiveLocationScreen from './LiveLocationScreen';

export default function ListUserAlerts({userId, userName, soundShow}) {
  const {t} = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // --- Modal/modal state ---
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [showLiveLocation, setShowLiveLocation] = useState(false);
  const [showStreamViewer, setShowStreamViewer] = useState(false);
  const [locationEmployeeId, setLocationEmployeeId] = useState(null);
  const [locationEmployeeName, setLocationEmployeeName] = useState(null);
  const [locationSosId, setLocationSosId] = useState(null);
  const [streamAlert, setStreamAlert] = useState(null);
  const prevAlertIds = useRef([]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const alertsRef = ref(database, 'sos_alerts');
    const alertsQuery = query(alertsRef);
    const onSosValueChange = onValue(alertsQuery, snapshot => {
      const alertsData = [];
      snapshot.forEach(child => {
        const alert = {id: child.key, ...child.val()};
        alertsData.push(alert);
      });
      // Only show alerts where alert.primary_contact includes userId (array or single value)
      const filteredAlerts = alertsData.filter(alert => {
        if (!alert.primary_contact) return false;
        if (Array.isArray(alert.primary_contact)) {
          return alert.primary_contact.includes(userId);
        }
        return alert.primary_contact === userId;
      });
      // --- Detect new alerts ---
      const newAlertIds = filteredAlerts.map(a => a.id);
      const prevIds = prevAlertIds.current;

      // Find all IDs that are in newAlertIds but not in prevIds
      const trulyNewIds = newAlertIds.filter(id => !prevIds.includes(id));

      // Only trigger if there is at least one truly new alert
      if (trulyNewIds.length > 0 && typeof soundShow === 'function') {
        soundShow();
      }
      prevAlertIds.current = newAlertIds;
      // ---
      setAlerts(filteredAlerts.reverse());
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      off(alertsRef, 'value', onSosValueChange);
    };
  }, [userId, refreshing]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  // --- Handlers for modals ---
  const handleViewAlertDetails = alert => {
    setSelectedAlert(alert);
    setShowAlertDetails(true);
  };

  const handleOpenLiveLocation = alert => {
    // console.log("slerts",alert);
    setLocationEmployeeId(alert.userId);
    setLocationSosId(alert.alertId);
    setLocationEmployeeName(alert.userName || alert.employeeName);
    setShowLiveLocation(true);
  };

  const handleOpenStream = alert => {
    setStreamAlert(alert);
    setShowStreamViewer(true);
  };

  // --- Render logic ---
  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={({item}) => (
          <AlertItem
            item={item}
            onPress={() => handleViewAlertDetails(item)}
            onLongPress={() => handleOpenLiveLocation(item)}
            onLiveLocation={() => handleOpenLiveLocation(item)}
            onOpenStream={handleOpenStream}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={
          alerts.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        ListEmptyComponent={!loading && <EmptyState activeTab="alerts" />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      {/* --- Modals --- */}
      {showAlertDetails && (
        <AlertDetailsModal
          visible={showAlertDetails}
          alert={selectedAlert}
          onClose={() => setShowAlertDetails(false)}
          onAcknowledge={() => {}}
          onOpenLocation={() => handleOpenLiveLocation(selectedAlert)}
          isEmployee={true}
        />
      )}
      {showLiveLocation && (
        <Modal
          visible={showLiveLocation}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowLiveLocation(false)}>
          <LiveLocationScreen
            employeeId={locationEmployeeId}
            employeeName={locationEmployeeName}
            sosId={locationSosId}
            onBack={() => setShowLiveLocation(false)}
          />
        </Modal>
      )}
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
            adminId={`${userId}`}
            userName={userName || ""}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
