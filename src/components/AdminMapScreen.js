import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Dimensions,
    SafeAreaView,
    StatusBar,
    TextInput,
    ActivityIndicator,
    FlatList,
    Modal,
} from 'react-native';
import MapView, {
    Marker,
    Circle,
    PROVIDER_DEFAULT,
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import api from './config/axios';
import theme from '../utils/theme';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

const AdminMapScreen = ({ userId, onBack, userName = "Admin" }) => {
    const { t } = useTranslation();
    const mapRef = useRef(null);

    // Map state
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isLocationLoading, setIsLocationLoading] = useState(true);

    // Safety zones state
    const [safetyZones, setSafetyZones] = useState([]);
    const [dangerZones, setDangerZones] = useState([]);
    const [isLoadingZones, setIsLoadingZones] = useState(true);

    // Zone visibility toggles
    const [showSafetyZones, setShowSafetyZones] = useState(true);
    const [showDangerZones, setShowDangerZones] = useState(true);

    // Zone creation state
    const [isCreatingZone, setIsCreatingZone] = useState(false);
    const [zoneCreationMode, setZoneCreationMode] = useState(null); // 'safe' or 'danger'
    const [zoneCenter, setZoneCenter] = useState(null);
    const [zoneRadius, setZoneRadius] = useState(500);
    const [zoneName, setZoneName] = useState('');
    const [zoneDescription, setZoneDescription] = useState('');
    const [showZoneCreationModal, setShowZoneCreationModal] = useState(false);
    const [showZoneManagementModal, setShowZoneManagementModal] = useState(false);

    // Zone editing state
    const [editingZone, setEditingZone] = useState(null);
    const [showZoneEditModal, setShowZoneEditModal] = useState(false);

    // Search state
    const [destination, setDestination] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [showPlaceDetails, setShowPlaceDetails] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [tappedLocation, setTappedLocation] = useState(null);
    const [isLoadingPlaceInfo, setIsLoadingPlaceInfo] = useState(false);

    useEffect(() => {
        getCurrentLocation();
        fetchAllZones();
    }, []);

    const getCurrentLocation = () => {
        setIsLocationLoading(true);

        if (!Geolocation) {
            console.error('Geolocation service is not available');
            Alert.alert(
                'Location Error',
                'Location services are not available on this device',
            );
            setIsLocationLoading(false);
            return;
        }

        Geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                const location = {
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString(),
                };
                setCurrentLocation(location);

                // Center map on current location
                if (mapRef.current) {
                    mapRef.current.animateToRegion({
                        latitude,
                        longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    });
                }

                // Stop loading
                setIsLocationLoading(false);
            },
            error => {
                console.error('Error getting current position:', error);
                Alert.alert('Location Error', 'Could not get your current location');
                setIsLocationLoading(false);
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
            },
        );
    };

    const fetchAllZones = async () => {
        try {
            setIsLoadingZones(true);
            const response = await api.get('/safety-zones');
            const zones = response.data;

            const safeZones = zones.filter(zone => zone.type === 'safe');
            const dangerZones = zones.filter(zone => zone.type === 'danger');

            setSafetyZones(safeZones);
            setDangerZones(dangerZones);
        } catch (error) {
            console.error('Error fetching zones:', error);
            Alert.alert('Error', 'Failed to load safety zones');
        } finally {
            setIsLoadingZones(false);
        }
    };

    const startZoneCreation = (mode) => {
        setZoneCreationMode(mode);
        setIsCreatingZone(true);
        setZoneName('');
        setZoneDescription('');
        setZoneRadius(500);
        setZoneCenter(null);
        Alert.alert(
            'Create Zone',
            `Tap on the map to set the center of your ${mode === 'safe' ? 'safety' : 'danger'} zone`,
            [{ text: 'OK' }],
        );
    };

    const handleMapPress = (event) => {
        if (!isCreatingZone) return;

        try {
            if (event && event.nativeEvent && event.nativeEvent.coordinate) {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setZoneCenter({ latitude, longitude });
                setShowZoneCreationModal(true);
                setIsCreatingZone(false);
            }
        } catch (error) {
            console.error('Error handling map press:', error);
        }
    };

    const createZone = async () => {
        if (!zoneCenter || !zoneName.trim()) {
            Alert.alert('Error', 'Please provide a zone name and center location');
            return;
        }

        try {
            const zoneData = {
                name: zoneName.trim(),
                description: zoneDescription.trim(),
                type: zoneCreationMode,
                latitude: zoneCenter.latitude,
                longitude: zoneCenter.longitude,
                radius: zoneRadius,
                is_active: true,
            };

            const response = await api.post('/safety-zones', zoneData);
            const newZone = response.data;

            if (zoneCreationMode === 'safe') {
                setSafetyZones(prev => [...prev, newZone]);
            } else {
                setDangerZones(prev => [...prev, newZone]);
            }

            setShowZoneCreationModal(false);
            setZoneCenter(null);
            setZoneName('');
            setZoneDescription('');
            setZoneRadius(500);
            setZoneCreationMode(null);

            Alert.alert('Success', `${zoneCreationMode === 'safe' ? 'Safety' : 'Danger'} zone created successfully!`);
        } catch (error) {
            console.error('Error creating zone:', error);
            Alert.alert('Error', 'Failed to create zone. Please try again.');
        }
    };

    const editZone = async () => {
        if (!editingZone || !zoneName.trim()) {
            Alert.alert('Error', 'Please provide a zone name');
            return;
        }

        try {
            const zoneData = {
                name: zoneName.trim(),
                description: zoneDescription.trim(),
                radius: zoneRadius,
            };

            const response = await api.patch(`/safety-zones/${editingZone.id}`, zoneData);
            const updatedZone = response.data;

            if (editingZone.type === 'safe') {
                setSafetyZones(prev => prev.map(zone => zone.id === editingZone.id ? updatedZone : zone));
            } else {
                setDangerZones(prev => prev.map(zone => zone.id === editingZone.id ? updatedZone : zone));
            }

            setShowZoneEditModal(false);
            setEditingZone(null);
            setZoneName('');
            setZoneDescription('');
            setZoneRadius(500);

            Alert.alert('Success', 'Zone updated successfully!');
        } catch (error) {
            console.error('Error updating zone:', error);
            Alert.alert('Error', 'Failed to update zone. Please try again.');
        }
    };

    const deleteZone = (zone) => {
        Alert.alert(
            'Delete Zone',
            `Are you sure you want to delete "${zone.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/safety-zones/${zone.id}`);

                            if (zone.type === 'safe') {
                                setSafetyZones(prev => prev.filter(z => z.id !== zone.id));
                            } else {
                                setDangerZones(prev => prev.filter(z => z.id !== zone.id));
                            }

                            Alert.alert('Success', 'Zone deleted successfully!');
                        } catch (error) {
                            console.error('Error deleting zone:', error);
                            Alert.alert('Error', 'Failed to delete zone. Please try again.');
                        }
                    },
                },
            ],
        );
    };

    const openZoneEdit = (zone) => {
        setEditingZone(zone);
        setZoneName(zone.name);
        setZoneDescription(zone.description || '');
        setZoneRadius(zone.radius);
        setShowZoneEditModal(true);
    };

    const centerOnUser = () => {
        if (mapRef.current && currentLocation) {
            mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        } else {
            getCurrentLocation();
        }
    };

    const toggleSafetyZones = () => {
        setShowSafetyZones(!showSafetyZones);
    };

    const toggleDangerZones = () => {
        setShowDangerZones(!showDangerZones);
    };

    const getZoneIcon = (type) => {
        return type === 'safe' ? 'security' : 'warning';
    };

    const getZoneColor = (type) => {
        return type === 'safe' ? '#4CAF50' : '#F44336';
    };

    const getZoneFillColor = (type) => {
        return type === 'safe' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)';
    };

    const getZoneStrokeColor = (type) => {
        return type === 'safe' ? '#4CAF50' : '#F44336';
    };

    const searchDestination = async query => {
        console.log('Searching for:', query);

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        // Set a new timeout for debounced search
        const timeout = setTimeout(async () => {
            console.log('Executing search for:', query);
            setIsSearching(true);
            setShowSearchResults(true);

            try {
                // Try multiple search APIs for better reliability
                const results = await tryMultipleSearchAPIs(query);
                console.log('Final search results:', results);
                setSearchResults(results);
            } catch (error) {
                console.error('Error searching destination:', error);

                // Fallback: Create a mock result for testing
                if (query.trim().length > 2) {
                    console.log('Creating fallback result for:', query);
                    const fallbackResults = [
                        {
                            id: `fallback_${Date.now()}`,
                            name: `${query} - Sample Location`,
                            latitude: currentLocation?.latitude + 0.001 || 15.2993,
                            longitude: currentLocation?.longitude + 0.001 || 74.1240,
                            type: 'unknown',
                            address: {},
                            importance: 0.5,
                            category: 'unknown',
                        },
                    ];
                    setSearchResults(fallbackResults);
                } else {
                    setSearchResults([]);
                }
            } finally {
                setIsSearching(false);
            }
        }, 500); // Increased delay to reduce API calls

        setSearchTimeout(timeout);
    };

    const tryMultipleSearchAPIs = async query => {
        const searchApis = [
            {
                name: 'Nominatim Primary',
                url: `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query,
                )}&limit=8&addressdetails=1&countrycodes=in`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            },
            {
                name: 'Nominatim Global',
                url: `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query,
                )}&limit=8&addressdetails=1`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            },
            {
                name: 'Nominatim Simple',
                url: `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    query,
                )}&limit=5`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                },
            },
        ];

        for (const api of searchApis) {
            try {
                console.log(`Trying ${api.name}...`);

                const response = await fetch(api.url, {
                    method: 'GET',
                    headers: api.headers,
                    timeout: 8000, // 8 second timeout
                });

                console.log(`${api.name} response status:`, response.status);

                if (!response.ok) {
                    console.warn(`${api.name} failed with status:`, response.status);
                    continue;
                }

                const contentType = response.headers.get('content-type');
                console.log(`${api.name} Content-Type:`, contentType);

                if (!contentType || !contentType.includes('application/json')) {
                    console.warn(`${api.name} returned non-JSON response`);
                    continue;
                }

                const data = await response.json();
                console.log(`${api.name} raw response:`, data);

                if (!Array.isArray(data)) {
                    console.warn(`${api.name} returned non-array data:`, data);
                    continue;
                }

                if (data.length === 0) {
                    console.log(`${api.name} returned empty results`);
                    continue;
                }

                const results = data.map(item => ({
                    id: item.place_id,
                    name: item.display_name,
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                    type: item.type || 'unknown',
                    address: item.address || {},
                    importance: item.importance || 0.1,
                    category: item.category || 'unknown',
                }));

                console.log(`${api.name} successful with ${results.length} results`);
                return results;
            } catch (error) {
                console.error(`${api.name} error:`, error);
                continue;
            }
        }

        // If all APIs fail, throw error
        throw new Error('All search APIs failed');
    };

    const getPlaceInfoFromCoordinates = async (latitude, longitude) => {
        setIsLoadingPlaceInfo(true);
        try {
            console.log('Getting place info for:', latitude, longitude);

            // Try multiple reverse geocoding APIs for better reliability
            const placeInfo = await tryMultipleReverseGeocodingAPIs(
                latitude,
                longitude,
            );
            console.log('Final place info:', placeInfo);
            return placeInfo;
        } catch (error) {
            console.error('Error getting place info:', error);
            // Fallback for errors
            return {
                id: `custom_${Date.now()}`,
                name: `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                latitude: latitude,
                longitude: longitude,
                type: 'unknown',
                address: {},
                importance: 0.1,
                category: 'unknown',
            };
        } finally {
            setIsLoadingPlaceInfo(false);
        }
    };

    const tryMultipleReverseGeocodingAPIs = async (latitude, longitude) => {
        const reverseApis = [
            {
                name: 'Nominatim Detailed',
                url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            },
            {
                name: 'Nominatim Simple',
                url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                },
            },
            {
                name: 'Nominatim Basic',
                url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'WomenSOS/1.0',
                },
            },
        ];

        for (const api of reverseApis) {
            try {
                console.log(`Trying reverse ${api.name}...`);

                const response = await fetch(api.url, {
                    method: 'GET',
                    headers: api.headers,
                    timeout: 8000, // 8 second timeout
                });

                console.log(`Reverse ${api.name} response status:`, response.status);

                if (!response.ok) {
                    console.warn(
                        `Reverse ${api.name} failed with status:`,
                        response.status,
                    );
                    continue;
                }

                const contentType = response.headers.get('content-type');
                console.log(`Reverse ${api.name} Content-Type:`, contentType);

                if (!contentType || !contentType.includes('application/json')) {
                    console.warn(`Reverse ${api.name} returned non-JSON response`);
                    continue;
                }

                const data = await response.json();
                console.log(`Reverse ${api.name} raw response:`, data);

                if (!data || !data.display_name) {
                    console.warn(`Reverse ${api.name} returned invalid data`);
                    continue;
                }

                const placeInfo = {
                    id: data.place_id || `reverse_${Date.now()}`,
                    name: data.display_name,
                    latitude: parseFloat(data.lat),
                    longitude: parseFloat(data.lon),
                    type: data.type || 'unknown',
                    address: data.address || {},
                    importance: data.importance || 0.1,
                    category: data.category || 'unknown',
                };

                console.log(`Reverse ${api.name} successful:`, placeInfo);
                return placeInfo;
            } catch (error) {
                console.error(`Reverse ${api.name} error:`, error);
                continue;
            }
        }

        // If all APIs fail, throw error
        throw new Error('All reverse geocoding APIs failed');
    };

    const selectDestination = async result => {
        // Close search results immediately
        setShowSearchResults(false);
        setSearchResults([]);

        // Set destination text
        setDestination(result.name);

        // Immediately set loading state and show basic modal (same as map tap)
        setIsLoadingPlaceInfo(true);
        setTappedLocation({ latitude: result.latitude, longitude: result.longitude });

        // Create immediate fallback place info
        const immediatePlaceInfo = {
            id: result.id || `search_${Date.now()}`,
            name: result.name,
            latitude: result.latitude,
            longitude: result.longitude,
            type: result.type || 'unknown',
            address: result.address || {},
            importance: result.importance || 0.1,
            category: result.category || 'unknown',
        };

        setSelectedPlace(immediatePlaceInfo);
        setShowPlaceDetails(true);

        try {
            // Get detailed place information for selected location (same as map tap)
            const detailedPlaceInfo = await getPlaceInfoFromCoordinates(
                result.latitude,
                result.longitude,
            );

            // Update with detailed info
            setSelectedPlace(detailedPlaceInfo);
            setIsLoadingPlaceInfo(false);
        } catch (error) {
            console.error(
                'Error getting detailed place info for search result:',
                error,
            );
            // Keep the basic modal with search result info
            setIsLoadingPlaceInfo(false);
        }

        // Center map on selected place
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: result.latitude,
                longitude: result.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const clearSearch = () => {
        setDestination('');
        setSearchResults([]);
        setShowSearchResults(false);
        setShowPlaceDetails(false);
        setSelectedPlace(null);
        setTappedLocation(null);
    };

    const getPlaceTypeIcon = type => {
        switch (type) {
            case 'restaurant':
            case 'cafe':
                return 'restaurant';
            case 'hospital':
            case 'clinic':
                return 'local-hospital';
            case 'school':
            case 'university':
                return 'school';
            case 'bank':
                return 'account-balance';
            case 'gas_station':
                return 'local-gas-station';
            case 'hotel':
            case 'motel':
                return 'hotel';
            case 'shopping':
            case 'mall':
                return 'shopping-cart';
            case 'residential':
                return 'home';
            case 'commercial':
                return 'business';
            case 'industrial':
                return 'factory';
            case 'park':
            case 'garden':
                return 'park';
            case 'road':
            case 'street':
                return 'directions';
            default:
                return 'place';
        }
    };

    const getAddressComponents = address => {
        if (!address) return [];

        const components = [];
        if (address.house_number)
            components.push(`${address.house_number} ${address.road || ''}`);
        if (address.road && !address.house_number) components.push(address.road);
        if (address.suburb) components.push(address.suburb);
        if (address.city) components.push(address.city);
        if (address.state) components.push(address.state);
        if (address.postcode) components.push(address.postcode);
        if (address.country) components.push(address.country);

        return components.filter(Boolean);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#6a1b9a" />

            {/* Location Loading Screen */}
            {isLocationLoading && (
                <View style={styles.locationLoadingContainer}>
                    <View style={styles.locationLoadingContent}>
                        <ActivityIndicator size="large" color="#6a1b9a" />
                        <Text style={styles.locationLoadingText}>
                            Getting your location...
                        </Text>
                        <Text style={styles.locationLoadingSubtext}>
                            Please wait while we find your position
                        </Text>
                    </View>
                </View>
            )}

            {/* Header with Controls */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Map</Text>
                </View>
                <View style={styles.headerButtons}>
                    {/* Safety Zones Toggle */}
                    <TouchableOpacity
                        style={[styles.headerButton, showSafetyZones && styles.headerButtonActive]}
                        onPress={toggleSafetyZones}
                    >
                        <Icon name="security" size={24} color={showSafetyZones ? "#FFFFFF" : "#4CAF50"} />
                    </TouchableOpacity>

                    {/* Danger Zones Toggle */}
                    <TouchableOpacity
                        style={[styles.headerButton, showDangerZones && styles.headerButtonActive]}
                        onPress={toggleDangerZones}
                    >
                        <Icon name="warning" size={24} color={showDangerZones ? "#FFFFFF" : "#F44336"} />
                    </TouchableOpacity>

                    {/* Create Zone Button */}
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => Alert.alert(
                            'Create Zone',
                            'Choose zone type',
                            [
                                { text: 'Safety Zone', onPress: () => startZoneCreation('safe') },
                                { text: 'Danger Zone', onPress: () => startZoneCreation('danger') },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        )}
                    >
                        <Icon name="add" size={24} color="#333" />
                    </TouchableOpacity>

                    {/* Refresh Button */}
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => {
                            getCurrentLocation();
                            fetchAllZones();
                        }}
                    >
                        <Icon name="refresh" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Icon name="search" size={20} color="#666" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search destination..."
                        placeholderTextColor="#999"
                        value={destination}
                        onChangeText={text => {
                            setDestination(text);
                            searchDestination(text);
                        }}
                        returnKeyType="search"
                    />
                    {isSearching && <ActivityIndicator size="small" color="#6a1b9a" />}
                    {destination.length > 0 && (
                        <TouchableOpacity onPress={clearSearch}>
                            <Icon name="clear" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.searchResultItem}
                                onPress={() => selectDestination(item)}
                                activeOpacity={0.7}
                                delayPressIn={0}>
                                <Icon
                                    name={getPlaceTypeIcon(item.type)}
                                    size={20}
                                    color="#666"
                                />
                                <View style={styles.searchResultContent}>
                                    <Text style={styles.searchResultName} numberOfLines={1}>
                                        {item.name.split(',')[0]}
                                    </Text>
                                    <Text style={styles.searchResultAddress} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        style={styles.searchResultsList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            )}

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    showsUserLocation={false}
                    showsCompass={true}
                    showsScale={true}
                    onPress={handleMapPress}
                    initialRegion={{
                        latitude: currentLocation?.latitude || 15.2993,
                        longitude: currentLocation?.longitude || 74.1240,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}>

                    {/* Current Location Marker */}
                    {currentLocation && (
                        <Marker
                            coordinate={{
                                latitude: currentLocation.latitude,
                                longitude: currentLocation.longitude,
                            }}
                            title="Your Location"
                            description="Current position"
                            tracksViewChanges={false}>
                            <View style={styles.currentLocationMarker}>
                                <Icon name="person-pin-circle" size={30} color="#2196F3" />
                            </View>
                        </Marker>
                    )}

                    {/* Destination Marker */}
                    {selectedDestination && (
                        <Marker
                            coordinate={{
                                latitude: selectedDestination.latitude,
                                longitude: selectedDestination.longitude,
                            }}
                            title={selectedDestination.name}
                            description="Destination"
                            tracksViewChanges={false}>
                            <View style={styles.destinationMarker}>
                                <Icon name="place" size={30} color="#F44336" />
                            </View>
                        </Marker>
                    )}

                    {/* Selected Place Marker */}
                    {selectedPlace && !selectedDestination && (
                        <Marker
                            coordinate={{
                                latitude: selectedPlace.latitude,
                                longitude: selectedPlace.longitude,
                            }}
                            title={selectedPlace.name}
                            description="Selected Place"
                            tracksViewChanges={false}>
                            <View style={styles.selectedPlaceMarker}>
                                <Icon
                                    name={getPlaceTypeIcon(selectedPlace.type)}
                                    size={30}
                                    color="#FF9800"
                                />
                            </View>
                        </Marker>
                    )}

                    {/* Safety Zones */}
                    {showSafetyZones && safetyZones.map(zone => (
                        <React.Fragment key={`safe_${zone.id}`}>
                            <Circle
                                center={{
                                    latitude: parseFloat(zone.latitude),
                                    longitude: parseFloat(zone.longitude),
                                }}
                                radius={zone.radius}
                                fillColor={getZoneFillColor('safe')}
                                strokeColor={getZoneStrokeColor('safe')}
                                strokeWidth={2}
                            />
                            <Marker
                                coordinate={{
                                    latitude: parseFloat(zone.latitude),
                                    longitude: parseFloat(zone.longitude),
                                }}
                                title={zone.name}
                                description={`Safety Zone - ${zone.radius}m radius`}
                                onPress={() => openZoneEdit(zone)}>
                                <View style={[styles.zoneMarker, { borderColor: getZoneColor('safe') }]}>
                                    <Icon name={getZoneIcon('safe')} size={24} color={getZoneColor('safe')} />
                                </View>
                            </Marker>
                        </React.Fragment>
                    ))}

                    {/* Danger Zones */}
                    {showDangerZones && dangerZones.map(zone => (
                        <React.Fragment key={`danger_${zone.id}`}>
                            <Circle
                                center={{
                                    latitude: parseFloat(zone.latitude),
                                    longitude: parseFloat(zone.longitude),
                                }}
                                radius={zone.radius}
                                fillColor={getZoneFillColor('danger')}
                                strokeColor={getZoneStrokeColor('danger')}
                                strokeWidth={2}
                            />
                            <Marker
                                coordinate={{
                                    latitude: parseFloat(zone.latitude),
                                    longitude: parseFloat(zone.longitude),
                                }}
                                title={zone.name}
                                description={`Danger Zone - ${zone.radius}m radius`}
                                onPress={() => openZoneEdit(zone)}>
                                <View style={[styles.zoneMarker, { borderColor: getZoneColor('danger') }]}>
                                    <Icon name={getZoneIcon('danger')} size={24} color={getZoneColor('danger')} />
                                </View>
                            </Marker>
                        </React.Fragment>
                    ))}
                </MapView>

                {/* Floating Location Button */}
                <TouchableOpacity
                    style={styles.floatingLocationButton}
                    onPress={centerOnUser}
                    activeOpacity={0.8}>
                    <Icon name="my-location" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Zone Creation Modal */}
            <Modal
                visible={showZoneCreationModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowZoneCreationModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Create {zoneCreationMode === 'safe' ? 'Safety' : 'Danger'} Zone
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowZoneCreationModal(false)}
                                style={styles.closeButton}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Zone Name *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={zoneName}
                                    onChangeText={setZoneName}
                                    placeholder="Enter zone name"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={zoneDescription}
                                    onChangeText={setZoneDescription}
                                    placeholder="Enter zone description"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Radius (meters)</Text>
                                <View style={styles.radiusButtons}>
                                    {[100, 250, 500, 1000, 2000].map(radius => (
                                        <TouchableOpacity
                                            key={radius}
                                            style={[
                                                styles.radiusButton,
                                                zoneRadius === radius && styles.radiusButtonActive,
                                            ]}
                                            onPress={() => setZoneRadius(radius)}>
                                            <Text
                                                style={[
                                                    styles.radiusButtonText,
                                                    zoneRadius === radius && { color: '#fff' },
                                                ]}>
                                                {radius}m
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {zoneCenter && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Selected Location</Text>
                                    <Text style={styles.locationText}>
                                        Lat: {zoneCenter.latitude.toFixed(6)}, Lng: {zoneCenter.longitude.toFixed(6)}
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowZoneCreationModal(false)}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={createZone}>
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Create Zone</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Zone Edit Modal */}
            <Modal
                visible={showZoneEditModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowZoneEditModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Zone</Text>
                            <TouchableOpacity
                                onPress={() => setShowZoneEditModal(false)}
                                style={styles.closeButton}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Zone Name *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={zoneName}
                                    onChangeText={setZoneName}
                                    placeholder="Enter zone name"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    value={zoneDescription}
                                    onChangeText={setZoneDescription}
                                    placeholder="Enter zone description"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Radius (meters)</Text>
                                <View style={styles.radiusButtons}>
                                    {[100, 250, 500, 1000, 2000].map(radius => (
                                        <TouchableOpacity
                                            key={radius}
                                            style={[
                                                styles.radiusButton,
                                                zoneRadius === radius && styles.radiusButtonActive,
                                            ]}
                                            onPress={() => setZoneRadius(radius)}>
                                            <Text
                                                style={[
                                                    styles.radiusButtonText,
                                                    zoneRadius === radius && { color: '#fff' },
                                                ]}>
                                                {radius}m
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteButton]}
                                onPress={() => {
                                    setShowZoneEditModal(false);
                                    deleteZone(editingZone);
                                }}>
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowZoneEditModal(false)}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.createButton]}
                                onPress={editZone}>
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Place Details Modal */}
            <Modal
                visible={showPlaceDetails}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPlaceDetails(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Icon name="place" size={24} color="#2196F3" />
                            <Text style={styles.modalTitle}>Location Details</Text>
                            <TouchableOpacity
                                onPress={() => setShowPlaceDetails(false)}
                                style={styles.closeButton}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {isLoadingPlaceInfo ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#2196F3" />
                                    <Text style={styles.loadingText}>Loading place details...</Text>
                                </View>
                            ) : selectedPlace ? (
                                <View>
                                    <View style={styles.placeInfoSection}>
                                        <Text style={styles.placeName}>{selectedPlace.name}</Text>
                                        <Text style={styles.placeType}>
                                            {selectedPlace.type.charAt(0).toUpperCase() + selectedPlace.type.slice(1)}
                                        </Text>
                                    </View>

                                    {selectedPlace.address && Object.keys(selectedPlace.address).length > 0 && (
                                        <View style={styles.addressSection}>
                                            <Text style={styles.sectionTitle}>Address</Text>
                                            {getAddressComponents(selectedPlace.address).map((component, index) => (
                                                <Text key={index} style={styles.addressComponent}>
                                                    {component}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.coordinatesSection}>
                                        <Text style={styles.sectionTitle}>Coordinates</Text>
                                        <Text style={styles.coordinateText}>
                                            Latitude: {selectedPlace.latitude.toFixed(6)}
                                        </Text>
                                        <Text style={styles.coordinateText}>
                                            Longitude: {selectedPlace.longitude.toFixed(6)}
                                        </Text>
                                    </View>

                                    {tappedLocation && (
                                        <View style={styles.tapInfoSection}>
                                            <Text style={styles.sectionTitle}>Tap Information</Text>
                                            <Text style={styles.tapInfoText}>
                                                This location was selected from the map
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.errorContainer}>
                                    <Icon name="error" size={48} color="#F44336" />
                                    <Text style={styles.errorText}>Unable to load place details</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowPlaceDetails(false)}>
                                <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Purple header banner styles
    headerBanner: {
        backgroundColor: '#6a1b9a',
        paddingTop: 10,
        paddingBottom: 15,
        paddingHorizontal: 16,
    },
    headerBannerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userIconText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    userDetails: {
        flex: 1,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 4,
    },
    languageButton: {
        padding: 8,
    },
    // Header styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    headerButtons: {
        flexDirection: 'row',
    },
    headerButton: {
        padding: 8,
        marginLeft: 4,
    },
    headerButtonActive: {
        backgroundColor: '#6a1b9a',
        borderRadius: 20,
    },
    // Search styles
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        zIndex: 1000,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#333',
        paddingVertical: 0,
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 120,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        maxHeight: 300,
        zIndex: 1001,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    searchResultsList: {
        flex: 1,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchResultContent: {
        flex: 1,
        marginLeft: 12,
    },
    searchResultName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    searchResultAddress: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    // Map styles
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    floatingLocationButton: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#2196F3',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    // Location loading styles
    locationLoadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    locationLoadingContent: {
        alignItems: 'center',
        padding: 40,
    },
    locationLoadingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        textAlign: 'center',
    },
    locationLoadingSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
    },
    // Current location marker styles
    currentLocationMarker: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
        borderColor: '#2196F3',
    },
    destinationMarker: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
        borderColor: '#F44336',
    },
    selectedPlaceMarker: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
        borderColor: '#FF9800',
    },
    // Zone marker styles
    zoneMarker: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 4,
        borderWidth: 2,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 2000,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    radiusButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    radiusButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    radiusButtonActive: {
        backgroundColor: '#2196F3',
        borderColor: '#2196F3',
    },
    radiusButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    locationText: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        padding: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    modalButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    createButton: {
        backgroundColor: '#2196F3',
    },
    deleteButton: {
        backgroundColor: '#F44336',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    // Place details modal styles
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    placeInfoSection: {
        marginBottom: 20,
    },
    placeName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    placeType: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    addressSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    addressComponent: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    coordinatesSection: {
        marginBottom: 20,
    },
    coordinateText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    tapInfoSection: {
        marginBottom: 20,
    },
    tapInfoText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    errorContainer: {
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#F44336',
        textAlign: 'center',
    },
});

export default AdminMapScreen; 