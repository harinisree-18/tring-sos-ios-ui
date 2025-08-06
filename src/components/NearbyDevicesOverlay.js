import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

const NearbyDevicesOverlay = ({
    visible,
    nearbyDevices,
    crowdDensity,
    peopleNearby,
    onClose
}) => {
    const { t } = useTranslation();

    if (!visible) return null;

    const getCrowdDensityColor = (density) => {
        switch (density) {
            case 'high': return '#4CAF50';
            case 'medium': return '#FF9800';
            case 'low': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const getCrowdDensityIcon = (density) => {
        switch (density) {
            case 'high': return 'crowd';
            case 'medium': return 'group';
            case 'low': return 'person';
            default: return 'person-outline';
        }
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {t('map.nearbyDevices', 'Nearby Devices')}
                    </Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {/* Crowd Density Summary */}
                    <View style={styles.crowdSummary}>
                        <View style={styles.crowdMetric}>
                            <Icon
                                name={getCrowdDensityIcon(crowdDensity)}
                                size={24}
                                color={getCrowdDensityColor(crowdDensity)}
                            />
                            <View style={styles.crowdInfo}>
                                <Text style={styles.crowdLabel}>
                                    {t('map.crowdDensity', 'Crowd Density')}
                                </Text>
                                <Text style={[styles.crowdValue, { color: getCrowdDensityColor(crowdDensity) }]}>
                                    {crowdDensity.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.peopleCount}>
                            <Icon name="people" size={20} color="#2196F3" />
                            <Text style={styles.peopleCountText}>
                                {peopleNearby} {t('map.peopleNearby', 'people nearby')}
                            </Text>
                        </View>
                    </View>

                    {/* Nearby Devices List */}
                    <View style={styles.devicesSection}>
                        <Text style={styles.sectionTitle}>
                            {t('map.activeDevices', 'Active Safety Devices')}
                        </Text>

                        {nearbyDevices.length > 0 ? (
                            nearbyDevices.map((device, index) => (
                                <View key={device.id || index} style={styles.deviceItem}>
                                    <Icon name="smartphone" size={20} color="#4CAF50" />
                                    <View style={styles.deviceInfo}>
                                        <Text style={styles.deviceId}>
                                            {t('map.device', 'Device')} #{device.id}
                                        </Text>
                                        <Text style={styles.deviceTime}>
                                            {t('map.lastSeen', 'Last seen')}: {new Date(device.lastSeen).toLocaleTimeString()}
                                        </Text>
                                    </View>
                                    <View style={styles.deviceStatus}>
                                        <View style={styles.statusDot} />
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.noDevices}>
                                <Icon name="smartphone-off" size={24} color="#9E9E9E" />
                                <Text style={styles.noDevicesText}>
                                    {t('map.noNearbyDevices', 'No nearby safety devices')}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Safety Tips */}
                    <View style={styles.safetyTips}>
                        <Text style={styles.tipsTitle}>
                            {t('map.safetyTips', 'Safety Tips')}
                        </Text>

                        {crowdDensity === 'high' && (
                            <Text style={styles.tipText}>
                                ✅ {t('map.tipHighCrowd', 'High crowd density - safer area')}
                            </Text>
                        )}

                        {crowdDensity === 'low' && (
                            <Text style={styles.tipText}>
                                ⚠️ {t('map.tipLowCrowd', 'Low crowd density - stay alert')}
                            </Text>
                        )}

                        {peopleNearby < 3 && (
                            <Text style={styles.tipText}>
                                ⚠️ {t('map.tipFewPeople', 'Few people nearby - consider alternative route')}
                            </Text>
                        )}

                        {nearbyDevices.length > 5 && (
                            <Text style={styles.tipText}>
                                ✅ {t('map.tipManyDevices', 'Many safety devices nearby - good coverage')}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 20,
        maxHeight: '80%',
        width: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        padding: 16,
    },
    crowdSummary: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    crowdMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    crowdInfo: {
        marginLeft: 12,
        flex: 1,
    },
    crowdLabel: {
        fontSize: 14,
        color: '#666',
    },
    crowdValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    peopleCount: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    peopleCountText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    devicesSection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    deviceInfo: {
        flex: 1,
        marginLeft: 12,
    },
    deviceId: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    deviceTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    deviceStatus: {
        marginLeft: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
    },
    noDevices: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    noDevicesText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    safetyTips: {
        backgroundColor: '#e8f5e8',
        borderRadius: 8,
        padding: 12,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    tipText: {
        fontSize: 13,
        color: '#333',
        marginBottom: 4,
        lineHeight: 18,
    },
});

export default NearbyDevicesOverlay; 