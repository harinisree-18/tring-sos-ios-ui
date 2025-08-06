import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import MapView, {Marker, Polyline} from 'react-native-maps';
import database from '@react-native-firebase/database';
import {useTranslation} from 'react-i18next';
import haversine from 'haversine-distance';

const {width, height} = Dimensions.get('window');

export default function LiveLocationScreen({employeeId, employeeName, sosId, onBack}) {
  const {t} = useTranslation();
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);
  const [scoreLabel, setScoreLabel] = useState('');
  const [scoreColor, setScoreColor] = useState('#4CAF50');
  console.log(employeeId, sosId);
  useEffect(() => {
    if (!employeeId || !sosId) return;
    // Listen for the route for this SOS
    const dbReference = database().ref(
      `sos_routes/${employeeId}/${sosId}/locations`,
    );
    console.log('sosId', sosId);
    const handleUpdate = snapshot => {
      const locations = [];
      snapshot.forEach(child => {
        const val = child.val();
        if (val.latitude && val.longitude) {
          locations.push({
            latitude: val.latitude,
            longitude: val.longitude,
            timestamp: val.timestamp,
          });
        }
      });
      setRoute(locations);
      setLoading(false);
    };
    dbReference.on('value', handleUpdate);
    return () => dbReference.off('value', handleUpdate);
  }, [employeeId, sosId]);

  useEffect(() => {
    if (route.length < 2) {
      setScore(null);
      setScoreLabel('');
      setScoreColor('#4CAF50');
      return;
    }
    // Duration (minutes)
    const start = new Date(route[0].timestamp);
    const end = new Date(route[route.length - 1].timestamp);
    const durationMin = (end - start) / 60000;
    // Distance (km)
    let distance = 0;
    for (let i = 1; i < route.length; i++) {
      distance += haversine(route[i - 1], route[i]);
    }
    distance = distance / 1000;
    // Night travel
    let nightTravel = false;
    for (const point of route) {
      const hour = new Date(point.timestamp).getHours();
      if (hour < 6 || hour >= 21) {
        nightTravel = true;
        break;
      }
    }
    // Score logic
    let s = 100;
    if (durationMin > 30) s -= 10;
    if (distance > 5) s -= 10;
    if (nightTravel) s -= 20;
    // Label and color
    let label = t('liveLocation.safe');
    let color = '#4CAF50';
    if (s < 80 && s >= 60) {
      label = t('liveLocation.caution');
      color = '#FFC107';
    } else if (s < 60) {
      label = t('liveLocation.unsafe');
      color = '#F44336';
    }
    setScore(s);
    setScoreLabel(label);
    setScoreColor(color);
  }, [route, t]);

  const startMarker =
    route.length > 0 ? (
      <Marker
        coordinate={route[0]}
        title={t('liveLocation.start')}
        pinColor="green"
      />
    ) : null;
  const endMarker =
    route.length > 1 ? (
      <Marker
        coordinate={route[route.length - 1]}
        title={t('liveLocation.current')}
        pinColor="red"
      />
    ) : null;
  const polyline =
    route.length > 1 ? (
      <Polyline coordinates={route} strokeColor="#6a1b9a" strokeWidth={4} />
    ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {t('liveLocation.title', {employeeName: employeeName || `Citizen ${employeeId}`})}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
      {score !== null && (
        <View style={[styles.scoreContainer, {backgroundColor: scoreColor}]}>
          <Text style={styles.scoreText}>
            {t('liveLocation.safetyScore')}: {score}
          </Text>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6a1b9a"
          style={{marginTop: 40}}
        />
      ) : route.length === 0 ? (
        <Text style={{margin: 20, color: '#888'}}>
          {t('liveLocation.noRouteData')}
        </Text>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: route[0]?.latitude || 20.5937,
            longitude: route[0]?.longitude || 78.9629,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false}>
          {startMarker}
          {endMarker}
          {polyline}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop: 56,
    padding: 16,
    backgroundColor: '#6a1b9a',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'flex-start',
    margin: 2,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  map: {
    width: width,
    height: height - 80,
  },
  scoreContainer: {
    margin: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  scoreLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
