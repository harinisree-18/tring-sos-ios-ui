import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SOSLocationModule } = NativeModules;

class SOSLocationService {
    constructor() {
        this.eventEmitter = new NativeEventEmitter(SOSLocationModule);
        this.isInitialized = false;
    }

    /**
     * Initialize the SOS system with user info and emergency contacts
     * @param {Object} userInfo - User information
     * @param {string} userInfo.name - User's name
     * @param {string} userInfo.phone - User's phone number
     * @param {string} userInfo.emergencyMessage - Custom emergency message
     * @param {Array} emergencyContacts - Array of emergency contacts
     * @param {string} emergencyContacts[].name - Contact name
     * @param {string} emergencyContacts[].phone - Contact phone number
     * @param {string} emergencyContacts[].relationship - Relationship to user
     * @returns {Promise<boolean>} - Success status
     */
    async initializeSOS(userInfo, emergencyContacts) {
        try {
            if (!SOSLocationModule) {
                throw new Error('SOSLocationModule not available');
            }

            await SOSLocationModule.initializeSOS(userInfo, emergencyContacts);
            this.isInitialized = true;

            console.log('SOS system initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize SOS system:', error);
            throw error;
        }
    }

    /**
     * Start the background SOS service for continuous location tracking
     * @returns {Promise<boolean>} - Success status
     */
    async startBackgroundService() {
        try {
            if (!this.isInitialized) {
                throw new Error('SOS system not initialized. Call initializeSOS first.');
            }

            await SOSLocationModule.startBackgroundService();
            console.log('Background SOS service started');
            return true;
        } catch (error) {
            console.error('Failed to start background SOS service:', error);
            throw error;
        }
    }

    /**
     * Stop the background SOS service
     * @returns {Promise<boolean>} - Success status
     */
    async stopBackgroundService() {
        try {
            await SOSLocationModule.stopBackgroundService();
            console.log('Background SOS service stopped');
            return true;
        } catch (error) {
            console.error('Failed to stop background SOS service:', error);
            throw error;
        }
    }

    /**
     * Trigger an SOS alert (works even when app is offline)
     * @returns {Promise<boolean>} - Success status
     */
    async triggerSOSAlert() {
        try {
            if (!this.isInitialized) {
                throw new Error('SOS system not initialized. Call initializeSOS first.');
            }

            await SOSLocationModule.triggerSOSAlert();
            console.log('SOS alert triggered successfully');
            return true;
        } catch (error) {
            console.error('Failed to trigger SOS alert:', error);
            throw error;
        }
    }

    /**
     * Send an immediate SOS alert with current location
     * @returns {Promise<Object>} - Result with success status and details
     */
    async sendSOSAlert() {
        try {
            if (!this.isInitialized) {
                throw new Error('SOS system not initialized. Call initializeSOS first.');
            }

            const result = await SOSLocationModule.sendSOSAlert();
            console.log('SOS alert sent:', result);
            return result;
        } catch (error) {
            console.error('Failed to send SOS alert:', error);
            throw error;
        }
    }

    /**
     * Update the last known location
     * @returns {Promise<void>}
     */
    async updateLastKnownLocation() {
        try {
            await SOSLocationModule.updateLastKnownLocation();
            console.log('Last known location updated');
        } catch (error) {
            console.error('Failed to update last known location:', error);
            throw error;
        }
    }

    /**
     * Get the last known location
     * @returns {Promise<Object|null>} - Location data or null
     */
    async getLastKnownLocation() {
        try {
            const location = await SOSLocationModule.getLastKnownLocation();
            return location;
        } catch (error) {
            console.error('Failed to get last known location:', error);
            throw error;
        }
    }

    /**
     * Check if network is available
     * @returns {Promise<boolean>} - Network availability
     */
    async isNetworkAvailable() {
        try {
            const isAvailable = await SOSLocationModule.isNetworkAvailable();
            return isAvailable;
        } catch (error) {
            console.error('Failed to check network availability:', error);
            return false;
        }
    }

    /**
     * Add event listener for SOS events
     * @param {string} eventName - Event name to listen for
     * @param {Function} callback - Callback function
     * @returns {Function} - Remove listener function
     */
    addEventListener(eventName, callback) {
        const subscription = this.eventEmitter.addListener(eventName, callback);
        return () => subscription.remove();
    }

    /**
     * Get location accuracy description
     * @param {number} accuracy - Accuracy in meters
     * @returns {string} - Accuracy description
     */
    getAccuracyDescription(accuracy) {
        if (accuracy <= 5) return 'Very High (≤5m)';
        if (accuracy <= 10) return 'High (≤10m)';
        if (accuracy <= 50) return 'Medium (≤50m)';
        if (accuracy <= 100) return 'Low (≤100m)';
        return 'Very Low (>100m)';
    }

    /**
     * Get location source description
     * @param {string} source - Location source
     * @returns {string} - Source description
     */
    getSourceDescription(source) {
        switch (source) {
            case 'GPS':
                return 'GPS Satellite';
            case 'Network':
                return 'Cell Tower/Network';
            case 'cached':
                return 'Stored Location';
            default:
                return source || 'Unknown';
        }
    }

    /**
     * Format location for display
     * @param {Object} location - Location data
     * @returns {Object} - Formatted location data
     */
    formatLocation(location) {
        if (!location) return null;

        return {
            ...location,
            accuracyDescription: this.getAccuracyDescription(location.accuracy),
            sourceDescription: this.getSourceDescription(location.source),
            googleMapsUrl: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
            appleMapsUrl: `http://maps.apple.com/?q=${location.latitude},${location.longitude}`,
            formattedCoordinates: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        };
    }

    /**
     * Check if SOS system is ready
     * @returns {boolean} - Ready status
     */
    isReady() {
        return this.isInitialized && Platform.OS === 'android';
    }

    /**
     * Get system status
     * @returns {Promise<Object>} - System status
     */
    async getSystemStatus() {
        try {
            const [isNetworkAvailable, lastLocation] = await Promise.all([
                this.isNetworkAvailable(),
                this.getLastKnownLocation()
            ]);

            return {
                isInitialized: this.isInitialized,
                isNetworkAvailable,
                hasLastLocation: !!lastLocation,
                lastLocationAge: lastLocation ? this.calculateLocationAge(lastLocation.timestamp) : null,
                platform: Platform.OS,
                isReady: this.isReady()
            };
        } catch (error) {
            console.error('Failed to get system status:', error);
            return {
                isInitialized: this.isInitialized,
                isNetworkAvailable: false,
                hasLastLocation: false,
                lastLocationAge: null,
                platform: Platform.OS,
                isReady: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate location age in minutes
     * @param {string} timestamp - ISO timestamp
     * @returns {number} - Age in minutes
     */
    calculateLocationAge(timestamp) {
        try {
            const locationTime = new Date(timestamp);
            const now = new Date();
            const ageMs = now.getTime() - locationTime.getTime();
            return Math.floor(ageMs / 60000); // Convert to minutes
        } catch (error) {
            return -1;
        }
    }
}

// Create singleton instance
const sosLocationService = new SOSLocationService();

export default sosLocationService; 