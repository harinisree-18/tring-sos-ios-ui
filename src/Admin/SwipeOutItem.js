import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {format, parseISO} from 'date-fns';
import {useTranslation} from 'react-i18next';

export default function SwipeOutItem({item}) {
  const {t} = useTranslation();
  return (
    <View style={[styles.card, styles.swipeOutCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.swipeOutIcon}>
          <Icon name="exit-to-app" size={24} color="#fff" />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{t('admin.swipeOutRecord')}</Text>
          <Text style={styles.cardTime}>
            {format(parseISO(item.timestamp), 'MMM dd, hh:mm a')}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon name="person" size={16} color="#666" />
          <Text style={styles.infoText}>
            {item.employeeName || t('admin.unknownEmployee')}
            {item.employeeId && ` (ID: ${item.employeeId})`}
          </Text>
        </View>

        {item.location && (
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color="#666" />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>
        )}

        {item.reason && (
          <View style={styles.infoRow}>
            <Icon name="info" size={16} color="#666" />
            <Text style={styles.infoText}>
              {t('admin.reason')}: {item.reason}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  swipeOutCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#2196F3',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardHeaderText: {
    flex: 1,
  },
  swipeOutIcon: {
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});
