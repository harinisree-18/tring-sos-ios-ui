import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';
import { useSSR, useTranslation } from 'react-i18next';
import theme from '../utils/theme';
import api from '../components/config/axios';

export default function AlertItem({
  item,
  onPress,
  onLongPress,
  onLiveLocation,
  onOpenStream,
}) {
  const { t } = useTranslation();
  const [userToggles, setUserToggles] = useState({ isAudioAllowed: true, isVideoAllowed: true });

  useEffect(() => {
    async function fetchToggles(userId) {
      try {
        const res = await api.get(`/users/${userId}`);
        setUserToggles({
          isAudioAllowed: res.data.isAudioAllowed,
          isVideoAllowed: res.data.isVideoAllowed,
        });
      } catch (e) {
        setUserToggles({ isAudioAllowed: true, isVideoAllowed: true });
      }
    }
    if (item?.userId) fetchToggles(item.userId);
  }, [item?.userId]);

  // Add logic to check if alert is new (within last hour)
  const isNew = (() => {
    if (!item.createdAt) return false;
    const created = new Date(item.createdAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour in ms
    return created > oneHourAgo;
  })();

  const getStatusConfig = () => {
  if (item.status === 'pending') {
    return item.is_live === false
      ? {
        borderColor: '#FF9800',
        backgroundColor: '#FFE8CC', // Slightly darker orange background
        shadowColor: '#FF9800',
        iconBg: '#FF9800',
        iconColor: '#fff',
        icon: 'warning',
        tagColor: '#FF9800',
      }
      : {
        borderColor: '#e53935',
        backgroundColor: '#FFD1D1', // Slightly darker red background
        shadowColor: '#e53935',
        iconBg: '#e53935',
        iconColor: '#fff',
        icon: 'warning',
        tagColor: '#e53935',
      };
  }
  return {
    borderColor: '#4CAF50',
    backgroundColor: '#E0F2E0', // Slightly darker green background
    shadowColor: '#4CAF50',
    iconBg: '#4CAF50',
    iconColor: '#fff',
    icon: 'check-circle',
    tagColor: '#4CAF50',
  };
};

  const statusConfig = getStatusConfig();
  const firstLetter = item.userName ? item.userName.charAt(0).toUpperCase() : 'U';

  const handleShare = async () => {
    try {
      const personName = item.userName || item.employeeName || t('admin.unknownEmployee');
      const alertTime = format(parseISO(item.createdAt), 'MMM dd, yyyy - hh:mm a');
      
      // Debug: Log the location data to see its structure
      console.log('Alert item location data:', JSON.stringify(item.location, null, 2));
      
      // Create location link if coordinates are available
      let locationLink = '';
      
      // Check for different possible location data structures
      let locationData = item.location;
      
      // If location is a string, try to parse it as JSON
      if (typeof item.location === 'string') {
        try {
          locationData = JSON.parse(item.location);
        } catch (e) {
          console.log('Failed to parse location JSON:', e);
        }
      }
      
      if (locationData) {
        if (locationData.coordinates && Array.isArray(locationData.coordinates) && locationData.coordinates.length === 2) {
          // GeoJSON Point format: [longitude, latitude]
          const [longitude, latitude] = locationData.coordinates;
          locationLink = `\n📍 Location: https://maps.google.com/?q=${latitude},${longitude}`;
        } else if (locationData.coordinates && locationData.coordinates.latitude && locationData.coordinates.longitude) {
          // Object format: {latitude, longitude}
          const { latitude, longitude } = locationData.coordinates;
          locationLink = `\n📍 Location: https://maps.google.com/?q=${latitude},${longitude}`;
        } else if (locationData.latitude && locationData.longitude) {
          // Direct latitude/longitude on location object
          locationLink = `\n📍 Location: https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}`;
        } else if (locationData.address) {
          locationLink = `\n📍 Location: ${locationData.address}`;
        } else if (locationData.lat && locationData.lng) {
          // Alternative coordinate property names
          locationLink = `\n📍 Location: https://maps.google.com/?q=${locationData.lat},${locationData.lng}`;
        }
      }

      const shareMessage = `🚨 SOS Alert\n\n👤 Person: ${personName}\n⏰ Time: ${alertTime}${locationLink}\n\nShared from Women's Safety App`;
      
      // Debug: Log the final share message
      console.log('Share message:', shareMessage);

      const result = await Share.share({
        message: shareMessage,
        title: 'SOS Alert',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log('Shared with activity type:', result.activityType);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing alert:', error);
      Alert.alert(t('common.error'), t('common.shareFailed'));
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: statusConfig.backgroundColor,
            ...(item.status !== 'pending' && { opacity: 0.7 }),
          },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.95}>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.userInfoSection}>
              <View style={[styles.userIcon, { backgroundColor: '#fff' }]}>
                <Text style={styles.userIconText}>{firstLetter}</Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.employeeName}>
                  {item.userName || item.employeeName || t('admin.unknownEmployee')}
                </Text>
                <View style={styles.timeSection}>
                  <Icon name="access-time" size={13} color="#757575" style={{ marginRight: 4 }} />
                  <Text style={styles.cardTime}>
                    {format(parseISO(item.createdAt), 'MMM dd, hh:mm a')}
                  </Text>
                </View>
              </View>
            </View>
            {item.status && (
              <View style={[styles.statusTag, { backgroundColor: statusConfig.tagColor }]}>
                <Text style={styles.statusTagText}>
                  {item.status === 'pending' ? t('admin.activeAlert') : t('admin.acknowledged')}
                </Text>
              </View>
            )}
          </View>

          {/* <View style={styles.details}>
            {item.location && item.location.address && (
              <Text style={{ fontSize: 12, color: '#757575', fontWeight: '600', marginTop: 2, marginLeft: 2 }}>
                {item.location.address}
              </Text>
            )}
          </View> */}

          <View style={styles.buttonSection}>
            <View style={styles.leftButtons}>
              {item.location && (
                <TouchableOpacity
                  style={[styles.locationButton, { borderRadius: 5, paddingVertical: 6, paddingHorizontal: 8, flex: 1 }]}
                  onPress={e => {
                    e.stopPropagation && e.stopPropagation();
                    onLiveLocation();
                  }}
                  activeOpacity={0.7}>
                  <Icon name="location-on" size={14} color={theme.colors.accent} />
                  <Text style={[styles.locationButtonText, { fontSize: 11, marginLeft: 4 }]}>
                    {t('admin.liveLocation')}
                  </Text>
                </TouchableOpacity>
              )}
              {(item.is_live !== false && (userToggles.isAudioAllowed || userToggles.isVideoAllowed)) && (
                <TouchableOpacity
                  style={[styles.streamButton, { borderRadius: 5, paddingHorizontal: 10, paddingVertical: 6, flex: 1 }]}
                  onPress={() => onOpenStream && onOpenStream(item)}
                  activeOpacity={0.8}>
                  <Icon name="videocam" size={14} color="#fff" />
                  <Text style={[styles.streamButtonText, { fontSize: 11, marginLeft: 4 }]}>
                    {t('admin.liveMonitor', 'LIVE MONITOR')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.shareButton, { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6 }]}
              onPress={e => {
                e.stopPropagation && e.stopPropagation();
                handleShare();
              }}
              activeOpacity={0.7}>
              <Icon name="share" size={14} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>

          {item?.acknowledgedByName && (
            <View style={styles.acknowledgedSection}>
              <View style={[styles.acknowledgedBadge, { borderRadius: 8, paddingHorizontal: 10 }]}>
                <Icon name="verified" size={14} color="#4CAF50" />
                <Text style={[styles.acknowledgedText, { fontSize: 11, marginLeft: 4 }]}>
                  {t('admin.acknowledgedBy', { name: item.acknowledgedByName })}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 5,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    flexDirection: 'column',
    marginLeft: 12,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  details: {
    marginBottom: 8,
  },
  cardTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  employeeId: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  buttonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 2,
    marginRight: 8,
  },
  locationButtonText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 4,
    textAlign: 'center',
  },
  streamButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  streamButtonText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  acknowledgedSection: {},
  acknowledgedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  acknowledgedText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shareButtonText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 4,
  },
});