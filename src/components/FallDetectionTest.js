import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import fallDetectionService from '../services/fallDetectionService';

const FallDetectionTest = () => {
    const [status, setStatus] = useState(null);
    const [isSupported, setIsSupported] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const supported = await fallDetectionService.isSupported();
            setIsSupported(supported);
            setIsMonitoring(fallDetectionService.isMonitoring());

            setStatus({
                supported,
                monitoring: fallDetectionService.isMonitoring(),
                userId: fallDetectionService.userId,
            });
        } catch (error) {
            console.error('Error checking fall detection status:', error);
        }
    };

    const testFallDetection = async () => {
        try {
            if (!isSupported) {
                Alert.alert('Not Supported', 'Fall detection is not supported on this device');
                return;
            }

            if (!fallDetectionService.userId) {
                Alert.alert('No User ID', 'Please log in first to test fall detection');
                return;
            }

            Alert.alert(
                'Test Fall Detection',
                'This will simulate a fall detection event and trigger an SOS alert. Continue?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Test',
                        onPress: async () => {
                            try {
                                await fallDetectionService.sendSOSAlert();
                                Alert.alert('Success', 'Test SOS alert sent successfully!');
                            } catch (error) {
                                Alert.alert('Error', `Failed to send test SOS alert: ${error.message}`);
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert('Error', `Test failed: ${error.message}`);
        }
    };

    const toggleMonitoring = async () => {
        try {
            if (isMonitoring) {
                await fallDetectionService.stop();
                setIsMonitoring(false);
                Alert.alert('Stopped', 'Fall detection monitoring stopped');
            } else {
                if (!fallDetectionService.userId) {
                    Alert.alert('No User ID', 'Please log in first to start fall detection');
                    return;
                }
                await fallDetectionService.start((event) => {
                    Alert.alert('Fall Detected!', `Severity: ${event.severity}\nAcceleration: ${event.acceleration}`);
                });
                setIsMonitoring(true);
                Alert.alert('Started', 'Fall detection monitoring started');
            }
            checkStatus();
        } catch (error) {
            Alert.alert('Error', `Failed to toggle monitoring: ${error.message}`);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Fall Detection Test</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Status:</Text>
                <Text style={styles.statusText}>
                    Supported: {isSupported ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.statusText}>
                    Monitoring: {isMonitoring ? 'Yes' : 'No'}
                </Text>
                <Text style={styles.statusText}>
                    User ID: {fallDetectionService.userId || 'Not set'}
                </Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={checkStatus}>
                <Text style={styles.buttonText}>Refresh Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, !isSupported && styles.buttonDisabled]}
                onPress={toggleMonitoring}
                disabled={!isSupported}
            >
                <Text style={styles.buttonText}>
                    {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.testButton]}
                onPress={testFallDetection}
            >
                <Text style={styles.buttonText}>Test SOS Alert</Text>
            </TouchableOpacity>

            {status && (
                <View style={styles.debugContainer}>
                    <Text style={styles.debugTitle}>Debug Info:</Text>
                    <Text style={styles.debugText}>
                        {JSON.stringify(status, null, 2)}
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
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
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
        fontSize: 16,
        marginBottom: 5,
        color: '#666',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    testButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    debugContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginTop: 20,
    },
    debugTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    debugText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
    },
});

export default FallDetectionTest; 