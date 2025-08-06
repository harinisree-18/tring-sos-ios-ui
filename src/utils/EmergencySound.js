import { NativeModules, Platform } from 'react-native';

const { EmergencySoundModule } = NativeModules;

class EmergencySound {
  static playEmergencySound() {
    if (Platform.OS === 'android') {
      EmergencySoundModule.playEmergencySound();
    }
  }

  static stopEmergencySound() {
    if (Platform.OS === 'android') {
      EmergencySoundModule.stopEmergencySound();
    }
  }
}

export default EmergencySound; 