import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';
import theme from '../utils/theme';

export default function Header({
  onLogout,
  onMutePress,
  isAlertPlaying,
  onLanguagePress,
}) {
  const {t} = useTranslation();

  const handleLogout = () => {
    Alert.alert(
      t('common.confirmLogout'),
      t('common.logoutMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: onLogout,
        },
      ],
      {cancelable: true}
    );
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{t('admin.securityAdmin')}</Text>
      <View style={styles.buttonContainer}>
        {/* <TouchableOpacity
          style={[styles.iconButton, styles.muteButton]}
          onPress={onMutePress}>
          <Icon
            name={isAlertPlaying ? 'volume-up' : 'volume-off'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[styles.iconButton, styles.languageButton]}
          onPress={onLanguagePress}>
          <Icon name="language" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.logoutButton]}
          onPress={handleLogout}>
          <Icon name="logout" size={20} color="#fff" />
          <Text style={styles.buttonText}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
    flexWrap: 'wrap',
    maxWidth: 160,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  muteButton: {
    backgroundColor: '#ff5252',
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  languageButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginLeft: 4,
  },
});
