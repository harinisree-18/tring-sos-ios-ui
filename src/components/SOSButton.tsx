// src/components/SOSButton.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Vibration,
} from 'react-native';
import {useTranslation} from 'react-i18next';

const SOSButton = () => {
  const {t} = useTranslation();
  const handlePress = () => {
    Vibration.vibrate(1000); // Vibrate for 1 second
    Alert.alert(t('sos.emergencyAlertTitle'), t('sos.emergencyAlertMessage'), [
      {text: t('common.ok'), onPress: () => console.log('SOS acknowledged')},
    ]);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>{t('sos.sosButton')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'red',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default SOSButton;
