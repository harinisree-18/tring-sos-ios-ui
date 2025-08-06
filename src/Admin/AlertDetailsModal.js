import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import theme from '../utils/theme';
import { stopEmergencySound, isEmergencySoundPlaying } from '../services/soundService';

export default function AlertDetailsModal({
  visible,
  alert,
  onClose,
  onAcknowledge,
  onOpenLocation,
  isEmployee = false
}) {
  const { t } = useTranslation();
  if (!alert) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.detailsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('admin.alertDetails')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.alertId')}:</Text>
              <Text style={styles.detailValue}>{alert.id.substring(0, 8)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.employee')}:</Text>
              <Text style={styles.detailValue}>
                {alert.employeeName} (ID: {alert.userId || alert.employeeId })
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.status')}:</Text>
              <Text
                style={[
                  styles.detailValue,
                  alert.status === 'pending'
                    ? styles.pendingStatus
                    : styles.acknowledgedStatus,
                ]}>
                {t('admin.' + alert.status, alert.status.toUpperCase())}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.time')}:</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(alert.createdAt), 'MMM dd, yyyy - hh:mm a')}
              </Text>
            </View>

            {/* <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('admin.location')}:</Text>
              <TouchableOpacity onPress={() => onOpenLocation(alert.location)}>
                <Text style={[styles.detailValue, styles.locationText]}>
                  {alert.location?.address ||
                    (alert.location?.coordinates
                      ? t('admin.viewOnMap')
                      : typeof alert.location === 'string'
                        ? alert.location
                        : t('admin.unknown'))}
                </Text>
              </TouchableOpacity>
            </View> */}

            {alert.additionalNotes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('admin.notes')}:</Text>
                <Text style={styles.detailValue}>{alert.additionalNotes}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            {(alert.status === 'pending' && !isEmployee) && (
              <TouchableOpacity
                style={[styles.modalButton, styles.acknowledgeButton]}
                onPress={() => {
                  if (isEmergencySoundPlaying()) {
                    stopEmergencySound();
                  }
                  onAcknowledge(alert.id);
                  onClose();
                }}>
                <Icon
                  name="check"
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.modalButtonText}>
                  {t('admin.acknowledge')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalButton, styles.liveLocationButton]}
              onPress={() => onOpenLocation(alert.location)}
              disabled={!alert.location}>
              <Icon
                name="location-on"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.modalButtonText}>
                {t('admin.liveLocation')}
              </Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={onClose}>
              <Text style={styles.modalButtonText}>{t('common.close')}</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  detailsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  pendingStatus: {
    color: '#ff5252',
    fontWeight: 'bold',
  },
  acknowledgedStatus: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    columnGap: 10,
    paddingHorizontal: 18
  },
  modalButton: {
    flex: 1,
    padding: 7,
    borderRadius: 4,
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: theme.colors.primary,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3
  },
  liveLocationButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3
  },
  closeButton: {
    backgroundColor: '#555',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  locationText: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
});
