import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Modal,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import geofencingService from '../services/geofencingService';

const { width, height } = Dimensions.get('window');

const RouteSafetyAnalysis = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [routeAnalysis, setRouteAnalysis] = useState(null);
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadRouteAnalysis();
        }
    }, [visible]);

    const loadRouteAnalysis = async () => {
        setLoading(true);
        try {
            const analysis = geofencingService.getRouteSafetyAnalysis();
            setRouteAnalysis(analysis);
        } catch (error) {
            Alert.alert('Error', 'Failed to load route analysis');
        } finally {
            setLoading(false);
        }
    };

    const getSafetyColor = (score) => {
        if (score >= 80) return '#4CAF50';
        if (score >= 60) return '#FF9800';
        if (score >= 40) return '#FF5722';
        return '#F44336';
    };

    const getSafetyIcon = (score) => {
        if (score >= 80) return 'check-circle';
        if (score >= 60) return 'warning';
        if (score >= 40) return 'error';
        return 'dangerous';
    };

    const getSafetyLabel = (score) => {
        if (score >= 80) return t('route.safe', 'Safe');
        if (score >= 60) return t('route.moderate', 'Moderate');
        if (score >= 40) return t('route.risky', 'Risky');
        return t('route.dangerous', 'Dangerous');
    };

    const formatDistance = (meters) => {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        }
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const calculateRouteStats = () => {
        if (!routeAnalysis || !routeAnalysis.route.length) return null;

        const route = routeAnalysis.route;
        let totalDistance = 0;
        let totalTime = 0;
        let safeDistance = 0;
        let dangerDistance = 0;

        for (let i = 1; i < route.length; i++) {
            const prev = route[i - 1];
            const curr = route[i];

            const distance = geofencingService.calculateDistance(
                prev.latitude, prev.longitude,
                curr.latitude, curr.longitude
            );

            totalDistance += distance;

            const timeDiff = new Date(curr.timestamp) - new Date(prev.timestamp);
            totalTime += timeDiff / 1000; // Convert to seconds

            if (curr.safety.isInSafeZone) {
                safeDistance += distance;
            } else if (curr.safety.isInDangerZone) {
                dangerDistance += distance;
            }
        }

        return {
            totalDistance,
            totalTime,
            safeDistance,
            dangerDistance,
            safePercentage: (safeDistance / totalDistance) * 100,
            dangerPercentage: (dangerDistance / totalDistance) * 100,
        };
    };

    const renderSafetySegment = (point, index) => {
        const safety = point.safety;
        const color = getSafetyColor(safety.safetyScore);

        return (
            <TouchableOpacity
                key={index}
                style={[styles.safetySegment, { borderLeftColor: color }]}
                onPress={() => setSelectedSegment({ point, index })}
            >
                <View style={styles.segmentHeader}>
                    <Icon name={getSafetyIcon(safety.safetyScore)} size={20} color={color} />
                    <Text style={[styles.segmentSafetyLabel, { color }]}>
                        {getSafetyLabel(safety.safetyScore)}
                    </Text>
                    <Text style={styles.segmentTime}>
                        {new Date(point.timestamp).toLocaleTimeString()}
                    </Text>
                </View>

                <View style={styles.segmentDetails}>
                    <Text style={styles.segmentLocation}>
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Text>

                    {safety.recommendations.length > 0 && (
                        <Text style={styles.segmentRecommendation}>
                            {safety.recommendations[0]}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderRouteStats = () => {
        const stats = calculateRouteStats();
        if (!stats) return null;

        return (
            <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>{t('route.statistics', 'Route Statistics')}</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatDistance(stats.totalDistance)}</Text>
                        <Text style={styles.statLabel}>{t('route.totalDistance', 'Total Distance')}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{formatDuration(stats.totalTime)}</Text>
                        <Text style={styles.statLabel}>{t('route.totalTime', 'Total Time')}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                            {formatDistance(stats.safeDistance)}
                        </Text>
                        <Text style={styles.statLabel}>{t('route.safeDistance', 'Safe Distance')}</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: '#F44336' }]}>
                            {formatDistance(stats.dangerDistance)}
                        </Text>
                        <Text style={styles.statLabel}>{t('route.dangerDistance', 'Danger Distance')}</Text>
                    </View>
                </View>

                <View style={styles.safetyBar}>
                    <View style={styles.safetyBarContainer}>
                        <View
                            style={[styles.safetyBarSafe, { width: `${stats.safePercentage}%` }]}
                        />
                        <View
                            style={[styles.safetyBarDanger, { width: `${stats.dangerPercentage}%` }]}
                        />
                    </View>
                    <Text style={styles.safetyBarText}>
                        {Math.round(stats.safePercentage)}% {t('route.safe', 'Safe')} • {Math.round(stats.dangerPercentage)}% {t('route.dangerous', 'Dangerous')}
                    </Text>
                </View>
            </View>
        );
    };

    const renderSegmentDetail = () => {
        if (!selectedSegment) return null;

        const { point, index } = selectedSegment;
        const safety = point.safety;

        return (
            <Modal
                visible={!!selectedSegment}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedSegment(null)}
            >
                <View style={styles.detailOverlay}>
                    <View style={styles.detailContent}>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>
                                {t('route.segmentDetail', 'Route Segment Detail')}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedSegment(null)}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.detailBody}>
                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>
                                    {t('route.location', 'Location')}
                                </Text>
                                <Text style={styles.detailText}>
                                    Latitude: {point.latitude.toFixed(6)}
                                </Text>
                                <Text style={styles.detailText}>
                                    Longitude: {point.longitude.toFixed(6)}
                                </Text>
                                <Text style={styles.detailText}>
                                    Time: {new Date(point.timestamp).toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.detailSection}>
                                <Text style={styles.detailSectionTitle}>
                                    {t('route.safetyAnalysis', 'Safety Analysis')}
                                </Text>
                                <View style={styles.safetyScoreContainer}>
                                    <Text style={styles.safetyScoreLabel}>
                                        {t('route.safetyScore', 'Safety Score')}:
                                    </Text>
                                    <Text style={[styles.safetyScoreValue, { color: getSafetyColor(safety.safetyScore) }]}>
                                        {Math.round(safety.safetyScore)}%
                                    </Text>
                                </View>

                                <Text style={styles.detailText}>
                                    {t('route.status', 'Status')}: {getSafetyLabel(safety.safetyScore)}
                                </Text>

                                {safety.isInSafeZone && (
                                    <Text style={[styles.detailText, { color: '#4CAF50' }]}>
                                        ✅ {t('route.inSafeZone', 'Currently in safe zone')}
                                    </Text>
                                )}

                                {safety.isInDangerZone && (
                                    <Text style={[styles.detailText, { color: '#F44336' }]}>
                                        ⚠️ {t('route.inDangerZone', 'Currently in danger zone')}
                                    </Text>
                                )}
                            </View>

                            {safety.recommendations.length > 0 && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailSectionTitle}>
                                        {t('route.recommendations', 'Recommendations')}
                                    </Text>
                                    {safety.recommendations.map((rec, idx) => (
                                        <Text key={idx} style={styles.recommendationText}>
                                            • {rec}
                                        </Text>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        <Text style={styles.loadingText}>{t('route.loading', 'Loading route analysis...')}</Text>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {t('route.safetyAnalysis', 'Route Safety Analysis')}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {routeAnalysis && (
                        <>
                            {/* Overall Safety Summary */}
                            <View style={styles.summaryContainer}>
                                <View style={styles.summaryHeader}>
                                    <Icon
                                        name={getSafetyIcon(routeAnalysis.averageScore)}
                                        size={32}
                                        color={getSafetyColor(routeAnalysis.averageScore)}
                                    />
                                    <View style={styles.summaryText}>
                                        <Text style={styles.summaryTitle}>
                                            {t('route.overallSafety', 'Overall Safety')}
                                        </Text>
                                        <Text style={[styles.summaryScore, { color: getSafetyColor(routeAnalysis.averageScore) }]}>
                                            {Math.round(routeAnalysis.averageScore)}% - {getSafetyLabel(routeAnalysis.averageScore)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Route Statistics */}
                            {renderRouteStats()}

                            {/* Route Segments */}
                            <View style={styles.segmentsContainer}>
                                <Text style={styles.segmentsTitle}>
                                    {t('route.routeSegments', 'Route Segments')} ({routeAnalysis.route.length})
                                </Text>

                                {routeAnalysis.route.map((point, index) =>
                                    renderSafetySegment(point, index)
                                )}
                            </View>
                        </>
                    )}
                </ScrollView>

                {renderSegmentDetail()}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    summaryContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryText: {
        marginLeft: 12,
        flex: 1,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryScore: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 4,
    },
    statsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 16,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    safetyBar: {
        marginTop: 12,
    },
    safetyBarContainer: {
        height: 8,
        backgroundColor: '#eee',
        borderRadius: 4,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    safetyBarSafe: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    safetyBarDanger: {
        height: '100%',
        backgroundColor: '#F44336',
    },
    safetyBarText: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    segmentsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    segmentsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    safetySegment: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 4,
    },
    segmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    segmentSafetyLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        marginLeft: 8,
    },
    segmentTime: {
        fontSize: 12,
        color: '#666',
    },
    segmentDetails: {
        marginTop: 8,
    },
    segmentLocation: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    segmentRecommendation: {
        fontSize: 12,
        color: '#333',
        fontStyle: 'italic',
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
    },
    loadingText: {
        fontSize: 16,
        color: '#333',
    },
    detailOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        margin: 20,
        maxHeight: height * 0.8,
        width: width - 40,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    detailBody: {
        padding: 16,
    },
    detailSection: {
        marginBottom: 20,
    },
    detailSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    safetyScoreContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    safetyScoreLabel: {
        fontSize: 14,
        color: '#666',
    },
    safetyScoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    recommendationText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
        lineHeight: 20,
    },
});

export default RouteSafetyAnalysis; 