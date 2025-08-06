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
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  Circle,
} from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import api from './config/axios';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ userId, userName }) => {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
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

  // Add tap detection state
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchStartLocation, setTouchStartLocation] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Add emergency services markers state
  const [policeStations, setPoliceStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [isLoadingEmergencyServices, setIsLoadingEmergencyServices] =
    useState(false);

  // Add toggle state for emergency services visibility
  const [showPoliceStations, setShowPoliceStations] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);

  // Add loading state for location
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Geofencing states
  const [safetyZones, setSafetyZones] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [showSafetyZones, setShowSafetyZones] = useState(true);
  const [showDangerZones, setShowDangerZones] = useState(true);
    const [isLoadingZones, setIsLoadingZones] = useState(true);

  useEffect(() => {
    getCurrentLocation();
    loadZonesFromAPI();
  }, []);

  // Auto-center map on user location when screen becomes active
  useEffect(() => {
    const centerOnUserLocation = () => {
      if (currentLocation && mapRef.current) {
        centerOnUser();
      }
    };

    // Center on user when current location is available
    if (currentLocation) {
      centerOnUserLocation();
    }
  }, [currentLocation]);

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

        // Fetch emergency services after getting location
        fetchEmergencyServices(latitude, longitude);

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
        // maximumAge: 10000,
      },
    );
  };

  const fetchEmergencyServices = async (latitude, longitude) => {
    console.log('Fetching emergency services for:', latitude, longitude);
    console.log('Search radius: 20km');
    setIsLoadingEmergencyServices(true);

    try {
      // Fetch police stations within 20km
      const policeResults = await fetchNearbyPlaces(
        latitude,
        longitude,
        'police',
        20,
      );
      setPoliceStations(policeResults);
      console.log('Police stations found within 20km:', policeResults.length);
      if (policeResults.length > 0) {
        console.log('Sample police station:', policeResults[0]);
        console.log(
          'Police station distances:',
          policeResults.map(p => `${p.name}: ${p.distance.toFixed(1)}km`),
        );
      }

      // Fetch hospitals within 20km
      const hospitalResults = await fetchNearbyPlaces(
        latitude,
        longitude,
        'hospital',
        20,
      );
      setHospitals(hospitalResults);
      console.log('Hospitals found within 20km:', hospitalResults.length);
      if (hospitalResults.length > 0) {
        console.log('Sample hospital:', hospitalResults[0]);
        console.log(
          'Hospital distances:',
          hospitalResults.map(h => `${h.name}: ${h.distance.toFixed(1)}km`),
        );
      }
    } catch (error) {
      console.error('Error fetching emergency services:', error);
    } finally {
      setIsLoadingEmergencyServices(false);
    }
  };

  const fetchNearbyPlaces = async (latitude, longitude, amenity, radiusKm) => {
    // Calculate bounding box for the radius
    const latDelta = radiusKm / 111.32; // 1 degree latitude ≈ 111.32 km
    const lngDelta = radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180)); // Adjust for longitude

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    console.log(
      `Searching for ${amenity} within ${radiusKm}km of ${latitude}, ${longitude}`,
    );
    console.log(`Bounding box: ${minLat}, ${minLng} to ${maxLat}, ${maxLng}`);

    const searchApis = [
      {
        name: 'Nominatim Bounded',
        url: `https://nominatim.openstreetmap.org/search?format=json&amenity=${amenity}&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1&limit=20&addressdetails=1`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      {
        name: 'Nominatim Radius',
        url: `https://nominatim.openstreetmap.org/search?format=json&amenity=${amenity}&lat=${latitude}&lon=${longitude}&radius=${radiusKm * 1000
        }&limit=20&addressdetails=1`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
      {
        name: 'Nominatim Local Search',
        url: `https://nominatim.openstreetmap.org/search?format=json&q=${amenity}&lat=${latitude}&lon=${longitude}&radius=${radiusKm * 1000
        }&limit=20&addressdetails=1&amenity=1`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    ];

    for (const api of searchApis) {
      try {
        console.log(`Trying ${api.name} for ${amenity}...`);

        const response = await fetch(api.url, {
          method: 'GET',
          headers: api.headers,
          timeout: 10000, // 10 second timeout
        });

        if (!response.ok) {
          console.warn(`${api.name} failed with status:`, response.status);
          continue;
        }

        const data = await response.json();
        console.log(`${api.name} raw response for ${amenity}:`, data);

        if (!Array.isArray(data) || data.length === 0) {
          console.log(`${api.name} returned no results for ${amenity}`);
          continue;
        }

        const results = data
          .map(item => ({
            id: item.place_id,
            name:
              item.display_name.split(',')[0] ||
              item.name ||
              `${amenity.charAt(0).toUpperCase() + amenity.slice(1)}`,
            fullName: item.display_name,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: amenity,
            address: item.address || {},
            importance: item.importance || 0.1,
            category: item.category || amenity,
            distance: calculateDistance(
              latitude,
              longitude,
              parseFloat(item.lat),
              parseFloat(item.lon),
            ),
          }))
          .filter(item => item.distance <= radiusKm); // Filter by actual distance

        console.log(
          `${api.name} successful for ${amenity} with ${results.length} results`,
        );
        return results;
      } catch (error) {
        console.error(`${api.name} error for ${amenity}:`, error);
        continue;
      }
    }

    // Return empty array if all APIs fail
    return [];
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
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
              latitude: currentLocation?.latitude + 0.001 || 13.0827,
              longitude: currentLocation?.longitude + 0.001 || 80.2707,
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

        if (data.display_name) {
          const placeInfo = {
            id: data.place_id || `custom_${Date.now()}`,
            name: data.display_name,
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lon),
            type: data.type || 'unknown',
            address: data.address || {},
            importance: data.importance || 0.1,
            category: data.category || 'unknown',
            osm_type: data.osm_type,
            osm_id: data.osm_id,
          };

          console.log(`Reverse ${api.name} successful:`, placeInfo);
          return placeInfo;
        } else {
          console.log(`Reverse ${api.name} no display_name in response`);
          continue;
        }
      } catch (error) {
        console.error(`Reverse ${api.name} error:`, error);
        continue;
      }
    }

    // If all APIs fail, return fallback
    console.log('All reverse geocoding APIs failed, using fallback');
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
  };

  const getDirections = async (destination, transportMode = 'driving') => {
    console.log('=== GET DIRECTIONS CALLED ===');
    console.log('Destination:', destination);
    console.log('Transport Mode:', transportMode);
    console.log('Current Location:', currentLocation);

    if (!currentLocation) {
      console.error('No current location available');
      Alert.alert(
        'Error',
        'Current location not available. Please wait for location to load.',
      );
      return;
    }

    if (!destination || !destination.latitude || !destination.longitude) {
      console.error('Invalid destination:', destination);
      Alert.alert('Error', 'Invalid destination coordinates');
      return;
    }

    console.log('=== STARTING ROUTING ===');
    console.log('Current Location:', currentLocation);
    console.log('Destination:', destination);
    console.log('Transport Mode:', transportMode);

    // Validate coordinates
    if (
      !currentLocation.latitude ||
      !currentLocation.longitude ||
      !destination.latitude ||
      !destination.longitude
    ) {
      console.error('Invalid coordinates:', { currentLocation, destination });
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    setIsRouting(true);
    try {
      console.log(
        'Getting directions from:',
        currentLocation,
        'to:',
        destination,
        'mode:',
        transportMode,
      );

      // Use OpenStreetMap OSRM API directly for routing (free)
      const routeInfo = await tryMultipleRoutingAPIs(
        currentLocation,
        destination,
        transportMode,
      );

      console.log('Route info received:', routeInfo);

      if (
        routeInfo &&
        routeInfo.coordinates &&
        routeInfo.coordinates.length > 0
      ) {
        console.log('Route coordinates count:', routeInfo.coordinates.length);
        console.log('First coordinate:', routeInfo.coordinates[0]);
        console.log(
          'Last coordinate:',
          routeInfo.coordinates[routeInfo.coordinates.length - 1],
        );

        setRouteCoordinates(routeInfo.coordinates);
        setSelectedDestination(destination);
        setShowSearchResults(false);
        setShowPlaceDetails(false);

        // Fit map to show entire route with padding
        if (mapRef.current && routeInfo.coordinates.length > 0) {
          console.log('Fitting map to coordinates...');
          mapRef.current.fitToCoordinates(routeInfo.coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
            animated: true,
          });
        }

        // Show route info
        Alert.alert(
          'Route Found',
          `Distance: ${routeInfo.distance} km\nDuration: ${routeInfo.duration} minutes\nMode: ${transportMode}`,
          [{ text: 'OK' }],
        );
      } else {
        console.log('No valid route found - routeInfo:', routeInfo);
        Alert.alert('Routing Error', 'No route found to destination');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      Alert.alert(
        'Routing Error',
        'Failed to get directions. Please check your internet connection.',
      );
    } finally {
      setIsRouting(false);
    }
  };

  const tryMultipleRoutingAPIs = async (origin, destination, transportMode) => {
    console.log('=== TRYING ROUTING APIS ===');
    console.log('Origin:', origin);
    console.log('Destination:', destination);
    console.log('Transport Mode:', transportMode);

    const routingApis = [
      {
        name: 'OSRM Primary',
        url: `https://router.project-osrm.org/route/v1/${transportMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
        },
      },
      {
        name: 'OSRM Simple',
        url: `https://router.project-osrm.org/route/v1/${transportMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
        },
      },
      {
        name: 'OSRM Basic',
        url: `https://router.project-osrm.org/route/v1/${transportMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'WomenSOS/1.0',
        },
      },
    ];

    for (const api of routingApis) {
      try {
        console.log(`\n--- Trying routing ${api.name} ---`);
        console.log('URL:', api.url);

        const response = await fetch(api.url, {
          method: 'GET',
          headers: api.headers,
          timeout: 15000, // Increased timeout
        });

        console.log(`Routing ${api.name} response status:`, response.status);
        console.log(`Routing ${api.name} response headers:`, response.headers);

        if (!response.ok) {
          console.warn(
            `Routing ${api.name} failed with status:`,
            response.status,
          );
          const errorText = await response.text();
          console.warn(`Routing ${api.name} error response:`, errorText);
          continue;
        }

        const contentType = response.headers.get('content-type');
        console.log(`Routing ${api.name} Content-Type:`, contentType);

        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`Routing ${api.name} returned non-JSON response`);
          const textResponse = await response.text();
          console.warn(
            `Routing ${api.name} text response (first 200 chars):`,
            textResponse.substring(0, 200),
          );
          continue;
        }

        const data = await response.json();
        console.log(
          `Routing ${api.name} raw response keys:`,
          Object.keys(data),
        );
        console.log(
          `Routing ${api.name} routes count:`,
          data.routes ? data.routes.length : 0,
        );

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          console.log(`Routing ${api.name} route keys:`, Object.keys(route));
          console.log(`Routing ${api.name} route duration:`, route.duration);
          console.log(`Routing ${api.name} route distance:`, route.distance);

          // Handle different geometry formats
          let coordinates = [];
          if (route.geometry && route.geometry.coordinates) {
            console.log(`Routing ${api.name} using GeoJSON geometry`);
            console.log(
              `Routing ${api.name} coordinates count:`,
              route.geometry.coordinates.length,
            );

            coordinates = route.geometry.coordinates.map((coord, index) => {
              const coordObj = {
                latitude: coord[1],
                longitude: coord[0],
              };
              if (
                index === 0 ||
                index === route.geometry.coordinates.length - 1
              ) {
                console.log(
                  `Routing ${api.name} coordinate ${index}:`,
                  coordObj,
                );
              }
              return coordObj;
            });
          } else if (route.geometry && route.geometry.points) {
            console.log(`Routing ${api.name} using polyline geometry`);
            coordinates = route.geometry.points.map(point => ({
              latitude: point[0],
              longitude: point[1],
            }));
          } else if (route.legs && route.legs.length > 0) {
            console.log(`Routing ${api.name} using legs geometry`);
            coordinates = route.legs[0].steps.map(step => ({
              latitude: step.maneuver.location[1],
              longitude: step.maneuver.location[0],
            }));
          } else {
            console.log(`Routing ${api.name} no geometry found in route`);
          }

          console.log(
            `Routing ${api.name} processed coordinates count:`,
            coordinates.length,
          );

          if (coordinates.length > 0) {
            const duration = Math.round(route.duration / 60); // Convert to minutes
            const distance = Math.round((route.distance / 1000) * 10) / 10; // Convert to km

            const routeInfo = {
              coordinates: coordinates,
              duration: duration,
              distance: distance,
              mode: transportMode,
            };

            console.log(`Routing ${api.name} successful:`, routeInfo);
            return routeInfo;
          } else {
            console.log(`Routing ${api.name} no valid coordinates found`);
            continue;
          }
        } else {
          console.log(`Routing ${api.name} no routes in response`);
          if (data.message) {
            console.log(`Routing ${api.name} error message:`, data.message);
          }
          continue;
        }
      } catch (error) {
        console.error(`Routing ${api.name} error:`, error);
        continue;
      }
    }

    // If all APIs fail, throw error
    console.error('All routing APIs failed');
    throw new Error('All routing APIs failed');
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

  const handleLocationTap = async (latitude, longitude, source = 'map') => {
    console.log(`=== ${source.toUpperCase()} TAP DETECTED ===`);
    console.log(`${source} tapped at:`, latitude, longitude);

    // Close search results when map is pressed
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }

    // Immediately set loading state and show basic modal
    setIsLoadingPlaceInfo(true);
    setTappedLocation({ latitude, longitude });

    // Create immediate fallback place info
    const immediatePlaceInfo = {
      id: `${source}_${Date.now()}`,
      name: `Location at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      latitude: latitude,
      longitude: longitude,
      type: 'unknown',
      address: {},
      importance: 0.1,
      category: 'unknown',
    };

    setSelectedPlace(immediatePlaceInfo);
    setShowPlaceDetails(true);

    console.log('Immediate modal state set:', {
      showPlaceDetails: true,
      selectedPlace: immediatePlaceInfo,
      tappedLocation: { latitude, longitude },
    });

    try {
      console.log('Getting detailed place info for tapped location...');
      // Get detailed place information for tapped location
      const detailedPlaceInfo = await getPlaceInfoFromCoordinates(
        latitude,
        longitude,
      );
      console.log('Detailed place info received:', detailedPlaceInfo);

      // Update with detailed info
      setSelectedPlace(detailedPlaceInfo);
      setIsLoadingPlaceInfo(false);

      console.log('Updated modal with detailed place info:', detailedPlaceInfo);
    } catch (error) {
      console.error('Error getting detailed place info:', error);
      // Keep the basic modal with fallback info
      setIsLoadingPlaceInfo(false);
      console.log('Using fallback place info due to error');
    }

    // Center map on tapped location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMapPress = async event => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        await handleLocationTap(latitude, longitude, 'map');
      }
    } catch (error) {
      console.error('Error in handleMapPress:', error);
    }
  };

  const handleMarkerPress = async event => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        await handleLocationTap(latitude, longitude, 'marker');
      }
    } catch (error) {
      console.error('Error in handleMarkerPress:', error);
    }
  };

  const handleEmergencyServicePress = async (
    event,
    serviceType,
    serviceData,
  ) => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const { latitude, longitude } = event.nativeEvent.coordinate;

        // Create a custom place info for the emergency service
        const emergencyPlaceInfo = {
          id: serviceData.id,
          name: serviceData.name,
          fullName: serviceData.fullName,
          latitude: serviceData.latitude,
          longitude: serviceData.longitude,
          type: serviceType,
          address: serviceData.address,
          importance: serviceData.importance,
          category: serviceType,
          distance: serviceData.distance,
        };

        // Set the selected place and show details
        setSelectedPlace(emergencyPlaceInfo);
        setTappedLocation({
          latitude: serviceData.latitude,
          longitude: serviceData.longitude,
        });
        setShowPlaceDetails(true);

        // Center map on the emergency service
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: serviceData.latitude,
            longitude: serviceData.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      }
    } catch (error) {
      console.error('Error in handleEmergencyServicePress:', error);
    }
  };

  const handlePoiClick = async event => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        await handleLocationTap(latitude, longitude, 'poi');
      }
    } catch (error) {
      console.error('Error in handlePoiClick:', error);
    }
  };

  const handleCalloutPress = async event => {
    try {
      if (event && event.nativeEvent && event.nativeEvent.coordinate) {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        await handleLocationTap(latitude, longitude, 'callout');
      }
    } catch (error) {
      console.error('Error in handleCalloutPress:', error);
    }
  };

  const handleRegionChange = event => {
    if (event && event.nativeEvent && event.nativeEvent.region) {
      console.log('Map region changed:', event.nativeEvent.region);
      // You can add logic here if you need to react to map region changes
    } else {
      console.log('Map region change event received but no region data');
    }
  };

  // Removed handleMapTouchOverlay function as it's no longer needed

  const handleMapTouchStart = event => {
    // Record touch start for tap detection
    setTouchStartTime(Date.now());
    if (event && event.nativeEvent && event.nativeEvent.location) {
      setTouchStartLocation(event.nativeEvent.location);
    }
    setIsDragging(false);
  };

  const handleMapTouchEnd = async event => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTime;

    // Only treat as a tap if:
    // 1. Touch duration is less than 300ms (quick tap)
    // 2. Touch distance is minimal (not a drag)
    // 3. We're not currently dragging
    if (touchDuration < 300 && !isDragging && touchStartLocation) {
      let endLocation = null;
      if (event && event.nativeEvent && event.nativeEvent.location) {
        endLocation = event.nativeEvent.location;
      }

      // Check if touch distance is minimal (less than 10 pixels)
      const isMinimalMovement =
        !endLocation ||
        (Math.abs(endLocation.x - touchStartLocation.x) < 10 &&
          Math.abs(endLocation.y - touchStartLocation.y) < 10);

      if (isMinimalMovement) {
        console.log('=== TAP DETECTED ===');
        try {
          if (event && event.nativeEvent && event.nativeEvent.coordinate) {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            await handleLocationTap(latitude, longitude, 'tap');
          } else if (endLocation && mapRef.current) {
            // Convert screen coordinates to map coordinates
            const coordinate = await mapRef.current.coordinateForPoint(
              endLocation,
            );
            await handleLocationTap(
              coordinate.latitude,
              coordinate.longitude,
              'tap_converted',
            );
          }
        } catch (error) {
          console.error('Error in handleMapTouchEnd:', error);
        }
      }
    }

    // Reset touch state
    setTouchStartTime(null);
    setTouchStartLocation(null);
    setIsDragging(false);
  };

  const handleMapTouchMove = () => {
    // Mark as dragging if touch moves
    setIsDragging(true);
  };

  // Removed handlePoiTouch function as it's no longer needed

  const handleMapReady = () => {
    console.log('MapView is ready');
    // You can add logic here if you need to react to the map being ready
  };

  const clearRoute = () => {
    setRouteCoordinates([]);
    setSelectedDestination(null);
    setDestination('');
    setShowSearchResults(false);
    setShowPlaceDetails(false);
    setSelectedPlace(null);
    setTappedLocation(null);

    // Center map on current location
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
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



  const loadZonesFromAPI = async () => {
    try {
      setIsLoadingZones(true);

      // Fetch zones from backend API
      const response = await api.get('/safety-zones');
      const zones = response.data;

      const safeZones = zones.filter(zone => zone.type === 'safe');
      const dangerZones = zones.filter(zone => zone.type === 'danger');

      setSafetyZones(safeZones);
      setDangerZones(dangerZones);

      console.log('Zones loaded from API:', { safeZones: safeZones.length, dangerZones: dangerZones.length });
        } catch (error) {
      console.error('Error loading zones from API:', error);
            // Fallback to empty zones if there's an error
            setSafetyZones([]);
            setDangerZones([]);
        } finally {
            setIsLoadingZones(false);
        }
    };

  const toggleSafetyZones = () => {
    setShowSafetyZones(!showSafetyZones);
  };

  const toggleDangerZones = () => {
    setShowDangerZones(!showDangerZones);
  };

  const getZoneInfo = async zone => {
    try {
      const { latitude, longitude } = zone.center;
      const placeInfo = await getPlaceInfoFromCoordinates(latitude, longitude);
      return {
        ...zone,
        address: placeInfo.address || {},
        placeName: placeInfo.name || 'Unknown Location',
      };
    } catch (error) {
      console.error('Error getting zone info:', error);
      return zone;
    }
  };

  const toggleHospitals = () => {
    const newState = !showHospitals;
    setShowHospitals(newState);
    console.log('Hospitals visibility toggled:', newState);

    // If turning on hospitals and we have hospital data, center map to show them
    if (newState && hospitals.length > 0) {
      console.log('Centering map on hospitals. Count:', hospitals.length);
      centerMapOnEmergencyServices(hospitals, 'hospitals');
    }
  };

  const togglePoliceStations = () => {
    const newState = !showPoliceStations;
    setShowPoliceStations(newState);
    console.log('Police stations visibility toggled:', newState);

    // If turning on police stations and we have police data, center map to show them
    if (newState && policeStations.length > 0) {
      console.log(
        'Centering map on police stations. Count:',
        policeStations.length,
      );
      centerMapOnEmergencyServices(policeStations, 'police');
    }
  };

  const centerMapOnEmergencyServices = (services, type) => {
    if (!services || services.length === 0) {
      console.log(`No ${type} to center on`);
      return;
    }

    console.log(`Centering map on ${services.length} ${type}`);

    // Calculate the center point of all services
    const totalLat = services.reduce(
      (sum, service) => sum + service.latitude,
      0,
    );
    const totalLng = services.reduce(
      (sum, service) => sum + service.longitude,
      0,
    );
    const centerLat = totalLat / services.length;
    const centerLng = totalLng / services.length;

    // Calculate the bounds to include all services
    const lats = services.map(s => s.latitude);
    const lngs = services.map(s => s.longitude);
    const latDelta = (Math.max(...lats) - Math.min(...lats)) * 1.2; // Add 20% padding
    const lngDelta = (Math.max(...lngs) - Math.min(...lngs)) * 1.2;

    // Ensure minimum zoom level
    const minDelta = 0.01;
    const finalLatDelta = Math.max(latDelta, minDelta);
    const finalLngDelta = Math.max(lngDelta, minDelta);

    console.log(
      `Centering at: ${centerLat}, ${centerLng} with deltas: ${finalLatDelta}, ${finalLngDelta}`,
    );

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: finalLatDelta,
        longitudeDelta: finalLngDelta,
      });
    }
  };

  const handleSearchFocus = () => {
    console.log('Search focused');
    if (destination.trim()) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    console.log('Search blurred');
    // Keep results visible for a moment to allow selection
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleOutsidePress = () => {
    // Close search results when clicking outside
    setShowSearchResults(false);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
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

  const getTransportModeIcon = mode => {
    switch (mode) {
      case 'driving':
        return 'directions-car';
      case 'walking':
        return 'directions-walk';
      case 'cycling':
        return 'directions-bike';
      case 'transit':
        return 'directions-bus';
      default:
        return 'directions';
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Location Loading Screen */}
      {isLocationLoading && (
        <View style={styles.locationLoadingContainer}>
          <View style={styles.locationLoadingContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.locationLoadingText}>
              Getting your location...
            </Text>
            <Text style={styles.locationLoadingSubtext}>
              Please wait while we find your position
            </Text>
          </View>
        </View>
      )}

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('map.title', 'Map')}</Text>
                    {isLoadingEmergencyServices && (
                        <View style={styles.emergencyServicesLoading}>
                            <ActivityIndicator size="small" color="#6a1b9a" />
                            <Text style={styles.emergencyServicesLoadingText}>Loading...</Text>
                        </View>
                    )}
                </View>
                <View style={styles.headerButtons}>
                    {/* Geofencing Buttons */}
                    <TouchableOpacity
                        style={[styles.headerButton, showSafetyZones && styles.headerButtonActive]}
                        onPress={toggleSafetyZones}
                    >
                        <Icon name="security" size={24} color={showSafetyZones ? "#FFFFFF" : "#4CAF50"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerButton, showDangerZones && styles.headerButtonActive]}
                        onPress={toggleDangerZones}
                    >
                        <Icon name="warning" size={24} color={showDangerZones ? "#FFFFFF" : "#F44336"} />
                    </TouchableOpacity>

          {/* Emergency Services Buttons */}
          <TouchableOpacity
            style={[
              styles.headerButton,
              showPoliceStations && styles.headerButtonActive,
            ]}
            onPress={togglePoliceStations}>
            <Icon
              name="local-police"
              size={24}
              color={showPoliceStations ? '#FFFFFF' : '#2196F3'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerButton,
              showHospitals && styles.headerButtonActive,
            ]}
            onPress={toggleHospitals}>
            <Icon
              name="local-hospital"
              size={24}
              color={showHospitals ? '#FFFFFF' : '#F44336'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (currentLocation) {
                console.log('Manually refetching emergency services...');
                fetchEmergencyServices(
                  currentLocation.latitude,
                  currentLocation.longitude,
                );
              } else {
                console.log('No current location available');
              }
            }}>
            <Icon name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar - Always visible on top */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={t('map.searchDestination', 'Search destination...')}
            placeholderTextColor="#999"
            value={destination}
            onChangeText={text => {
              console.log('Search text changed:', text);
              setDestination(text);
              searchDestination(text);
            }}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            returnKeyType="search"
          />
          {isSearching && <ActivityIndicator size="small" color="#2196F3" />}
          {destination.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {selectedDestination && (
          <TouchableOpacity
            style={styles.clearRouteButton}
            onPress={clearRoute}>
            <Icon name="clear" size={20} color="#666" />
            <Text style={styles.clearRouteText}>Clear Route</Text>
          </TouchableOpacity>
        )}
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
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          onPress={handleMapPress}
          onMarkerPress={handleMarkerPress}
          onPoiClick={handlePoiClick}
          onCalloutPress={handleCalloutPress}
          onRegionChangeComplete={handleRegionChange}
          onMapReady={handleMapReady}
          onTouchStart={handleMapTouchStart}
          onTouchEnd={handleMapTouchEnd}
          onTouchMove={handleMapTouchMove}
          initialRegion={{
            latitude: currentLocation?.latitude || 13.0827,
            longitude: currentLocation?.longitude || 80.2707,
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

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#2196F3"
              strokeWidth={5}
              lineDashPattern={[1]}
              zIndex={1}
            />
          )}

          {/* Police Station Markers */}
          {showPoliceStations &&
            policeStations.map(station => (
              <Marker
                key={`police_${station.id}`}
                coordinate={{
                  latitude: station.latitude,
                  longitude: station.longitude,
                }}
                title={station.name}
                description={`Police Station - ${station.distance.toFixed(
                  1,
                )}km away`}
                tracksViewChanges={false}
                onPress={event =>
                  handleEmergencyServicePress(event, 'police', station)
                }>
                <View style={styles.policeCustomMarker}>
                  <Icon name="local-police" size={30} color="#2196F3" />
                </View>
              </Marker>
            ))}

          {/* Hospital Markers */}
          {showHospitals &&
            hospitals.map(hospital => (
              <Marker
                key={`hospital_${hospital.id}`}
                coordinate={{
                  latitude: hospital.latitude,
                  longitude: hospital.longitude,
                }}
                title={hospital.name}
                description={`Hospital - ${hospital.distance.toFixed(
                  1,
                )}km away`}
                tracksViewChanges={false}
                onPress={event =>
                  handleEmergencyServicePress(event, 'hospital', hospital)
                }>
                <View style={styles.hospitalCustomMarker}>
                  <Icon name="local-hospital" size={30} color="#F44336" />
                </View>
              </Marker>
            ))}

          {/* Safety Zones */}
          {showSafetyZones &&
            safetyZones.map(zone => (
              <Circle
                key={`safety_${zone.id}`}
                center={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                radius={zone.radius}
                fillColor="rgba(76, 175, 80, 0.2)"
                strokeColor="rgba(76, 175, 80, 0.8)"
                strokeWidth={2}
              />
            ))}

          {/* Danger Zones */}
          {showDangerZones &&
            dangerZones.map(zone => (
              <Circle
                key={`danger_${zone.id}`}
                center={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                radius={zone.radius}
                fillColor="rgba(244, 67, 54, 0.2)"
                strokeColor="rgba(244, 67, 54, 0.8)"
                strokeWidth={2}
              />
            ))}

          {/* Zone Center Markers */}
          {showSafetyZones &&
            safetyZones.map(zone => (
              <Marker
                key={`safety_marker_${zone.id}`}
                coordinate={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                title={zone.name}
                description={`Safety Zone - ${zone.radius}m radius`}
                tracksViewChanges={false}>
                <View style={styles.safetyZoneMarker}>
                  <Icon name="security" size={24} color="#4CAF50" />
                </View>
              </Marker>
            ))}

          {showDangerZones &&
            dangerZones.map(zone => (
              <Marker
                key={`danger_marker_${zone.id}`}
                coordinate={{
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude),
                }}
                title={zone.name}
                description={`Danger Zone - ${zone.radius}m radius`}
                tracksViewChanges={false}>
                <View style={styles.dangerZoneMarker}>
                  <Icon name="warning" size={24} color="#F44336" />
                </View>
              </Marker>
            ))}
        </MapView>

        {/* Floating Location Button - Bottom Right */}
        <TouchableOpacity
          style={styles.floatingLocationButton}
          onPress={centerOnUser}
          activeOpacity={0.8}>
          <Icon name="my-location" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Removed invisible touch overlay to prevent interference with map dragging */}
      </View>

      {/* Place Details Modal */}
      <Modal
        visible={showPlaceDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlaceDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.placeDetailsModal}>
            <View style={styles.modalHeader}>
              <Icon
                name={getPlaceTypeIcon(selectedPlace?.type)}
                size={24}
                color="#FF9800"
              />
              <Text style={styles.modalTitle}>
                {tappedLocation ? 'Location Details' : 'Place Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowPlaceDetails(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {isLoadingPlaceInfo ? (
                <View style={styles.loadingPlaceInfo}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingPlaceText}>
                    Getting place information...
                  </Text>
                </View>
              ) : (
                selectedPlace && (
                  <>
                    <Text style={styles.placeName}>{selectedPlace.name}</Text>

                    <View style={styles.placeInfo}>
                      <View style={styles.infoRow}>
                        <Icon name="place" size={16} color="#666" />
                        <Text style={styles.infoText}>
                          {selectedPlace.latitude.toFixed(6)},{' '}
                          {selectedPlace.longitude.toFixed(6)}
                        </Text>
                      </View>

                      {/* Show coordinates in a more readable format */}
                      <View style={styles.coordinateSection}>
                        <Text style={styles.coordinateTitle}>Coordinates:</Text>
                        <Text style={styles.coordinateText}>
                          Latitude: {selectedPlace.latitude.toFixed(6)}
                        </Text>
                        <Text style={styles.coordinateText}>
                          Longitude: {selectedPlace.longitude.toFixed(6)}
                        </Text>
                      </View>

                      {selectedPlace.type &&
                        selectedPlace.type !== 'unknown' && (
                          <View style={styles.infoRow}>
                            <Icon name="category" size={16} color="#666" />
                            <Text style={styles.infoText}>
                              Type: {selectedPlace.type}
                            </Text>
                          </View>
                        )}

                      {selectedPlace.importance &&
                        selectedPlace.importance > 0 && (
                          <View style={styles.infoRow}>
                            <Icon name="star" size={16} color="#666" />
                            <Text style={styles.infoText}>
                              Importance:{' '}
                              {(selectedPlace.importance * 100).toFixed(1)}%
                            </Text>
                          </View>
                        )}

                      {selectedPlace.distance && (
                        <View style={styles.infoRow}>
                          <Icon name="straighten" size={16} color="#666" />
                          <Text style={styles.infoText}>
                            Distance: {selectedPlace.distance.toFixed(1)} km
                            away
                          </Text>
                        </View>
                      )}

                      {selectedPlace.address &&
                        Object.keys(selectedPlace.address).length > 0 && (
                          <View style={styles.addressSection}>
                            <Text style={styles.addressTitle}>
                              Address Details:
                            </Text>
                            {getAddressComponents(selectedPlace.address).map(
                              (component, index) => (
                                <Text
                                  key={index}
                                  style={styles.addressComponent}>
                                  {component}
                                </Text>
                              ),
                            )}
                          </View>
                        )}
                    </View>

                    <View style={styles.directionsSection}>
                      <Text style={styles.sectionTitle}>Get Directions</Text>
                      <Text style={styles.sectionSubtitle}>
                        Choose your preferred mode of transport
                      </Text>

                      <View style={styles.transportModes}>
                        <TouchableOpacity
                          style={styles.transportMode}
                          onPress={async () => {
                            console.log('Drive button pressed');
                            try {
                              await getDirections(selectedPlace, 'driving');
                            } catch (error) {
                              console.error('Drive routing error:', error);
                              Alert.alert(
                                'Routing Error',
                                'Failed to get driving directions',
                              );
                            }
                          }}>
                          <Icon
                            name="directions-car"
                            size={24}
                            color="#2196F3"
                          />
                          <Text style={styles.transportText}>Drive</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.transportMode}
                          onPress={async () => {
                            console.log('Walk button pressed');
                            try {
                              await getDirections(selectedPlace, 'walking');
                            } catch (error) {
                              console.error('Walk routing error:', error);
                              Alert.alert(
                                'Routing Error',
                                'Failed to get walking directions',
                              );
                            }
                          }}>
                          <Icon
                            name="directions-walk"
                            size={24}
                            color="#4CAF50"
                          />
                          <Text style={styles.transportText}>Walk</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.transportMode}
                          onPress={async () => {
                            console.log('Bike button pressed');
                            try {
                              await getDirections(selectedPlace, 'cycling');
                            } catch (error) {
                              console.error('Bike routing error:', error);
                              Alert.alert(
                                'Routing Error',
                                'Failed to get cycling directions',
                              );
                            }
                          }}>
                          <Icon
                            name="directions-bike"
                            size={24}
                            color="#FF9800"
                          />
                          <Text style={styles.transportText}>Bike</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isRouting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>
              {t('map.calculatingRoute', 'Calculating route...')}
            </Text>
          </View>
        </View>
      )}


        </View>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitleContainer: {
    flex: 1,
  },
  emergencyServicesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emergencyServicesLoadingText: {
    fontSize: 12,
    color: '#6a1b9a',
    marginLeft: 8,
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
  },
  headerButtonActive: {
    backgroundColor: '#6a1b9a',
    borderRadius: 20,
  },
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
  clearRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  clearRouteText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 120, // Position below search bar
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
  map: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },

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
  policeMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  hospitalMarker: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  policeCustomMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  hospitalCustomMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  safetyZoneMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  dangerZoneMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 2000,
    elevation: 10,
  },
  placeDetailsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    zIndex: 2001,
    elevation: 11,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 16,
  },
  placeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
  },
  placeInfo: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  addressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  addressComponent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  directionsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  transportModes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  transportMode: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    minWidth: 80,
  },
  transportText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  loadingPlaceInfo: {
    alignItems: 'center',
    padding: 40,
  },
  loadingPlaceText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },

  coordinateSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  coordinateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  coordinateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  floatingLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
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

  // Zone Creation Modal Styles
  zoneCreationModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  zoneManagementModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
  },
  zoneNameLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  zoneInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  zoneTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radiusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  // Zone Management Modal Styles
  zoneTypeSection: {
    marginBottom: 24,
  },
  zoneTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  zoneTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zoneTypeButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  safetyButton: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  dangerButton: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  zoneTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  zoneListSection: {
    marginBottom: 24,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  zoneItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneItemText: {
    marginLeft: 12,
    flex: 1,
  },
  zoneItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  zoneItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  zoneItemRadius: {
    fontSize: 12,
    color: '#999',
  },
  deleteZoneButton: {
    padding: 8,
  },
    clearAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#F44336',
        borderRadius: 8,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    clearAllButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#F44336',
    },
    debugButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#2196F3',
        borderRadius: 8,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
    },
    debugButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#2196F3',
    },
    loadingZonesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingZonesText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
});

export default MapScreen;
