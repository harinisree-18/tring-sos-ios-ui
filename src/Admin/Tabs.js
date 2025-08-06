import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import theme from '../utils/theme';

export default function Tabs({ activeTab, setActiveTab, pendingAlertsCount }) {
  const { t } = useTranslation();
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'alerts' && styles.activeTab,
          activeTab === 'alerts' && {
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          },
        ]}
        onPress={() => setActiveTab('alerts')}>
        <Icon
          name="warning"
          size={20}
          color={activeTab === 'alerts' ? '#fff' : '#666'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'alerts' && styles.activeTabText,
          ]}>
          {t('admin.alerts')}
        </Text>
        {pendingAlertsCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingAlertsCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'citizen' && styles.activeTab,
        ]}
        onPress={() => setActiveTab('citizen')}>
        <Icon
          name="people"
          size={20}
          color={activeTab === 'citizen' ? '#fff' : '#666'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'citizen' && styles.activeTabText,
          ]}>
          {t('admin.employee')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'maps' && styles.activeTab,
          activeTab === 'maps' && {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          },
        ]}
        onPress={() => setActiveTab('maps')}>
        <Icon
          name="map"
          size={20}
          color={activeTab === 'maps' ? '#fff' : '#666'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'maps' && styles.activeTabText,
          ]}>
          {t('admin.maps')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
    borderRadius: 10,
    marginHorizontal: 0,
    backgroundColor: '#fff',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: '#ff5252',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
