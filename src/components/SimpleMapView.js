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
import MapView, {Marker, PROVIDER_DEFAULT} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {PermissionsAndroid} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

const {width, height} = Dimensions.get('window');

export default function SimpleMapView({userId, userName}) {
  const {t} = useTranslation();
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);

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
        setCurrentLocation({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setLoading(false);
      },
      error => {
        console.log(error.code, error.message);
        setLoading(false);
        // Set default location (Chennai) if location access fails
        setCurrentLocation({
          latitude: 13.0827,
          longitude: 80.2707,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const centerOnUser = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(currentLocation, 1000);
    }
  };

  const refreshLocation = () => {
    getCurrentLocation();
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
        <Text style={styles.headerTitle}>{t('map.title', 'Safety Map')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={centerOnUser}>
            <Icon name="my-location" size={24} color="#6a1b9a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType="standard"
          initialRegion={currentLocation}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          showsTraffic={false}
          showsBuildings={true}
          showsIndoors={true}
          showsIndoorLevelPicker={true}
          loadingEnabled={true}
          loadingIndicatorColor="#6a1b9a"
          loadingBackgroundColor="#ffffff"
          onMapReady={() => {
            console.log('Map is ready');
          }}
          onRegionChangeComplete={region => {
            console.log('Region changed:', region);
          }}>
          {currentLocation && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title={t('map.yourLocation', 'Your Location')}
              description={t('map.currentPosition', 'Current position')}
              pinColor="#6a1b9a"
            />
          )}
        </MapView>
      </View>

      {/* Map Info */}
      <View style={styles.mapInfo}>
        <Text style={styles.mapInfoText}>
          {t('map.usingOpenStreetMap', 'Using OpenStreetMap data')}
        </Text>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={refreshLocation}>
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
  mapInfo: {
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
  mapInfoText: {
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
