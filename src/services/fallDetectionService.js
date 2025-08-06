import { NativeModules, NativeEventEmitter, Platform, Alert, PermissionsAndroid } from 'react-native';
import { DeviceEventEmitter } from 'react-native';

const { FallDetectionModule } = NativeModules;

// Event names for global communication
export const FALL_DETECTION_EVENTS = {
  FALL_DETECTED: 'FALL_DETECTED',
  START_FALL_DETECTION: 'START_FALL_DETECTION',
  STOP_FALL_DETECTION: 'STOP_FALL_DETECTION'
};

class FallDetectionService {
  constructor() {
    // Only create NativeEventEmitter if the module exists and we're on Android
    if (Platform.OS === 'android' && FallDetectionModule) {
      this.eventEmitter = new NativeEventEmitter(FallDetectionModule);
    } else {
      this.eventEmitter = null;
    }
    this.fallListener = null;
    this.isMonitoring = false;
    this.userId = null;
  }

  setUserId(userId) {
    this.userId = userId;
  }

  async isSupported() {
    if (Platform.OS !== 'android' || !FallDetectionModule) return false;
    try {
      const result = await FallDetectionModule.isFallDetectionSupported();
      return result.supported;
    } catch (e) {
      return false;
    }
  }

  async start(onFallDetected, config = {}) {
    if (this.isMonitoring) return;
    if (!(await this.isSupported())) return;
    this.isMonitoring = true;

    const { fallThreshold = 15.0, impactThreshold = 20.0 } = config;

    if (config.fallThreshold || config.impactThreshold) {
      await FallDetectionModule.startFallDetectionWithConfig(fallThreshold, impactThreshold);
    } else {
      await FallDetectionModule.startFallDetection();
    }

    if (this.eventEmitter) {
      this.fallListener = this.eventEmitter.addListener('FallDetected', async (event) => {
        // Emit global event for EmployeeScreen to handle
        DeviceEventEmitter.emit(FALL_DETECTION_EVENTS.FALL_DETECTED, {
          ...event,
          userId: this.userId
        });

        if (onFallDetected) onFallDetected(event);
      });
    }
  }

  async stop() {
    if (!this.isMonitoring) return;
    await FallDetectionModule.stopFallDetection();
    if (this.fallListener) this.fallListener.remove();
    this.fallListener = null;
    this.isMonitoring = false;
  }

  isMonitoring() {
    return this.isMonitoring;
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      userId: this.userId,
      isSupported: this.isSupported()
    };
  }
}

const fallDetectionService = new FallDetectionService();
export default fallDetectionService; 
