import {NativeModules, Platform} from 'react-native';

const {LocationTrackingModule} = NativeModules;

class LocationService {
  constructor() {
    this.isTracking = false;
  }

  /**
   * Start background location tracking
   * @param {string} employeeId - The employee ID
   * @param {string} sosId - The SOS alert ID
   * @returns {Promise<boolean>} - Success status
   */
  async startLocationTracking(employeeId, sosId) {
    if (Platform.OS !== 'android') {
      console.warn('Location tracking is only supported on Android');
      return false;
    }

    try {
      console.log('[LocationService] Starting background location tracking');
      const result = await LocationTrackingModule.startLocationTracking(
        employeeId,
        sosId,
      );
      this.isTracking = true;
      console.log(
        '[LocationService] Background location tracking started successfully',
      );
      return result;
    } catch (error) {
      console.error(
        '[LocationService] Error starting location tracking:',
        error,
      );
      this.isTracking = false;
      throw error;
    }
  }

  /**
   * Stop background location tracking
   * @returns {Promise<boolean>} - Success status
   */
  async stopLocationTracking() {
    if (Platform.OS !== 'android') {
      console.warn('Location tracking is only supported on Android');
      return false;
    }

    try {
      console.log('[LocationService] Stopping background location tracking');
      const result = await LocationTrackingModule.stopLocationTracking();
      this.isTracking = false;
      console.log(
        '[LocationService] Background location tracking stopped successfully',
      );
      return result;
    } catch (error) {
      console.error(
        '[LocationService] Error stopping location tracking:',
        error,
      );
      throw error;
    }
  }

  /**
   * Check if location tracking is currently active
   * @returns {boolean} - Tracking status
   */
  isLocationTrackingActive() {
    return this.isTracking;
  }
}

export default new LocationService();
