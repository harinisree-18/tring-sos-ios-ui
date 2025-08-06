import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import sosLocationService from '../services/sosLocationService';

const SOSLocationExample = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isServiceRunning, setIsServiceRunning] = useState(false);
    const [systemStatus, setSystemStatus] = useState(null);
    const [lastLocation, setLastLocation] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkPermissions();
        checkSystemStatus();
    }, []);

    const checkPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const permissions = [
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.SEND_SMS,
                ];

                const results = await PermissionsAndroid.requestMultiple(permissions);

                const allGranted = Object.values(results).every(
                    result => result === PermissionsAndroid.RESULTS.GRANTED
                );

                if (!allGranted) {
                    Alert.alert(
                        'Permissions Required',
                        'This app needs location and SMS permissions to function properly for emergency situations.',
                        [{ text: 'OK' }]
                    );
                }
            } catch (error) {
                console.error('Error requesting permissions:', error);
            }
        }
    };

    const checkSystemStatus = async () => {
        try {
            const status = await sosLocationService.getSystemStatus();
            setSystemStatus(status);
            setIsInitialized(status.isInitialized);
        } catch (error) {
            console.error('Error checking system status:', error);
        }
    };

    const initializeSOS = async () => {
        setLoading(true);
        try {
            // Example user info and emergency contacts
            const userInfo = {
                name: 'Jane Doe',
                phone: '+1234567890',
                emergencyMessage: 'I am in danger and need immediate help!',
            };

            const emergencyContacts = [
                {
                    name: 'Emergency Contact 1',
                    phone: '+1234567891',
                    relationship: 'Family',
                },
                {
                    name: 'Emergency Contact 2',
                    phone: '+1234567892',
                    relationship: 'Friend',
                },
            ];

            await sosLocationService.initializeSOS(userInfo, emergencyContacts);
            setIsInitialized(true);
            Alert.alert('Success', 'SOS system initialized successfully!');

            // Check status again
            await checkSystemStatus();
        } catch (error) {
            Alert.alert('Error', `Failed to initialize SOS: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const startBackgroundService = async () => {
        setLoading(true);
        try {
            await sosLocationService.startBackgroundService();
            setIsServiceRunning(true);
            Alert.alert('Success', 'Background SOS service started!');
        } catch (error) {
            Alert.alert('Error', `Failed to start background service: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const stopBackgroundService = async () => {
        setLoading(true);
        try {
            await sosLocationService.stopBackgroundService();
            setIsServiceRunning(false);
            Alert.alert('Success', 'Background SOS service stopped!');
        } catch (error) {
            Alert.alert('Error', `Failed to stop background service: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const triggerSOSAlert = async () => {
        Alert.alert(
            'Trigger SOS Alert',
            'This will send an emergency SMS to all configured contacts. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SOS',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await sosLocationService.triggerSOSAlert();
                            Alert.alert('Success', 'SOS alert triggered successfully!');
                        } catch (error) {
                            Alert.alert('Error', `Failed to trigger SOS alert: ${error.message}`);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const sendImmediateSOS = async () => {
        Alert.alert(
            'Send Immediate SOS',
            'This will send an immediate SOS alert with current location. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SOS',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const result = await sosLocationService.sendSOSAlert();
                            Alert.alert(
                                'SOS Sent',
                                `SOS alert sent to ${result.totalContacts} contacts.\n` +
                                `Failed: ${result.failedContacts}\n` +
                                `Location Source: ${result.locationSource}\n` +
                                `Location Age: ${result.locationAgeMinutes} minutes`
                            );
                        } catch (error) {
                            Alert.alert('Error', `Failed to send SOS alert: ${error.message}`);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const updateLocation = async () => {
        setLoading(true);
        try {
            await sosLocationService.updateLastKnownLocation();
            const location = await sosLocationService.getLastKnownLocation();
            setLastLocation(location);
            Alert.alert('Success', 'Location updated successfully!');
        } catch (error) {
            Alert.alert('Error', `Failed to update location: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getLocation = async () => {
        setLoading(true);
        try {
            const location = await sosLocationService.getLastKnownLocation();
            setLastLocation(location);
            if (location) {
                const formattedLocation = sosLocationService.formatLocation(location);
                Alert.alert(
                    'Location Info',
                    `Coordinates: ${formattedLocation.formattedCoordinates}\n` +
                    `Accuracy: ${formattedLocation.accuracyDescription}\n` +
                    `Source: ${formattedLocation.sourceDescription}\n` +
                    `Timestamp: ${new Date(location.timestamp).toLocaleString()}`
                );
            } else {
                Alert.alert('No Location', 'No location data available.');
            }
        } catch (error) {
            Alert.alert('Error', `Failed to get location: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderSystemStatus = () => {
        if (!systemStatus) return null;

        return (
            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>System Status:</Text>
                <Text style={styles.statusText}>
                    Initialized: {systemStatus.isInitialized ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    Network: {systemStatus.isNetworkAvailable ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    Location: {systemStatus.hasLastLocation ? '✅' : '❌'}
                </Text>
                <Text style={styles.statusText}>
                    Platform: {systemStatus.platform}
                </Text>
                <Text style={styles.statusText}>
                    Ready: {systemStatus.isReady ? '✅' : '❌'}
                </Text>
                {systemStatus.lastLocationAge !== null && (
                    <Text style={styles.statusText}>
                        Location Age: {systemStatus.lastLocationAge} minutes
                    </Text>
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>

            {renderSystemStatus()}

            <View style={styles.buttonContainer}>
                {!isInitialized ? (
                    <TouchableOpacity
                        style={[styles.button, styles.primaryButton]}
                        onPress={initializeSOS}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Initialize SOS System</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.button, isServiceRunning ? styles.stopButton : styles.startButton]}
                            onPress={isServiceRunning ? stopBackgroundService : startBackgroundService}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    {isServiceRunning ? 'Stop Background Service' : 'Start Background Service'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.locationButton]}
                            onPress={updateLocation}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Update Location</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.locationButton]}
                            onPress={getLocation}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Get Last Location</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.sosButton]}
                            onPress={triggerSOSAlert}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Trigger SOS Alert (Background)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.emergencyButton]}
                            onPress={sendImmediateSOS}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>Send Immediate SOS</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {lastLocation && (
                <View style={styles.locationContainer}>
                    <Text style={styles.locationTitle}>Last Known Location:</Text>
                    <Text style={styles.locationText}>
                        {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
                    </Text>
                    <Text style={styles.locationText}>
                        Accuracy: {lastLocation.accuracy?.toFixed(0)}m
                    </Text>
                    <Text style={styles.locationText}>
                        Source: {lastLocation.source}
                    </Text>
                    <Text style={styles.locationText}>
                        Time: {new Date(lastLocation.timestamp).toLocaleString()}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    statusContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    statusText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666',
    },
    buttonContainer: {
        gap: 15,
    },
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    startButton: {
        backgroundColor: '#34C759',
    },
    stopButton: {
        backgroundColor: '#FF3B30',
    },
    locationButton: {
        backgroundColor: '#5856D6',
    },
    sosButton: {
        backgroundColor: '#FF9500',
    },
    emergencyButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    locationContainer: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    locationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    locationText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#666',
    },
});

export default SOSLocationExample; 