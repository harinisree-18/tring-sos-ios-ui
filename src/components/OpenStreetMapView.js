import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {WebView} from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

const {width, height} = Dimensions.get('window');

export default function OpenStreetMapView({userId, userName}) {
  const {t} = useTranslation();
  const webViewRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapType, setMapType] = useState('osm'); // osm, satellite, terrain

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const granted = await Geolocation.requestAuthorization('whenInUse');
        if (granted === 'granted') {
          setLocationPermission(true);
          getCurrentLocation();
        } else {
          setLocationPermission(false);
          setLoading(false);
          Alert.alert(
            t('map.locationPermissionRequired'),
            t('map.locationPermissionMessage'),
            [{text: t('common.ok')}],
          );
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('map.locationPermissionTitle'),
            message: t('map.locationPermissionMessage'),
            buttonNeutral: t('common.askMeLater'),
            buttonNegative: t('common.cancel'),
            buttonPositive: t('common.ok'),
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermission(true);
          getCurrentLocation();
        } else {
          setLocationPermission(false);
          setLoading(false);
          Alert.alert(
            t('map.locationPermissionRequired'),
            t('map.locationPermissionMessage'),
            [{text: t('common.ok')}],
          );
        }
      }
    } catch (err) {
      console.warn(err);
      setLocationPermission(false);
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setCurrentLocation({latitude, longitude});
        setLoading(false);
      },
      error => {
        console.log(error.code, error.message);
        setLoading(false);
        // Set default location (Chennai) if location access fails
        setCurrentLocation({
          latitude: 13.0827,
          longitude: 80.2707,
        });
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const centerOnUser = () => {
    if (currentLocation && webViewRef.current) {
      const script = `
        map.setView([${currentLocation.latitude}, ${currentLocation.longitude}], 15);
        if (userMarker) {
          userMarker.setLatLng([${currentLocation.latitude}, ${currentLocation.longitude}]);
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const toggleMapType = () => {
    const types = ['osm', 'satellite', 'terrain'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const getMapTypeUrl = () => {
    switch (mapType) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getMapTypeAttribution = () => {
    switch (mapType) {
      case 'satellite':
        return '&copy; <a href="https://www.esri.com/">Esri</a>';
      case 'terrain':
        return '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  const generateMapHTML = () => {
    const lat = currentLocation?.latitude || 13.0827;
    const lng = currentLocation?.longitude || 80.2707;
    const tileUrl = getMapTypeUrl();
    const attribution = getMapTypeAttribution();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
        <title>OpenStreetMap</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            height: 100vh; 
            width: 100vw; 
            overflow: hidden; 
          }
          #map { 
            height: 100%; 
            width: 100%; 
          }
          .leaflet-control-attribution {
            font-size: 10px;
            background: rgba(255,255,255,0.8);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${lat}, ${lng}], 15);
          
          L.tileLayer('${tileUrl}', {
            attribution: '${attribution}',
            maxZoom: 19,
            subdomains: 'abc'
          }).addTo(map);
          
          var userMarker = L.marker([${lat}, ${lng}], {
            icon: L.divIcon({
              className: 'user-marker',
              html: '<div style="background-color: #6a1b9a; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map);
          
          userMarker.bindPopup('Your Location').openPopup();
          
          // Add zoom controls
          L.control.zoom({
            position: 'bottomright'
          }).addTo(map);
          
          // Add scale
          L.control.scale({
            position: 'bottomleft'
          }).addTo(map);
          
          // Handle map events
          map.on('click', function(e) {
            console.log('Map clicked at:', e.latlng);
          });
          
          map.on('moveend', function() {
            console.log('Map moved to:', map.getCenter());
          });
        </script>
      </body>
      </html>
    `;
  };

  const onWebViewMessage = event => {
    const data = JSON.parse(event.nativeEvent.data);
    console.log('WebView message:', data);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#6a1b9a" />
        <Text style={styles.loadingText}>{t('map.loadingMap')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('map.title', 'Map')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={toggleMapType}>
            <Icon name="layers" size={24} color="#6a1b9a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={centerOnUser}>
            <Icon name="my-location" size={24} color="#6a1b9a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{html: generateMapHTML()}}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={false}
          onMessage={onWebViewMessage}
          onLoadEnd={() => setLoading(false)}
          onError={syntheticEvent => {
            const {nativeEvent} = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
      </View>

      {/* Map Type Indicator */}
      <View style={styles.mapTypeIndicator}>
        <Text style={styles.mapTypeText}>
          {t(
            `map.${mapType}`,
            mapType.charAt(0).toUpperCase() + mapType.slice(1),
          )}
        </Text>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={getCurrentLocation}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapTypeIndicator: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mapTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'center',
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6a1b9a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
