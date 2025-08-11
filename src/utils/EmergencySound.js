import { NativeModules, Platform } from 'react-native';
import { playEmergencySound as playSound, stopEmergencySound as stopSound } from '../services/soundService';

const { EmergencySoundModule } = NativeModules;

class EmergencySound {
  static playEmergencySound() {
    if (Platform.OS === 'android') {
      EmergencySoundModule.playEmergencySound();
    } else {
      // Use the sound service for iOS
      playSound();
    }
  }

  static stopEmergencySound() {
    if (Platform.OS === 'android') {
      EmergencySoundModule.stopEmergencySound();
    } else {
      // Use the sound service for iOS
      stopSound();
    }
  }
}

export default EmergencySound; 