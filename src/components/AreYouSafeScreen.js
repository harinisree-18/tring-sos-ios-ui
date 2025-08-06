import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
  NativeModules,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundLocationService from '../services/backgroundLocationService';

const SNOOZE_OPTIONS = [
  {label: '15 minutes', value: 15 * 60 * 1000},
  {label: '30 minutes', value: 30 * 60 * 1000},
  {label: '1 hour', value: 60 * 60 * 1000},
  {label: '2 hours', value: 2 * 60 * 60 * 1000},
  {label: '4 hours', value: 4 * 60 * 60 * 1000},
  {label: '8 hours', value: 8 * 60 * 60 * 1000},
  {label: '12 hours', value: 12 * 60 * 60 * 1000},
  {label: '24 hours', value: 24 * 60 * 60 * 1000},
];

const EMERGENCY_NUMBER = '93610xxxxx';

function validatePhoneNumber(phone) {
  // Remove non-digits and check length (10-15 digits)
  const cleaned = ('' + phone).replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

const AreYouSafeScreen = ({callBack, onTriggerSOS, isFallDetection= false}) => {
  const [answer, setAnswer] = useState(null);
  const [showSnooze, setShowSnooze] = useState(false);
  const [thanksMessage, setThanksMessage] = useState('');

  useEffect(() => {
    if (answer === 'Yes') {
      setThanksMessage('Thanks for confirming.');
      if (isFallDetection) {
        setShowSnooze(false);
        if (callBack) callBack();
      } else {
        setShowSnooze(true);
      }
    } else if (answer === 'No') {
      setThanksMessage('');
      setShowSnooze(false);
      handleNoPressed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  const handleSnooze = async snoozeMs => {
    if (NativeModules?.IntentLauncher?.clearInitialIntent) {
      try {
        await NativeModules.IntentLauncher.clearInitialIntent();
      } catch (e) {
        console.log('Failed to clear intent', e);
      }
    }
    if (callBack) callBack(snoozeMs);
  };

  const handleNoPressed = async () => {
    try {
      const hasNetwork = await backgroundLocationService.isNetworkAvailable();
      if (!hasNetwork) {
        // Request SMS permission if needed
        if (NativeModules?.IntentLauncher?.clearInitialIntent) {
          try {
            await NativeModules.IntentLauncher.clearInitialIntent();
          } catch (e) {
            console.log('Failed to clear intent', e);
          }
        }
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            {
              title: 'SMS Permission',
              message:
                'This app needs SMS permission to send emergency messages.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              'Permission Denied',
              'SMS permission is required to send emergency messages.',
            );
            return;
          }
        }
        // Get latest location
        const loc = await backgroundLocationService.getLatestLocation();
        let message = 'I am not in safe place. Please help!';
        if (loc && loc.latitude && loc.longitude) {
          message += ` My location: https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
        }
        // Get numbers from AsyncStorage
        let numbers = [];
        try {
          const numbersStr = await AsyncStorage.getItem('numbers');
        //   console.log("numbers", numbersStr);
          if (numbersStr) {
            const parsed = Array.isArray(numbersStr)
              ? numbersStr
              : JSON.parse(numbersStr);
            if (Array.isArray(parsed)) {
              numbers = parsed.filter(validatePhoneNumber);
            }
          }
        } catch (e) {
          console.log('Error:', e);
          // fallback: no numbers
        }
        let smsUrl;
        if (numbers.length > 0) {
          smsUrl = `sms:${numbers.join(',')}${
            Platform.OS === 'ios' ? '&' : '?'
          }body=${encodeURIComponent(message)}`;
        } else {
          smsUrl = `sms:${
            Platform.OS === 'ios' ? '&' : '?'
          }body=${encodeURIComponent(message)}`;
        }
        Linking.openURL(smsUrl)
          .then(() => {
            Alert.alert(
              'Emergency SMS',
              numbers.length > 0
                ? `Emergency SMS sent (or ready to send) to: ${numbers.join(
                    ', ',
                  )}`
                : 'Emergency SMS ready to send (no contacts found, please add emergency contacts).',
            );
          })
          .catch(err => {
            Alert.alert('Error', 'Failed to open SMS app: ' + err.message);
          });
        if (callBack) callBack();
      } else {
        // Set Firebase update interval to 1 minute
        if (NativeModules?.IntentLauncher?.clearInitialIntent) {
          try {
            await NativeModules.IntentLauncher.clearInitialIntent();
          } catch (e) {
            console.log('Failed to clear intent', e);
          }
        }
        await backgroundLocationService.setFirebaseUpdateInterval(60000);
        if (onTriggerSOS) {
          onTriggerSOS();
        } else {
          Alert.alert(
            'Network Available',
            'Network is available. Please use the app to send your alert.',
          );
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to send emergency SMS: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>Are you safe?</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.yesButton]}
          onPress={() => setAnswer('Yes')}>
          <Text style={styles.buttonText}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.noButton]}
          onPress={() => setAnswer('No')}>
          <Text style={styles.buttonText}>No</Text>
        </TouchableOpacity>
      </View>
      {answer && <Text style={styles.answerText}>You answered: {answer}</Text>}
      {thanksMessage ? (
        <Text style={styles.thanksText}>{thanksMessage}</Text>
      ) : null}
      {showSnooze && (
        <View style={styles.snoozeContainer}>
          <Text style={styles.snoozeLabel}>Snooze safe notification for:</Text>
          <View style={styles.snoozeOptionsRow}>
            {SNOOZE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.snoozeOption}
                onPress={() => handleSnooze(opt.value)}>
                <Text style={styles.snoozeOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginHorizontal: 12,
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  answerText: {
    fontSize: 22,
    color: '#333',
    marginTop: 16,
  },
  thanksText: {
    fontSize: 20,
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  snoozeContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  snoozeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  snoozeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  snoozeOption: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 6,
  },
  snoozeOptionText: {
    color: '#6a1b9a',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default AreYouSafeScreen;
