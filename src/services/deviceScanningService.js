import api from '../components/config/axios';
import { PermissionsAndroid, Platform } from 'react-native';

class DeviceScanningService {
    constructor() {
        this.scanningInterval = null;
        this.nearbyDevices = [];
        this.scanRadius = 500; // meters
        this.scanInterval = 30000; // 30 seconds
        this.isScanning = false;
        this.currentLocation = null;
        this.deviceCache = new Map(); // Cache for device data
        this.lastScanTime = null;
    }

    // Start device scanning
    async startScanning(latitude, longitude) {
        if (this.isScanning) return;

        this.currentLocation = { latitude, longitude };
        this.isScanning = true;

        // Request necessary permissions
        await this.requestPermissions();

        // Start scanning immediately
        await this.scanForDevices();

        // Set up periodic scanning
        this.scanningInterval = setInterval(async () => {
            await this.scanForDevices();
        }, this.scanInterval);

        console.log('Device scanning started');
    }

    // Stop device scanning
    stopScanning() {
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
            this.scanningInterval = null;
        }
        this.isScanning = false;
        console.log('Device scanning stopped');
    }

    // Request necessary permissions for device scanning
    async requestPermissions() {
        if (Platform.OS === 'android') {
            const permissions = [
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_WIFI_STATE,
                PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_STATE
            ];

            for (const permission of permissions) {
                try {
                    const granted = await PermissionsAndroid.request(permission, {
                        title: 'Device Scanning Permission',
                        message: 'This app needs to scan for nearby safety devices',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    });

                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.warn(`Permission denied: ${permission}`);
                    }
                } catch (error) {
                    console.error(`Error requesting permission ${permission}:`, error);
                }
            }
        }
    }

    // Main device scanning method
    async scanForDevices() {
        if (!this.currentLocation) return;

        try {
            const { latitude, longitude } = this.currentLocation;
            this.lastScanTime = new Date();

            // Multiple scanning methods for comprehensive coverage
            const [
                networkDevices,
                bluetoothDevices,
                wifiDevices,
                backendDevices
            ] = await Promise.allSettled([
                this.scanNetworkDevices(latitude, longitude),
                this.scanBluetoothDevices(latitude, longitude),
                this.scanWifiDevices(latitude, longitude),
                this.fetchBackendDevices(latitude, longitude)
            ]);

            // Combine and deduplicate devices
            const allDevices = this.combineDeviceData([
                networkDevices.status === 'fulfilled' ? networkDevices.value : [],
                bluetoothDevices.status === 'fulfilled' ? bluetoothDevices.value : [],
                wifiDevices.status === 'fulfilled' ? wifiDevices.value : [],
                backendDevices.status === 'fulfilled' ? backendDevices.value : []
            ]);

            // Filter devices within scan radius
            this.nearbyDevices = this.filterDevicesByDistance(allDevices, latitude, longitude);

            // Update device cache
            this.updateDeviceCache(this.nearbyDevices);

            console.log(`Found ${this.nearbyDevices.length} nearby devices`);

        } catch (error) {
            console.error('Error scanning for devices:', error);
        }
    }

    // Scan for devices on the same network
    async scanNetworkDevices(latitude, longitude) {
        try {
            // This would use network discovery protocols
            // For now, we'll simulate network device discovery
            const networkDevices = [
                {
                    id: `network_${Date.now()}_1`,
                    type: 'network',
                    latitude: latitude + (Math.random() - 0.5) * 0.001,
                    longitude: longitude + (Math.random() - 0.5) * 0.001,
                    lastSeen: new Date().toISOString(),
                    signalStrength: Math.random() * 100,
                    deviceType: 'smartphone',
                    safetyApp: true
                }
            ];

            return networkDevices;
        } catch (error) {
            console.error('Network scanning error:', error);
            return [];
        }
    }

    // Scan for Bluetooth devices
    async scanBluetoothDevices(latitude, longitude) {
        try {
            // This would use Bluetooth Low Energy (BLE) scanning
            // For now, we'll simulate Bluetooth device discovery
            const bluetoothDevices = [
                {
                    id: `ble_${Date.now()}_1`,
                    type: 'bluetooth',
                    latitude: latitude + (Math.random() - 0.5) * 0.001,
                    longitude: longitude + (Math.random() - 0.5) * 0.001,
                    lastSeen: new Date().toISOString(),
                    signalStrength: Math.random() * 100,
                    deviceType: 'smartphone',
                    safetyApp: true,
                    bleName: 'SafetyApp_User'
                }
            ];

            return bluetoothDevices;
        } catch (error) {
            console.error('Bluetooth scanning error:', error);
            return [];
        }
    }

    // Scan for WiFi devices
    async scanWifiDevices(latitude, longitude) {
        try {
            // This would use WiFi scanning capabilities
            // For now, we'll simulate WiFi device discovery
            const wifiDevices = [
                {
                    id: `wifi_${Date.now()}_1`,
                    type: 'wifi',
                    latitude: latitude + (Math.random() - 0.5) * 0.001,
                    longitude: longitude + (Math.random() - 0.5) * 0.001,
                    lastSeen: new Date().toISOString(),
                    signalStrength: Math.random() * 100,
                    deviceType: 'smartphone',
                    safetyApp: true,
                    ssid: 'SafetyNetwork'
                }
            ];

            return wifiDevices;
        } catch (error) {
            console.error('WiFi scanning error:', error);
            return [];
        }
    }

    // Fetch devices from backend API
    async fetchBackendDevices(latitude, longitude) {
        try {
            const response = await api.get('/nearby-devices', {
                params: {
                    latitude,
                    longitude,
                    radius: this.scanRadius,
                    timestamp: new Date().toISOString()
                }
            });

            return response.data || [];
        } catch (error) {
            console.error('Backend device fetch error:', error);
            return [];
        }
    }

    // Combine and deduplicate device data from multiple sources
    combineDeviceData(deviceArrays) {
        const deviceMap = new Map();

        deviceArrays.flat().forEach(device => {
            const key = device.id;

            if (deviceMap.has(key)) {
                // Update existing device with latest data
                const existing = deviceMap.get(key);
                deviceMap.set(key, {
                    ...existing,
                    ...device,
                    lastSeen: new Date(Math.max(
                        new Date(existing.lastSeen).getTime(),
                        new Date(device.lastSeen).getTime()
                    )).toISOString()
                });
            } else {
                deviceMap.set(key, device);
            }
        });

        return Array.from(deviceMap.values());
    }

    // Filter devices by distance from current location
    filterDevicesByDistance(devices, latitude, longitude) {
        return devices.filter(device => {
            const distance = this.calculateDistance(
                latitude, longitude,
                device.latitude, device.longitude
            );
            return distance <= this.scanRadius;
        });
    }

    // Update device cache with new data
    updateDeviceCache(devices) {
        devices.forEach(device => {
            this.deviceCache.set(device.id, {
                ...device,
                lastUpdated: new Date().toISOString()
            });
        });

        // Clean up old cache entries (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        for (const [key, value] of this.deviceCache.entries()) {
            if (new Date(value.lastUpdated) < fiveMinutesAgo) {
                this.deviceCache.delete(key);
            }
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    // Get nearby devices
    getNearbyDevices() {
        return this.nearbyDevices;
    }

    // Get device statistics
    getDeviceStatistics() {
        const devices = this.nearbyDevices;

        return {
            totalDevices: devices.length,
            byType: {
                network: devices.filter(d => d.type === 'network').length,
                bluetooth: devices.filter(d => d.type === 'bluetooth').length,
                wifi: devices.filter(d => d.type === 'wifi').length,
                backend: devices.filter(d => d.type === 'backend').length
            },
            byDeviceType: {
                smartphone: devices.filter(d => d.deviceType === 'smartphone').length,
                tablet: devices.filter(d => d.deviceType === 'tablet').length,
                wearable: devices.filter(d => d.deviceType === 'wearable').length
            },
            safetyAppUsers: devices.filter(d => d.safetyApp).length,
            averageSignalStrength: devices.length > 0
                ? devices.reduce((sum, d) => sum + (d.signalStrength || 0), 0) / devices.length
                : 0,
            lastScanTime: this.lastScanTime
        };
    }

    // Update current location
    updateLocation(latitude, longitude) {
        this.currentLocation = { latitude, longitude };
    }

    // Get scanning status
    getScanningStatus() {
        return {
            isScanning: this.isScanning,
            scanRadius: this.scanRadius,
            scanInterval: this.scanInterval,
            lastScanTime: this.lastScanTime,
            deviceCount: this.nearbyDevices.length
        };
    }

    // Configure scanning parameters
    configureScanning(config) {
        if (config.scanRadius) {
            this.scanRadius = config.scanRadius;
        }
        if (config.scanInterval) {
            this.scanInterval = config.scanInterval;
        }
    }
}

export default new DeviceScanningService(); 