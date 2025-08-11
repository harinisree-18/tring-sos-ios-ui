import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  playEmergencySound,
  stopEmergencySound,
  initializeSound,
  isEmergencySoundPlaying,
} from '../services/soundService';

const SoundTest = () => {
  const testSound = () => {
    console.log('Testing emergency sound...');
    console.log('Platform:', Platform.OS);
    console.log('Sound playing:', isEmergencySoundPlaying());
    
    try {
      playEmergencySound();
      Alert.alert('Success', 'Emergency sound should be playing now');
    } catch (error) {
      console.error('Error testing sound:', error);
      Alert.alert('Error', `Failed to play sound: ${error.message}`);
    }
  };

  const stopSound = () => {
    console.log('Stopping emergency sound...');
    try {
      stopEmergencySound();
      Alert.alert('Success', 'Emergency sound stopped');
    } catch (error) {
      console.error('Error stopping sound:', error);
      Alert.alert('Error', `Failed to stop sound: ${error.message}`);
    }
  };

  const reinitializeSound = () => {
    console.log('Reinitializing sound...');
    try {
      // Reset the sound service
      initializeSound();
      Alert.alert('Success', 'Sound service reinitialized');
    } catch (error) {
      console.error('Error reinitializing sound:', error);
      Alert.alert('Error', `Failed to reinitialize sound: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Sound Test</Text>
      <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
      
      <TouchableOpacity style={styles.button} onPress={testSound}>
        <Text style={styles.buttonText}>Test Emergency Sound</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={stopSound}>
        <Text style={styles.buttonText}>Stop Sound</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={reinitializeSound}>
        <Text style={styles.buttonText}>Reinitialize Sound</Text>
      </TouchableOpacity>
      
      <Text style={styles.status}>
        Sound Playing: {isEmergencySoundPlaying() ? 'Yes' : 'No'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#6a1b9a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default SoundTest;
