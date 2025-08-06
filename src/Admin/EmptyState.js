import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

export default function EmptyState({activeTab}) {
  const {t} = useTranslation();
  return (
    <View style={styles.emptyState}>
      <Icon
        name={activeTab === 'alerts' ? 'notifications-off' : 'exit-to-app'}
        size={48}
        color="#ccc"
      />
      <Text style={styles.emptyStateText}>
        {activeTab === 'alerts'
          ? t('admin.noActiveAlerts')
          : t('admin.noSwipeOutRecords')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});
