import {NativeModules, Platform} from 'react-native';

const {BackgroundLocationModule, IntentLauncher} = NativeModules;

const backgroundLocationService = {
  /**
   * Start the background location tracking service
   * @returns {Promise<boolean>} Success status
   */
  async start() {
    if (Platform.OS !== 'android' || !BackgroundLocationModule) {
      console.warn('Background location service not available on this platform');
      return false;
    }
    try {
      await BackgroundLocationModule.startBackgroundLocation();
      return true;
    } catch (error) {
      console.error('Failed to start background location service:', error);
      return false;
    }
  },

  /**
   * Stop the background location tracking service
   * @returns {Promise<boolean>} Success status
   */
  async stop() {
    if (Platform.OS !== 'android' || !BackgroundLocationModule) {
      console.warn('Background location service not available on this platform');
      return false;
    }
    try {
      await BackgroundLocationModule.stopBackgroundLocation();
      return true;
    } catch (error) {
      console.error('Failed to stop background location service:', error);
      return false;
    }
  },

  /**
   * Get the latest background location
   * @returns {Promise<Object|null>} Latest location object or null
   */
  async getLatestLocation() {
    try {
      const locationJson =
        await BackgroundLocationModule.getLatestBackgroundLocation();
      return locationJson ? JSON.parse(locationJson) : null;
    } catch (error) {
      console.error('Failed to get latest background location:', error);
      return null;
    }
  },

  /**
   * Set the routes for background tracking
   * @param {Array} routesArray - Array of route objects (with from, to, time1, time2)
   * @returns {Promise<boolean>} Success status
   */
  async setRoutesForTracking(routesArray) {
    if (Platform.OS !== 'android' || !BackgroundLocationModule) {
      console.warn('Background location service not available on this platform');
      return false;
    }
    try {
      const routesJson = JSON.stringify(routesArray);
      await BackgroundLocationModule.setRoutesForTracking(routesJson);
      console.log('Routes set for background tracking:', routesArray);
      return true;
    } catch (error) {
      console.error('Failed to set routes for background tracking:', error);
      return false;
    }
  },

  /**
   * Set the user ID for background location updates
   * @param {string} userId
   * @returns {Promise<boolean>} Success status
   */
  async setUserId(userId) {
    if (Platform.OS !== 'android' || !BackgroundLocationModule) {
      console.warn('Background location service not available on this platform');
      return false;
    }
    try {
      await BackgroundLocationModule.setUserId(userId);
      return true;
    } catch (error) {
      console.error('Failed to set user ID for background location:', error);
      return false;
    }
  },

  /**
   * Set the snooze until timestamp for safe notifications
   * @param {number} snoozeUntilMs - Timestamp in ms
   * @returns {Promise<boolean>} Success status
   */
  async setSnoozeUntil(snoozeUntilMs) {
    try {
      if (BackgroundLocationModule?.setSnoozeUntil) {
        await BackgroundLocationModule.setSnoozeUntil(snoozeUntilMs);
      } else if (IntentLauncher?.setSnoozeUntil) {
        await IntentLauncher.setSnoozeUntil(snoozeUntilMs);
      }
      return true;
    } catch (error) {
      console.error('Failed to set snooze until:', error);
      return false;
    }
  },

  /**
   * Check if network is available (calls native module)
   * @returns {Promise<boolean>} true if network is available, false otherwise
   */
  async isNetworkAvailable() {
    try {
      if (BackgroundLocationModule?.isNetworkAvailable) {
        return await BackgroundLocationModule.isNetworkAvailable();
      }
      return false;
    } catch (error) {
      console.error('Failed to check network availability:', error);
      return false;
    }
  },

  /**
   * Set the interval for Firebase location updates (in ms)
   * @param {number} intervalMs
   * @returns {Promise<boolean>}
   */
  async setFirebaseUpdateInterval(intervalMs) {
    try {
      if (BackgroundLocationModule?.setFirebaseUpdateInterval) {
        await BackgroundLocationModule.setFirebaseUpdateInterval(intervalMs);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set Firebase update interval:', error);
      return false;
    }
  },

  /**
   * Clear the background location SharedPreferences (native)
   * @returns {Promise<boolean>} Success status
   */
  async clearPreferences() {
    try {
      if (BackgroundLocationModule?.clearBackgroundLocationPreferences) {
        await BackgroundLocationModule.clearBackgroundLocationPreferences();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to clear background location preferences:', error);
      return false;
    }
  },
};

export default backgroundLocationService;
