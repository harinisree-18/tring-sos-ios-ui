import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, {Marker} from 'react-native-maps';
import api from './config/axios';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import backgroundLocationService from '../services/backgroundLocationService';
import {getAddressFromCoords} from '../utils/reverseGeocode';
import {useTranslation} from 'react-i18next';

const TAB_TRIPS = 'trips';
const TAB_LOCATIONS = 'locations';

const {width, height} = Dimensions.get('window');

const truncateCoords = coords => {
  if (!coords) return '';
  if (coords.length > 20) return coords.slice(0, 20) + '...';
  return coords;
};

const MyRoutesScreen = ({userId}) => {
  const {t} = useTranslation();
  const [activeTab, setActiveTab] = useState(TAB_TRIPS);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editRouteId, setEditRouteId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState(null);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [mapInitialRegion, setMapInitialRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  const mapRef = useRef(null);

  const tripFromRef = useRef(null);
  const tripToRef = useRef(null);
  const locFromRef = useRef(null);
  const [isSelectingFromSuggestion, setIsSelectingFromSuggestion] =
    useState(false);
  const [isSelectingToSuggestion, setIsSelectingToSuggestion] = useState(false);
  const [isSelectingLocSuggestion, setIsSelectingLocSuggestion] =
    useState(false);

  const [trips, setTrips] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [tripFrom, setTripFrom] = useState('');
  const [tripFromLatLng, setTripFromLatLng] = useState('');
  const [tripTo, setTripTo] = useState('');
  const [tripToLatLng, setTripToLatLng] = useState('');
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');

  const [locType, setLocType] = useState('home');
  const [locFrom, setLocFrom] = useState('');
  const [locFromLatLng, setLocFromLatLng] = useState('');
  const [locStart, setLocStart] = useState('');
  const [locEnd, setLocEnd] = useState('');

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromLoading, setFromLoading] = useState(false);
  const [toLoading, setToLoading] = useState(false);
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const [fromDebounceTimer, setFromDebounceTimer] = useState(null);
  const [toDebounceTimer, setToDebounceTimer] = useState(null);
  const [locDebounceTimer, setLocDebounceTimer] = useState(null);

  const [addressCache, setAddressCache] = useState({});
  const [addressLoading, setAddressLoading] = useState({});
  const [locationCache, setLocationCache] = useState(null);

  const resolveAddress = async (coordStr, cacheKey) => {
    if (!coordStr) return '';
    if (!/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(coordStr)) return coordStr;
    if (addressCache[cacheKey]) return addressCache[cacheKey];

    setAddressLoading(prev => ({...prev, [cacheKey]: true}));

    try {
      const [lat, lon] = coordStr.split(',').map(Number);

      if (
        isNaN(lat) ||
        isNaN(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        throw new Error('Invalid coordinates');
      }

      const address = await getAddressFromCoords(lat, lon);

      if (address && !/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(address)) {
        setAddressCache(prev => ({...prev, [cacheKey]: address}));
      } else {
        const formattedCoords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        setAddressCache(prev => ({...prev, [cacheKey]: formattedCoords}));
      }
    } catch (error) {
      console.error('Error resolving address:', error);
      try {
        const [lat, lon] = coordStr.split(',').map(Number);
        const formattedCoords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        setAddressCache(prev => ({...prev, [cacheKey]: formattedCoords}));
      } catch (formatError) {
        setAddressCache(prev => ({...prev, [cacheKey]: coordStr}));
      }
    } finally {
      setAddressLoading(prev => ({...prev, [cacheKey]: false}));
    }
  };

  useEffect(() => {
    trips.forEach(trip => {
      if (
        trip.from_route &&
        !addressCache[`trip_from_${trip.id}`] &&
        !addressLoading[`trip_from_${trip.id}`]
      ) {
        resolveAddress(trip.from_route, `trip_from_${trip.id}`);
      }
      if (
        trip.to_route &&
        !addressCache[`trip_to_${trip.id}`] &&
        !addressLoading[`trip_to_${trip.id}`]
      ) {
        resolveAddress(trip.to_route, `trip_to_${trip.id}`);
      }
    });

    locations.forEach(loc => {
      if (
        loc.from_route &&
        !addressCache[`loc_from_${loc.id}`] &&
        !addressLoading[`loc_from_${loc.id}`]
      ) {
        resolveAddress(loc.from_route, `loc_from_${loc.id}`);
      }
    });
  }, [trips, locations]);

  const clearTripForm = () => {
    setTripFrom('');
    setTripFromLatLng('');
    setTripTo('');
    setTripToLatLng('');
    setTripStart('');
    setTripEnd('');
    setEditMode(false);
    setEditRouteId(null);
  };
  const clearLocationForm = () => {
    setLocType('home');
    setLocFrom('');
    setLocFromLatLng('');
    setLocStart('');
    setLocEnd('');
    setEditMode(false);
    setEditRouteId(null);
  };

  const fetchRoutes = () => {
    if (!userId) return;
    setLoading(true);
    setFetchError(null);
    api
      .get(`/routes/user/${userId}`)
      .then(async res => {
        const data = res.data || [];
        setTrips(data.filter(r => r.is_single_route === false));
        const trips = data.filter(r => r.is_single_route === false);
        const locations = data.filter(r => r.is_single_route === true);

        const isValidLatLng = (lat, lon) =>
          typeof lat === 'number' &&
          typeof lon === 'number' &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180;

        const routesForTracking = [
          ...trips.map(trip => {
            const [fromLat, fromLon] = trip.from_route.split(',').map(Number);
            const [toLat, toLon] = trip.to_route.split(',').map(Number);
            if (
              !isValidLatLng(fromLat, fromLon) ||
              !isValidLatLng(toLat, toLon)
            )
              return null;
            return {
              from: {latitude: fromLat, longitude: fromLon},
              to: {latitude: toLat, longitude: toLon},
              start: trip.start_time,
              end: trip.end_time,
            };
          }),
          ...locations.map(loc => {
            const [lat, lon] = loc.from_route.split(',').map(Number);
            if (!isValidLatLng(lat, lon)) return null;
            return {
              from: {latitude: lat, longitude: lon},
              to: {latitude: lat, longitude: lon},
              start: loc.start_time,
              end: loc.end_time,
            };
          }),
        ].filter(Boolean);

        if (routesForTracking.length > 0) {
          await backgroundLocationService.setRoutesForTracking(
            routesForTracking,
          );
        }
        setLocations(data.filter(r => r.is_single_route === true));
      })
      .catch(err => {
        if (
          err.response &&
          err.response.status === 404 &&
          err.response.data &&
          typeof err.response.data.message === 'string' &&
          err.response.data.message.includes('No routes found for user ID')
        ) {
          setTrips([]);
          setLocations([]);
          setFetchError(null);
        } else {
          setFetchError(t('route.failedToLoadRoutes'));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoutes();
  }, [userId]);

  useEffect(() => {
    return () => {
      if (fromDebounceTimer) clearTimeout(fromDebounceTimer);
      if (toDebounceTimer) clearTimeout(toDebounceTimer);
      if (locDebounceTimer) clearTimeout(locDebounceTimer);
    };
  }, [fromDebounceTimer, toDebounceTimer, locDebounceTimer]);

  const detectCurrentLocation = async target => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        const locString = `${latitude},${longitude}`;
        if (target === 'tripFrom') setTripFrom(locString);
        if (target === 'tripTo') setTripTo(locString);
        if (target === 'locFrom') setLocFrom(locString);
      },
      error => {
        Alert.alert(t('route.locationError'), error.message);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const openMapPicker = async target => {
    setMapPickerTarget(target);
    setMapSearchText('');
    setMapSearchSuggestions([]);
    setShowMapSearchDropdown(false);

    let fieldValue = '';
    let latLngValue = '';
    if (target === 'tripFrom') {
      fieldValue = tripFrom;
      latLngValue = tripFromLatLng;
    } else if (target === 'tripTo') {
      fieldValue = tripTo;
      latLngValue = tripToLatLng;
    } else if (target === 'locFrom') {
      fieldValue = locFrom;
      latLngValue = locFromLatLng;
    }

    let initialCoords = null;
    if (/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(latLngValue)) {
      const [lat, lon] = latLngValue.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        initialCoords = {latitude: lat, longitude: lon};
      }
    } else if (/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(fieldValue)) {
      const [lat, lon] = fieldValue.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lon)) {
        initialCoords = {latitude: lat, longitude: lon};
      }
    }

    if (initialCoords) {
      setMapInitialRegion({
        latitude: initialCoords.latitude,
        longitude: initialCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setPickedLocation(initialCoords);
      setShowMapPicker(true);
      return;
    }

    const defaultCoords = {
      latitude: 20.5937,
      longitude: 78.9629,
    };

    setMapInitialRegion({
      ...defaultCoords,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setPickedLocation(defaultCoords);
    setShowMapPicker(true);

    const getCurrentLocation = () => {
      if (locationCache && Date.now() - locationCache.timestamp < 30000) {
        setPickedLocation(locationCache.coords);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...locationCache.coords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocationCache({
            coords,
            timestamp: Date.now(),
          });
          setPickedLocation(coords);
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              ...coords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        },
        () => {},
        {enableHighAccuracy: false, timeout: 3000, maximumAge: 60000},
      );
    };

    getCurrentLocation();

    if (fieldValue && fieldValue.length > 4 && !initialCoords) {
      setTimeout(async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            fieldValue,
          )}&format=json&limit=1`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lon)) {
                const coords = {latitude: lat, longitude: lon};
                setPickedLocation(coords);
                if (mapRef.current) {
                  mapRef.current.animateToRegion({
                    ...coords,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                }
              }
            }
          }
        } catch (e) {}
      }, 100);
    }
  };
  const handleMapDrag = e => {
    setPickedLocation(e.nativeEvent.coordinate);
  };
  const confirmMapPick = async () => {
    if (pickedLocation) {
      const locString = `${pickedLocation.latitude},${pickedLocation.longitude}`;

      if (mapPickerTarget === 'tripFrom') {
        setTripFrom(locString);
        setTripFromLatLng(locString);
        setTimeout(() => {
          tripFromRef.current?.focus();
        }, 100);
      }
      if (mapPickerTarget === 'tripTo') {
        setTripTo(locString);
        setTripToLatLng(locString);
        setTimeout(() => {
          tripToRef.current?.focus();
        }, 100);
      }
      if (mapPickerTarget === 'locFrom') {
        setLocFrom(locString);
        setLocFromLatLng(locString);
        setTimeout(() => {
          locFromRef.current?.focus();
        }, 100);
      }

      setShowMapPicker(false);

      try {
        const address = await getAddressFromCoords(
          pickedLocation.latitude,
          pickedLocation.longitude,
        );

        if (address && !/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(address)) {
          if (mapPickerTarget === 'tripFrom') {
            setTripFrom(address);
          }
          if (mapPickerTarget === 'tripTo') {
            setTripTo(address);
          }
          if (mapPickerTarget === 'locFrom') {
            setLocFrom(address);
          }
        }
      } catch (e) {
        console.log('Address resolution failed, keeping coordinates:', e);
      }
    } else {
      setShowMapPicker(false);
    }
  };
  const recenterToMyLocation = async () => {
    if (locationCache && Date.now() - locationCache.timestamp < 30000) {
      setPickedLocation(locationCache.coords);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          ...locationCache.coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
      return;
    }

    let hasPermission = false;
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location to pick your current location.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      hasPermission = auth === 'granted';
    }
    if (!hasPermission) {
      Alert.alert(
        t('route.locationRequired'),
        t('route.enableLocationServices'),
        [
          {text: t('route.cancel'), style: 'cancel'},
          {
            text: t('route.openSettings'),
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return;
    }
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        const coords = {latitude, longitude};
        setLocationCache({
          coords,
          timestamp: Date.now(),
        });
        setPickedLocation(coords);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...coords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      },
      error => {
        Alert.alert(t('route.locationError'), error.message);
      },
      {enableHighAccuracy: false, timeout: 5000, maximumAge: 60000},
    );
  };

  const handleAddTrip = async () => {
    if (!tripFrom || !tripTo || !tripStart || !tripEnd) {
      Alert.alert(t('route.fillAllFields'));
      return;
    }
    if (tripStartError || tripEndError) {
      return;
    }
    const fromRoute =
      tripFromLatLng ||
      (tripFrom && /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(tripFrom)
        ? tripFrom
        : null) ||
      tripFrom;
    const toRoute =
      tripToLatLng ||
      (tripTo && /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(tripTo)
        ? tripTo
        : null) ||
      tripTo;

    const payload = {
      route_type: null,
      from_route: fromRoute,
      to_route: toRoute,
      is_single_route: false,
      start_time: tripStart + ':00',
      end_time: tripEnd + ':00',
      user_id: userId,
      distance: 0,
    };
    try {
      if (editMode && editRouteId) {
        await api.put(`/routes/${editRouteId}`, payload);

        setAddressCache(prev => {
          const newCache = {...prev};
          delete newCache[`trip_from_${editRouteId}`];
          delete newCache[`trip_to_${editRouteId}`];
          return newCache;
        });

        const updatedTrip = {
          id: editRouteId,
          from_route: payload.from_route,
          to_route: payload.to_route,
          start_time: payload.start_time,
          end_time: payload.end_time,
          is_single_route: false,
          user_id: userId,
          distance: 0,
        };

        setTrips(prevTrips => {
          return prevTrips.map(trip => {
            if (trip.id === editRouteId) {
              return {...trip, ...updatedTrip};
            }
            return trip;
          });
        });

        setTimeout(() => {
          if (payload.from_route) {
            resolveAddress(payload.from_route, `trip_from_${editRouteId}`);
          }
          if (payload.to_route) {
            resolveAddress(payload.to_route, `trip_to_${editRouteId}`);
          }
        }, 100);

        Alert.alert(t('route.tripUpdated'));
      } else {
        const response = await api.post('/routes', payload);
        if (response.data) {
          setTrips(prevTrips => [...prevTrips, response.data]);
          setTimeout(() => {
            if (payload.from_route) {
              resolveAddress(
                payload.from_route,
                `trip_from_${response.data.id}`,
              );
            }
            if (payload.to_route) {
              resolveAddress(payload.to_route, `trip_to_${response.data.id}`);
            }
          }, 100);
        }
        Alert.alert(t('route.tripAdded'));
      }
      setShowTripModal(false);
      clearTripForm();
    } catch (e) {
      console.log(e?.response?.data);
      Alert.alert(t('route.failedToSaveTrip'));
    }
  };

  const handleAddLocation = async () => {
    if (!locType || !locFrom || !locStart || !locEnd) {
      Alert.alert(t('route.fillAllFields'));
      return;
    }
    if (locStartError || locEndError) {
      return;
    }
    const fromRoute =
      locFromLatLng ||
      (locFrom && /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(locFrom)
        ? locFrom
        : null) ||
      locFrom;

    const payload = {
      route_type: locType.toLowerCase(),
      from_route: fromRoute,
      to_route: null,
      is_single_route: true,
      start_time: locStart + ':00',
      end_time: locEnd + ':00',
      user_id: userId,
      distance: 0,
    };
    try {
      if (editMode && editRouteId) {
        await api.put(`/routes/${editRouteId}`, payload);

        setAddressCache(prev => {
          const newCache = {...prev};
          delete newCache[`loc_from_${editRouteId}`];
          return newCache;
        });

        const updatedLocation = {
          id: editRouteId,
          route_type: payload.route_type,
          from_route: payload.from_route,
          to_route: null,
          start_time: payload.start_time,
          end_time: payload.end_time,
          is_single_route: true,
          user_id: userId,
          distance: 0,
        };

        setLocations(prevLocations => {
          return prevLocations.map(loc => {
            if (loc.id === editRouteId) {
              return {...loc, ...updatedLocation};
            }
            return loc;
          });
        });

        setTimeout(() => {
          if (payload.from_route) {
            resolveAddress(payload.from_route, `loc_from_${editRouteId}`);
          }
        }, 100);

        Alert.alert(t('route.locationUpdated'));
      } else {
        const response = await api.post('/routes', payload);
        if (response.data) {
          setLocations(prevLocations => [...prevLocations, response.data]);
          setTimeout(() => {
            if (payload.from_route) {
              resolveAddress(
                payload.from_route,
                `loc_from_${response.data.id}`,
              );
            }
          }, 100);
        }
        Alert.alert(t('route.locationAdded'));
      }
      setShowLocationModal(false);
      clearLocationForm();
    } catch (e) {
      Alert.alert(t('route.failedToSaveLocation'));
    }
  };

  const handleEdit = async (routeId, isTrip) => {
    setEditLoading(true);
    setEditRouteId(routeId);
    setEditMode(true);
    try {
      const res = await api.get(`/routes/${routeId}`);
      const data = res.data;
      if (isTrip) {
        let fromValue = data.from_route || '';
        let toValue = data.to_route || '';
        if (/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(fromValue)) {
          const [lat, lon] = fromValue.split(',').map(Number);
          setTripFromLatLng(fromValue);
          fromValue = await getAddressFromCoords(lat, lon);
        } else {
          setTripFromLatLng('');
        }
        if (/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(toValue)) {
          const [lat, lon] = toValue.split(',').map(Number);
          setTripToLatLng(toValue);
          toValue = await getAddressFromCoords(lat, lon);
        } else {
          setTripToLatLng('');
        }
        setTripFrom(fromValue);
        setTripTo(toValue);
        setTripStart(data.start_time ? data.start_time.substring(0, 5) : '');
        setTripEnd(data.end_time ? data.end_time.substring(0, 5) : '');
        setShowTripModal(true);
      } else {
        let fromValue = data.from_route || '';
        if (/^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(fromValue)) {
          const [lat, lon] = fromValue.split(',').map(Number);
          setLocFromLatLng(fromValue);
          fromValue = await getAddressFromCoords(lat, lon);
        } else {
          setLocFromLatLng('');
        }
        setLocType(data.route_type ? data.route_type.toLowerCase() : 'home');
        setLocFrom(fromValue);
        setLocStart(data.start_time ? data.start_time.substring(0, 5) : '');
        setLocEnd(data.end_time ? data.end_time.substring(0, 5) : '');
        setShowLocationModal(true);
      }
    } catch (e) {
      Alert.alert(t('route.failedToLoadRouteDetails'), e.message);
      setEditMode(false);
      setEditRouteId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = routeId => {
    const isTrip = trips.some(trip => trip.id === routeId);
    const deleteTitle = isTrip
      ? t('route.deleteRoute')
      : t('route.deleteLocation');
    const deleteMsg = isTrip
      ? t('route.deleteConfirmation')
      : t('route.deleteLocationConfirmation');
    Alert.alert(deleteTitle, deleteMsg, [
      {text: t('route.cancel'), style: 'cancel'},
      {
        text: t('route.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleteLoadingId(routeId);
          try {
            await api.delete(`/routes/${routeId}`);
            if (isTrip) {
              setTrips(prevTrips =>
                prevTrips.filter(trip => trip.id !== routeId),
              );
              setAddressCache(prev => {
                const newCache = {...prev};
                delete newCache[`trip_from_${routeId}`];
                delete newCache[`trip_to_${routeId}`];
                return newCache;
              });
            } else {
              setLocations(prevLocations =>
                prevLocations.filter(loc => loc.id !== routeId),
              );
              setAddressCache(prev => {
                const newCache = {...prev};
                delete newCache[`loc_from_${routeId}`];
                return newCache;
              });
            }
            Alert.alert(
              isTrip ? t('route.routeDeleted') : t('route.locationDeleted'),
            );
          } catch (e) {
            Alert.alert(
              isTrip
                ? t('route.failedToDeleteRoute')
                : t('route.failedToDeleteLocation'),
              e.message,
            );
          } finally {
            setDeleteLoadingId(null);
          }
        },
      },
    ]);
  };

  const fetchLocationSuggestions = async (text, setSuggestions, setLoading) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log('Fetching suggestions for:', text);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        text,
      )}&format=json&limit=5`;

      const res = await fetch(url);
      console.log('Response status:', res.status);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Suggestions received:', data.length, 'items');

      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.log('Error fetching suggestions:', e);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const [mapSearchText, setMapSearchText] = useState('');
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState([]);
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [showMapSearchDropdown, setShowMapSearchDropdown] = useState(false);
  const [mapSearchDebounceTimer, setMapSearchDebounceTimer] = useState(null);
  const [mapSearchCache, setMapSearchCache] = useState({});

  const fetchMapSearchSuggestions = async text => {
    if (!text || text.length < 2) {
      setMapSearchSuggestions([]);
      setMapSearchLoading(false);
      return;
    }
    if (mapSearchCache[text]) {
      setMapSearchSuggestions(mapSearchCache[text]);
      setMapSearchLoading(false);
      return;
    }
    setMapSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        text,
      )}&format=json&limit=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setMapSearchSuggestions(data);
      setMapSearchCache(prev => ({...prev, [text]: data}));
    } catch (e) {
      setMapSearchSuggestions([]);
    } finally {
      setMapSearchLoading(false);
    }
  };

  const formatTime = time => (time ? time.slice(0, 5) : '');

  const onRefresh = async () => {
    setRefreshing(true);
    setAddressCache({});
    await fetchRoutes();
    setRefreshing(false);
  };

  const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const [tripStartError, setTripStartError] = useState('');
  const [tripEndError, setTripEndError] = useState('');
  const [locStartError, setLocStartError] = useState('');
  const [locEndError, setLocEndError] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_TRIPS && styles.activeTab]}
          onPress={() => setActiveTab(TAB_TRIPS)}>
          <Text
            style={[
              styles.tabText,
              activeTab === TAB_TRIPS && styles.activeTabText,
            ]}>
            {t('route.myTrips')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_LOCATIONS && styles.activeTab]}
          onPress={() => setActiveTab(TAB_LOCATIONS)}>
          <Text
            style={[
              styles.tabText,
              activeTab === TAB_LOCATIONS && styles.activeTabText,
            ]}>
            {t('route.frequentLocations')}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.listContainer}>
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <Text style={{textAlign: 'center', marginTop: 30, color: '#555'}}>
              {t('route.loading')}
            </Text>
          ) : fetchError ? (
            <Text style={{textAlign: 'center', color: '#555', marginTop: 30}}>
              {t('route.failedToLoadRoutes')}
            </Text>
          ) : activeTab === TAB_TRIPS ? (
            trips.length === 0 ? (
              <Text style={{textAlign: 'center', marginTop: 30, color: '#888'}}>
                {t('route.noTripsFound')}
              </Text>
            ) : (
              trips.map(trip => (
                <View key={trip.id} style={styles.tripCardEnhanced}>
                  <View style={styles.timelineStacked}>
                    <View style={styles.timelineVerticalLine} />
                    <View style={styles.timelineRowAligned}>
                      <View style={styles.timelineCircle} />
                      <Text style={styles.tripCardTitle}>
                        {t('route.from')}
                      </Text>
                      <Text style={styles.tripCardValue}>
                        {addressLoading[`trip_from_${trip.id}`] ? (
                          <Text style={{color: '#888', fontStyle: 'italic'}}>
                            Loading address...
                          </Text>
                        ) : addressCache[`trip_from_${trip.id}`] ? (
                          addressCache[`trip_from_${trip.id}`]
                        ) : (
                          <Text style={{color: '#888', fontStyle: 'italic'}}>
                            {trip.from_route
                              ? `${parseFloat(
                                  trip.from_route.split(',')[0],
                                ).toFixed(6)}, ${parseFloat(
                                  trip.from_route.split(',')[1],
                                ).toFixed(6)}`
                              : 'No location'}
                          </Text>
                        )}
                      </Text>
                    </View>
                    <View style={styles.timeRowBetween}>
                      <View style={styles.timeColBetween}>
                        <Text style={styles.tripCardLabel}>
                          {t('route.startTime')}
                        </Text>
                        <Text style={styles.tripCardInfo}>
                          {formatTime(trip.start_time)}
                        </Text>
                      </View>
                      <Text style={styles.timeHyphen}>-</Text>
                      <View style={styles.timeColBetween}>
                        <Text style={styles.tripCardLabel}>
                          {t('route.endTime')}
                        </Text>
                        <Text style={styles.tripCardInfo}>
                          {formatTime(trip.end_time)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.timelineRowAligned}>
                      <View style={styles.timelineCircle} />
                      <Text style={styles.tripCardTitle}>{t('route.to')}</Text>
                      <Text style={styles.tripCardValue}>
                        {addressLoading[`trip_to_${trip.id}`] ? (
                          <Text style={{color: '#888', fontStyle: 'italic'}}>
                            Loading address...
                          </Text>
                        ) : addressCache[`trip_to_${trip.id}`] ? (
                          addressCache[`trip_to_${trip.id}`]
                        ) : (
                          <Text style={{color: '#888', fontStyle: 'italic'}}>
                            {trip.to_route
                              ? `${parseFloat(
                                  trip.to_route.split(',')[0],
                                ).toFixed(6)}, ${parseFloat(
                                  trip.to_route.split(',')[1],
                                ).toFixed(6)}`
                              : 'No location'}
                          </Text>
                        )}
                      </Text>
                    </View>
                    <View style={styles.tripCardActionsTopRight}>
                      <TouchableOpacity
                        style={styles.iconCircle}
                        activeOpacity={0.7}
                        onPress={() => handleEdit(trip.id, true)}
                        disabled={editLoading}>
                        <Icon name="edit" size={20} color="#6a1b9a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconCircle}
                        activeOpacity={0.7}
                        onPress={() => handleDelete(trip.id)}
                        disabled={deleteLoadingId === trip.id}>
                        <Icon name="delete" size={20} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )
          ) : locations.length === 0 ? (
            <Text style={{textAlign: 'center', marginTop: 30, color: '#888'}}>
              {t('route.noFrequentLocationsFound')}
            </Text>
          ) : (
            locations.map(loc => (
              <View key={loc.id} style={styles.locationCardEnhanced}>
                <View style={styles.locationIconColumn}>
                  <View style={styles.locationCircle}>
                    <Icon name="location-on" size={18} color="#a020f0" />
                  </View>
                </View>
                <View style={styles.locationCardContent}>
                  <View style={styles.locationCardActionsTopRight}>
                    <TouchableOpacity
                      style={styles.iconCircle}
                      activeOpacity={0.7}
                      onPress={() => handleEdit(loc.id, false)}
                      disabled={editLoading}>
                      <Icon name="edit" size={20} color="#6a1b9a" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconCircle}
                      activeOpacity={0.7}
                      onPress={() => handleDelete(loc.id)}
                      disabled={deleteLoadingId === loc.id}>
                      <Icon name="delete" size={20} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.locationCardTitle}>
                    {loc.route_type
                      ? loc.route_type.charAt(0).toUpperCase() +
                        loc.route_type.slice(1)
                      : 'Location'}
                  </Text>
                  <Text style={styles.locationCardAddress}>
                    {addressLoading[`loc_from_${loc.id}`] ? (
                      <Text style={{color: '#888', fontStyle: 'italic'}}>
                        Loading address...
                      </Text>
                    ) : addressCache[`loc_from_${loc.id}`] ? (
                      addressCache[`loc_from_${loc.id}`]
                    ) : (
                      <Text style={{color: '#888', fontStyle: 'italic'}}>
                        {loc.from_route
                          ? `${parseFloat(loc.from_route.split(',')[0]).toFixed(
                              6,
                            )}, ${parseFloat(
                              loc.from_route.split(',')[1],
                            ).toFixed(6)}`
                          : 'No location'}
                      </Text>
                    )}
                  </Text>
                  <View style={styles.timeRowBetween}>
                    <View style={styles.timeColBetween}>
                      <Text style={styles.tripCardLabel}>
                        {t('route.startTime')}
                      </Text>
                      <Text style={styles.tripCardInfo}>
                        {formatTime(loc.start_time)}
                      </Text>
                    </View>
                    <Text style={styles.timeHyphen}>-</Text>
                    <View style={styles.timeColBetween}>
                      <Text style={styles.tripCardLabel}>
                        {t('route.endTime')}
                      </Text>
                      <Text style={styles.tripCardInfo}>
                        {formatTime(loc.end_time)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.bottomButtonBar}>
          {activeTab === TAB_TRIPS ? (
            <TouchableOpacity
              style={styles.addButtonBottom}
              onPress={() => setShowTripModal(true)}>
              <Text style={styles.addButtonText}>{t('route.addTrip')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addButtonBottom}
              onPress={() => setShowLocationModal(true)}>
              <Text style={styles.addButtonText}>{t('route.addLocation')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Modal visible={showTripModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editMode ? t('route.editTrip') : t('route.addTrip')}
            </Text>
            <View style={styles.locationRow}>
              <View style={{flex: 1}}>
                <View style={{position: 'relative', width: '100%', height: 48}}>
                  <TextInput
                    ref={tripFromRef}
                    style={[styles.input, {paddingRight: 40, height: 48}]}
                    placeholder={t('route.fromLocation')}
                    placeholderTextColor="#888"
                    value={tripFrom}
                    onChangeText={text => {
                      console.log('From text changed:', text);
                      setTripFrom(text);
                      if (fromDebounceTimer) {
                        clearTimeout(fromDebounceTimer);
                      }
                      const timer = setTimeout(() => {
                        if (text.length >= 2) {
                          fetchLocationSuggestions(
                            text,
                            setFromSuggestions,
                            setFromLoading,
                          );
                        }
                      }, 200);
                      setFromDebounceTimer(timer);
                    }}
                    onFocus={async () => {
                      setShowFromDropdown(true);
                      if (
                        /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(tripFrom) &&
                        tripFrom !== tripFromLatLng
                      ) {
                        const addr = await resolveAddress(
                          tripFrom,
                          'modal_tripFrom',
                        );
                        setTripFrom(addr);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        if (!isSelectingFromSuggestion)
                          setShowFromDropdown(false);
                      }, 100)
                    }
                  />
                  <TouchableOpacity
                    style={styles.inputIconBtn}
                    onPress={() => openMapPicker('tripFrom')}>
                    <Icon name="location-pin" size={24} color="#6a1b9a" />
                  </TouchableOpacity>
                </View>
                {showFromDropdown &&
                  (fromSuggestions.length > 0 || fromLoading) && (
                    <View style={styles.suggestionDropdown}>
                      {fromLoading ? (
                        <Text style={styles.suggestionItem}>Loading...</Text>
                      ) : (
                        <FlatList
                          keyboardShouldPersistTaps="handled"
                          data={fromSuggestions}
                          keyExtractor={item =>
                            item.place_id?.toString() || item.display_name
                          }
                          renderItem={({item}) => (
                            <TouchableOpacity
                              style={styles.suggestionItem}
                              onPress={() => {
                                setIsSelectingFromSuggestion(true);
                                setTripFrom(item.display_name);
                                setTripFromLatLng(
                                  item.lat && item.lon
                                    ? `${item.lat},${item.lon}`
                                    : item.display_name,
                                );
                                setShowFromDropdown(false);
                                setTimeout(
                                  () => setIsSelectingFromSuggestion(false),
                                  0,
                                );
                              }}>
                              <Icon
                                name="location-on"
                                size={18}
                                color="#6a1b9a"
                                style={{marginRight: 6, color: '#6a1b9a'}}
                              />
                              <Text
                                style={{flex: 1, color: '#888'}}
                                numberOfLines={1}>
                                {item.display_name}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                    </View>
                  )}
              </View>
            </View>
            <View style={styles.locationRow}>
              <View style={{flex: 1}}>
                <View style={{position: 'relative', width: '100%', height: 48}}>
                  <TextInput
                    ref={tripToRef}
                    style={[styles.input, {paddingRight: 40, height: 48}]}
                    placeholder={t('route.toLocation')}
                    placeholderTextColor="#888"
                    value={tripTo}
                    onChangeText={text => {
                      setTripTo(text);
                      if (toDebounceTimer) {
                        clearTimeout(toDebounceTimer);
                      }
                      const timer = setTimeout(() => {
                        if (text.length >= 2) {
                          fetchLocationSuggestions(
                            text,
                            setToSuggestions,
                            setToLoading,
                          );
                        }
                      }, 200);
                      setToDebounceTimer(timer);
                    }}
                    onFocus={async () => {
                      setShowToDropdown(true);
                      if (
                        /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(tripTo) &&
                        tripTo !== tripToLatLng
                      ) {
                        const addr = await resolveAddress(
                          tripTo,
                          'modal_tripTo',
                        );
                        setTripTo(addr);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        if (!isSelectingToSuggestion) setShowToDropdown(false);
                      }, 100)
                    }
                  />
                  <TouchableOpacity
                    style={styles.inputIconBtn}
                    onPress={() => openMapPicker('tripTo')}>
                    <Icon name="location-pin" size={24} color="#6a1b9a" />
                  </TouchableOpacity>
                </View>
                {showToDropdown && (toSuggestions.length > 0 || toLoading) && (
                  <View style={styles.suggestionDropdown}>
                    {toLoading ? (
                      <Text style={styles.suggestionItem}>Loading...</Text>
                    ) : (
                      <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={toSuggestions}
                        keyExtractor={item =>
                          item.place_id?.toString() || item.display_name
                        }
                        renderItem={({item}) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => {
                              setIsSelectingToSuggestion(true);
                              setTripTo(item.display_name);
                              setTripToLatLng(
                                item.lat && item.lon
                                  ? `${item.lat},${item.lon}`
                                  : item.display_name,
                              );
                              setShowToDropdown(false);
                              setTimeout(
                                () => setIsSelectingToSuggestion(false),
                                0,
                              );
                            }}>
                            <Icon
                              name="location-on"
                              size={18}
                              color="#6a1b9a"
                              style={{marginRight: 6, color: '#6a1b9a'}}
                            />
                            <Text
                              style={{flex: 1, color: '#888'}}
                              numberOfLines={1}>
                              {item.display_name}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                )}
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('route.startTimePlaceholder')}
              placeholderTextColor="#888"
              value={tripStart}
              onChangeText={text => {
                setTripStart(text);
                if (text && !TIME_REGEX.test(text)) {
                  setTripStartError(t('route.invalidTimeFormat'));
                } else {
                  setTripStartError('');
                }
              }}
            />
            {tripStartError ? (
              <Text
                style={{
                  color: 'red',
                  marginBottom: 8,
                  marginLeft: 0,
                  marginRight: 'auto',
                  width: '100%',
                  textAlign: 'left',
                }}>
                {tripStartError}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder={t('route.endTimePlaceholder')}
              placeholderTextColor="#888"
              value={tripEnd}
              onChangeText={text => {
                setTripEnd(text);
                if (text && !TIME_REGEX.test(text)) {
                  setTripEndError(t('route.invalidTimeFormat'));
                } else {
                  setTripEndError('');
                }
              }}
            />
            {tripEndError ? (
              <Text
                style={{
                  color: 'red',
                  marginBottom: 8,
                  marginLeft: 0,
                  marginRight: 'auto',
                  width: '100%',
                  textAlign: 'left',
                }}>
                {tripEndError}
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButtonHalf}
                onPress={() => {
                  setShowTripModal(false);
                  clearTripForm();
                  setTripStartError('');
                  setTripEndError('');
                }}>
                <Text style={styles.cancelButtonText}>{t('route.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButtonHalf}
                onPress={handleAddTrip}>
                <Text style={styles.saveButtonText}>
                  {editMode ? t('route.update') : t('route.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editMode ? t('route.editLocation') : t('route.addLocation')}
            </Text>
            <View
              style={[styles.pickerWrapper, styles.input, {marginBottom: 12}]}>
              <Picker
                selectedValue={locType}
                onValueChange={itemValue => setLocType(itemValue)}
                style={{width: '100%', height: 35, color: '#555'}}
                itemStyle={{fontSize: 14}}>
                <Picker.Item label={t('route.home')} value="home" />
                <Picker.Item label={t('route.work')} value="work" />
                <Picker.Item label={t('route.others')} value="others" />
              </Picker>
            </View>
            <View style={styles.locationRow}>
              <View style={{flex: 1}}>
                <View style={{position: 'relative', width: '100%', height: 48}}>
                  <TextInput
                    ref={locFromRef}
                    style={[styles.input, {paddingRight: 40, height: 48}]}
                    placeholder={t('route.location')}
                    placeholderTextColor="#888"
                    value={locFrom}
                    onChangeText={text => {
                      setLocFrom(text);
                      if (locDebounceTimer) {
                        clearTimeout(locDebounceTimer);
                      }
                      const timer = setTimeout(() => {
                        if (text.length >= 2) {
                          fetchLocationSuggestions(
                            text,
                            setLocSuggestions,
                            setLocLoading,
                          );
                        }
                      }, 200);
                      setLocDebounceTimer(timer);
                    }}
                    onFocus={async () => {
                      setShowLocDropdown(true);
                      if (
                        /^[-+]?\d+\.\d+\s*,\s*[-+]?\d+\.\d+$/.test(locFrom) &&
                        locFrom !== locFromLatLng
                      ) {
                        const addr = await resolveAddress(
                          locFrom,
                          'modal_locFrom',
                        );
                        setLocFrom(addr);
                      }
                    }}
                    onBlur={() =>
                      setTimeout(() => {
                        if (!isSelectingLocSuggestion)
                          setShowLocDropdown(false);
                      }, 100)
                    }
                  />
                  <TouchableOpacity
                    style={styles.inputIconBtn}
                    onPress={() => openMapPicker('locFrom')}>
                    <Icon name="location-pin" size={24} color="#6a1b9a" />
                  </TouchableOpacity>
                </View>
                {showLocDropdown &&
                  (locSuggestions.length > 0 || locLoading) && (
                    <View style={styles.suggestionDropdown}>
                      {locLoading ? (
                        <Text style={styles.suggestionItem}>Loading...</Text>
                      ) : (
                        <FlatList
                          keyboardShouldPersistTaps="handled"
                          data={locSuggestions}
                          keyExtractor={item =>
                            item.place_id?.toString() || item.display_name
                          }
                          renderItem={({item}) => (
                            <TouchableOpacity
                              style={styles.suggestionItem}
                              onPress={() => {
                                setIsSelectingLocSuggestion(true);
                                setLocFrom(item.display_name);
                                setLocFromLatLng(
                                  item.lat && item.lon
                                    ? `${item.lat},${item.lon}`
                                    : item.display_name,
                                );
                                setShowLocDropdown(false);
                                setTimeout(
                                  () => setIsSelectingLocSuggestion(false),
                                  0,
                                );
                              }}>
                              <Icon
                                name="location-on"
                                size={18}
                                color="#6a1b9a"
                                style={{marginRight: 6, color: '#6a1b9a'}}
                              />
                              <Text
                                style={{flex: 1, color: '#888'}}
                                numberOfLines={1}>
                                {item.display_name}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                    </View>
                  )}
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('route.startTimePlaceholder')}
              placeholderTextColor="#888"
              value={locStart}
              onChangeText={text => {
                setLocStart(text);
                if (text && !TIME_REGEX.test(text)) {
                  setLocStartError(t('route.invalidTimeFormat'));
                } else {
                  setLocStartError('');
                }
              }}
            />
            {locStartError ? (
              <Text
                style={{
                  color: 'red',
                  fontSize: 12,
                  marginBottom: 8,
                  marginLeft: 0,
                  marginRight: 'auto',
                  width: '100%',
                  textAlign: 'left',
                }}>
                {locStartError}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder={t('route.endTimePlaceholder')}
              placeholderTextColor="#888"
              value={locEnd}
              onChangeText={text => {
                setLocEnd(text);
                if (text && !TIME_REGEX.test(text)) {
                  setLocEndError(t('route.invalidTimeFormat'));
                } else {
                  setLocEndError('');
                }
              }}
            />
            {locEndError ? (
              <Text
                style={{
                  color: 'red',
                  fontSize: 12,
                  marginBottom: 8,
                  marginLeft: 0,
                  marginRight: 'auto',
                  width: '100%',
                  textAlign: 'left',
                }}>
                {locEndError}
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButtonHalf}
                onPress={() => {
                  setShowLocationModal(false);
                  clearLocationForm();
                  setLocStartError('');
                  setLocEndError('');
                }}>
                <Text style={styles.cancelButtonText}>{t('route.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButtonHalf}
                onPress={handleAddLocation}>
                <Text style={styles.saveButtonText}>
                  {editMode ? t('route.update') : t('route.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showMapPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                width: Math.min(width * 0.95, 400),
                height: Math.min(height * 0.7, 500),
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}>
            <Text style={styles.modalTitle}>
              {t('route.pickLocationOnMap')}
            </Text>
            <Text style={styles.mapInstruction}>
              {t('route.dragPinInstruction')}
            </Text>
            <View style={{width: '100%', marginBottom: 8}}>
              <TextInput
                style={styles.input}
                placeholder={t('route.searchLocation')}
                placeholderTextColor="#888"
                value={mapSearchText}
                onChangeText={text => {
                  setMapSearchText(text);
                  setShowMapSearchDropdown(true);
                  if (mapSearchDebounceTimer)
                    clearTimeout(mapSearchDebounceTimer);
                  const timer = setTimeout(() => {
                    if (text.length >= 2) fetchMapSearchSuggestions(text);
                  }, 200);
                  setMapSearchDebounceTimer(timer);
                }}
                onFocus={() => {
                  if (mapSearchText.length >= 2) setShowMapSearchDropdown(true);
                }}
              />
              {showMapSearchDropdown &&
                (mapSearchSuggestions.length > 0 || mapSearchLoading) && (
                  <View style={styles.suggestionDropdown}>
                    {mapSearchLoading ? (
                      <Text style={styles.suggestionItem}>Loading...</Text>
                    ) : (
                      <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={mapSearchSuggestions}
                        keyExtractor={item =>
                          item.place_id?.toString() || item.display_name
                        }
                        renderItem={({item}) => (
                          <TouchableOpacity
                            style={styles.suggestionItem}
                            onPress={() => {
                              setMapSearchText(item.display_name);
                              setShowMapSearchDropdown(false);
                              if (item.lat && item.lon) {
                                const coords = {
                                  latitude: parseFloat(item.lat),
                                  longitude: parseFloat(item.lon),
                                };
                                setPickedLocation(coords);
                                setMapInitialRegion({
                                  ...coords,
                                  latitudeDelta: 0.01,
                                  longitudeDelta: 0.01,
                                });
                                if (mapRef.current) {
                                  mapRef.current.animateToRegion({
                                    ...coords,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                  });
                                }
                              }
                            }}>
                            <Icon
                              name="location-on"
                              size={18}
                              color="#6a1b9a"
                              style={{marginRight: 6, color: '#6a1b9a'}}
                            />
                            <Text
                              style={{flex: 1, color: '#888'}}
                              numberOfLines={1}>
                              {item.display_name}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                )}
            </View>
            <View
              style={{
                width: '100%',
                height: Math.max(180, height * 0.25),
                marginBottom: 10,
              }}>
              <MapView
                ref={mapRef}
                style={{width: '100%', height: '100%'}}
                initialRegion={mapInitialRegion}
                region={
                  pickedLocation
                    ? {
                        ...pickedLocation,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }
                    : mapInitialRegion
                }
                onPress={e => setPickedLocation(e.nativeEvent.coordinate)}>
                {pickedLocation && (
                  <Marker
                    coordinate={pickedLocation}
                    draggable
                    onDragEnd={handleMapDrag}
                  />
                )}
              </MapView>
              <TouchableOpacity
                style={styles.myLocationBtn}
                onPress={recenterToMyLocation}>
                <Text style={styles.myLocationBtnText}>
                  🎯 {t('route.myLocation')}
                </Text>
              </TouchableOpacity>
            </View>
            {pickedLocation && (
              <Text
                style={styles.coordsText}
                numberOfLines={1}
                ellipsizeMode="middle">
                {pickedLocation.latitude.toFixed(6)},{' '}
                {pickedLocation.longitude.toFixed(6)}
              </Text>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButtonHalf}
                onPress={() => {
                  setShowMapPicker(false);
                  setMapSearchText('');
                  setMapSearchSuggestions([]);
                  setShowMapSearchDropdown(false);
                }}>
                <Text style={styles.cancelButtonText}>{t('route.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButtonHalf}
                onPress={confirmMapPick}>
                <Text style={styles.saveButtonText}>{t('route.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f8f8ff'},
  header: {
    padding: 24,
    backgroundColor: '#8e24aa',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
  },
  tab: {flex: 1, padding: 12, alignItems: 'center'},
  activeTab: {backgroundColor: '#f3e5f5'},
  tabText: {color: '#8e24aa', fontWeight: 'bold', fontSize: 14},
  activeTabText: {color: '#6a1b9a'},
  listContainer: {flex: 1, position: 'relative', minHeight: 0},
  content: {flex: 1, padding: 15, marginBottom: 160},
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginBottom: 4,
  },
  cardText: {fontSize: 15, color: '#333', marginBottom: 2},
  boldText: {fontWeight: 'bold'},
  bottomButtonBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    padding: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  addButtonBottom: {
    backgroundColor: '#8e24aa',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '100%',
  },
  addButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6a1b9a',
    marginBottom: 8,
  },
  mapInstruction: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  coordsText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#6a1b9a',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  saveButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  cancelButton: {
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {color: '#6a1b9a', fontWeight: 'bold', fontSize: 16},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  locBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  locBtn: {
    marginLeft: 4,
    width: 36,
    height: 36,
    backgroundColor: '#eee',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locBtnText: {fontSize: 20},
  myLocationBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eee',
    zIndex: 10,
  },
  myLocationBtnText: {fontSize: 15, color: '#6a1b9a', fontWeight: 'bold'},
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonHalf: {
    backgroundColor: '#6a1b9a',
    borderRadius: 8,
    padding: 14,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonHalf: {
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 14,
    width: '48%',
    alignItems: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  suggestionDropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    zIndex: 1000,
    maxHeight: 180,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3e5f5',
    backgroundColor: '#fff',
    color: '#888',
  },
  tripCardEnhanced: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#a020f0',
  },
  tripCardContent: {
    flex: 1,
    paddingRight: 4,
    position: 'relative',
  },
  tripCardActionsTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  tripCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7c1fd1',
    marginRight: 8,
    minWidth: 38,
  },
  tripCardValue: {
    fontSize: 12,
    color: '#333',
    flexShrink: 1,
    flexWrap: 'wrap',
    width: 'auto',
    paddingRight: 110,
    maxWidth: '95%',
  },
  tripCardRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tripCardCol: {
    flex: 1,
  },
  tripCardLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  tripCardInfo: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    marginBottom: 0,
  },
  timelineColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 32,
    marginRight: 8,
    justifyContent: 'flex-start',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#a020f0',
    backgroundColor: '#fff',
    zIndex: 2,
  },
  timelineLabelSpacer: {
    width: 0,
    height: 0,
  },
  timelineLineDynamic: {
    width: 6,
    flex: 1,
    backgroundColor: '#f3e5f5',
    borderRadius: 3,
    minHeight: 8,
    marginVertical: 2,
  },
  timelineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  timelineLabelRowTo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 10,
  },
  timeRowBetween: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    margin: 4,
  },
  timeColBetween: {
    alignItems: 'center',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timelineLabelRowToActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 10,
  },
  cardActionsRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  timeHyphen: {
    fontSize: 18,
    color: '#888',
    marginHorizontal: 10,
    width: 10,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  timelineLabelRowToActionsAligned: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  locationCardEnhanced: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#a020f0',
  },
  locationIconColumn: {
    alignItems: 'center',
    width: 32,
    justifyContent: 'center',
    marginRight: 8,
  },
  locationCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#a020f0',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationCardContent: {
    flex: 1,
    paddingRight: 4,
    position: 'relative',
  },
  locationCardActionsTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  locationCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#7c1fd1',
    marginBottom: 2,
  },
  locationCardAddress: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    flexWrap: 'wrap',
    paddingRight: 110,
    maxWidth: '100%',
  },
  locationTimeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    margin: 4,
  },
  locationTimeCol: {
    alignItems: 'center',
  },
  locationCardLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  locationCardInfo: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    marginBottom: 0,
  },
  timelineLabelRowAligned: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
    gap: 6,
  },
  timelineColumnAligned: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 32,
    marginRight: 8,
    justifyContent: 'space-between',
  },
  timelineLineDynamicAligned: {
    width: 6,
    flex: 1,
    backgroundColor: '#f3e5f5',
    borderRadius: 3,
    minHeight: 24,
    marginVertical: 2,
  },
  tripCardContentAligned: {
    flex: 1,
    flexDirection: 'column',
    paddingRight: 4,
    position: 'relative',
  },
  timelineCircleInvisible: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
    opacity: 0,
  },
  timelineStacked: {
    flex: 1,
    flexDirection: 'column',
    position: 'relative',
    justifyContent: 'center',
    paddingLeft: 0,
    paddingRight: 0,
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 4,
    // top: 15,
    // bottom: 15,
    width: 8,
    height: '60%',
    backgroundColor: '#f3e5f5',
    borderRadius: 2,
  },
  timelineRowAligned: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
    gap: 6,
    minHeight: 32,
    zIndex: 1,
  },
  inputIconBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    padding: 0,
    zIndex: 2,
    backgroundColor: '#f3e5f5',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyRoutesScreen;
