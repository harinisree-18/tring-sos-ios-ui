import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../components/config/axios';

class GeofencingService {
  constructor() {
    this.watchId = null;
    this.geofences = [];
    this.currentLocation = null;
    this.routeHistory = [];
    this.isTracking = false;
    this.safetyThresholds = {
      safeDistance: 100, // meters from safe zones
      dangerDistance: 50, // meters from danger zones
      updateInterval: 10000, // 10 seconds
    };
    this.safeZones = [];
    this.dangerZones = [];
    this.safetyZones = {safe: [], danger: []};
    this.onLocationUpdate = null;
    this.onSafetyAlert = null;

    // Enhanced safety detection properties
    this.nearbyDevices = [];
    this.crowdDensityData = {};
    this.socialSafetyScore = 0;
    this.safeRouteSegments = [];
    this.deviceUpdateInterval = null;
    this.crowdAnalysisInterval = null;
  }

  // Request location permissions
  async requestPermissions() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location for safety monitoring',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  // Initialize geofencing service
  async initialize(onLocationUpdate, onSafetyAlert) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    this.onLocationUpdate = onLocationUpdate;
    this.onSafetyAlert = onSafetyAlert;

    // Load saved zones and settings
    await this.loadSavedData();

    // Fetch safety zones from API
    await this.fetchSafetyZones();
  }

  // Load saved data from AsyncStorage
  async loadSavedData() {
    try {
      const savedGeofences = await AsyncStorage.getItem('safety_geofences');
      const savedRouteHistory = await AsyncStorage.getItem('route_history');

      if (savedGeofences) {
        this.geofences = JSON.parse(savedGeofences);
      }

      if (savedRouteHistory) {
        this.routeHistory = JSON.parse(savedRouteHistory);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }

  // Save data to AsyncStorage
  async saveData() {
    try {
      await AsyncStorage.setItem(
        'safety_geofences',
        JSON.stringify(this.geofences),
      );
      await AsyncStorage.setItem(
        'route_history',
        JSON.stringify(this.routeHistory),
      );
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Fetch safety zones from API
  async fetchSafetyZones() {
    try {
      const response = await api.get('/safety-zones');
      const zones = response.data || [];

      this.safeZones = zones.filter(zone => zone.type === 'safe');
      this.dangerZones = zones.filter(zone => zone.type === 'danger');

      // Convert zones to geofences
      this.geofences = [
        ...this.safeZones.map(zone => ({
          id: `safe_${zone.id}`,
          latitude: parseFloat(zone.latitude),
          longitude: parseFloat(zone.longitude),
          radius: zone.radius || 100,
          type: 'safe',
          name: zone.name,
          description: zone.description,
        })),
        ...this.dangerZones.map(zone => ({
          id: `danger_${zone.id}`,
          latitude: parseFloat(zone.latitude),
          longitude: parseFloat(zone.longitude),
          radius: zone.radius || 50,
          type: 'danger',
          name: zone.name,
          description: zone.description,
        })),
      ];

      // Update safety zones state for map display
      this.safetyZones = {
        safe: this.safeZones,
        danger: this.dangerZones,
      };

      await this.saveData();
    } catch (error) {
      console.error('Error fetching safety zones:', error);
      // Fallback to default zones if API fails
      this.setupDefaultZones();
    }
  }

  // Setup default safety zones as fallback
  setupDefaultZones() {
    this.safeZones = [
      {
        id: 1,
        name: 'Central Police Station',
        description: '24/7 police presence, well-lit area',
        latitude: 13.0827,
        longitude: 80.2707,
        radius: 200,
      },
      {
        id: 2,
        name: 'Government General Hospital',
        description: 'Major hospital with security',
        latitude: 13.0827,
        longitude: 80.2707,
        radius: 300,
      },
    ];

    this.dangerZones = [
      {
        id: 3,
        name: 'Industrial Area - Night',
        description: 'Poorly lit industrial area, limited security',
        latitude: 13.0827,
        longitude: 80.2707,
        radius: 150,
      },
    ];

    this.geofences = [
      ...this.safeZones.map(zone => ({
        id: `safe_${zone.id}`,
        latitude: zone.latitude,
        longitude: zone.longitude,
        radius: zone.radius,
        type: 'safe',
        name: zone.name,
        description: zone.description,
      })),
      ...this.dangerZones.map(zone => ({
        id: `danger_${zone.id}`,
        latitude: zone.latitude,
        longitude: zone.longitude,
        radius: zone.radius,
        type: 'danger',
        name: zone.name,
        description: zone.description,
      })),
    ];

    // Update safety zones state for map display
    this.safetyZones = {
      safe: this.safeZones,
      danger: this.dangerZones,
    };
  }

  // Start location tracking
  startTracking() {
    if (this.isTracking) return;

    if (!Geolocation) {
      console.error('Geolocation service is not available');
      return;
    }

    this.isTracking = true;

    this.watchId = Geolocation.watchPosition(
      position => {
        this.handleLocationUpdate(position);
      },
      error => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5, // Update every 5 meters for better accuracy
        interval: this.safetyThresholds.updateInterval,
        fastestInterval: 3000, // Faster updates for better responsiveness
        accuracy: {
          android: 'high',
          ios: 'best',
        },
      },
    );
  }

  // Stop location tracking
  stopTracking() {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  // Handle location updates
  handleLocationUpdate(position) {
    const {latitude, longitude} = position.coords;
    const timestamp = new Date().toISOString();

    this.currentLocation = {latitude, longitude, timestamp};

    // Add to route history
    this.routeHistory.push({
      latitude,
      longitude,
      timestamp,
      safety: this.analyzeRouteSafety(latitude, longitude),
    });

    // Keep only last 1000 points
    if (this.routeHistory.length > 1000) {
      this.routeHistory = this.routeHistory.slice(-1000);
    }

    // Analyze safety
    const safetyAnalysis = this.analyzeRouteSafety(latitude, longitude);

    // Check geofences
    const nearbyGeofences = this.checkNearbyGeofences(latitude, longitude);

    // Call callbacks
    if (this.onLocationUpdate) {
      this.onLocationUpdate({
        location: {latitude, longitude, timestamp},
        safety: safetyAnalysis,
        nearbyGeofences,
      });
    }

    // Trigger safety alerts
    if (safetyAnalysis.basicSafety.isInDangerZone && this.onSafetyAlert) {
      this.onSafetyAlert({
        type: 'danger_zone',
        location: {latitude, longitude},
        message: `You are in a danger zone: ${safetyAnalysis.basicSafety.nearestDangerZone?.name}`,
        severity: 'high',
      });
    }

    // Save data periodically
    if (this.routeHistory.length % 10 === 0) {
      this.saveData();
    }
  }

  // Enhanced safety analysis with social indicators
  analyzeRouteSafety(latitude, longitude) {
    const timestamp = new Date().toISOString();

    // Basic safety analysis
    const basicSafety = this.performBasicSafetyAnalysis(latitude, longitude);

    // Enhanced social safety analysis
    const socialSafety = this.analyzeSocialSafetyIndicators(
      latitude,
      longitude,
    );

    // Combined safety score
    const combinedSafetyScore = this.calculateCombinedSafetyScore(
      basicSafety,
      socialSafety,
    );

    // Route safety analysis
    const routeSafety = this.analyzeRouteSegmentSafety(latitude, longitude);

    const safetyAnalysis = {
      timestamp,
      location: {latitude, longitude},
      safetyScore: combinedSafetyScore,
      basicSafety: {
        isInSafeZone: basicSafety.isInSafeZone,
        isInDangerZone: basicSafety.isInDangerZone,
        nearestSafeZone: basicSafety.nearestSafeZone,
        nearestDangerZone: basicSafety.nearestDangerZone,
        score: basicSafety.score,
      },
      socialSafety: {
        nearbyDevices: socialSafety.nearbyDevices,
        crowdDensity: socialSafety.crowdDensity,
        socialSafetyScore: socialSafety.socialSafetyScore,
        peopleNearby: socialSafety.peopleNearby,
        deviceDensity: socialSafety.deviceDensity,
      },
      routeSafety: {
        segmentSafety: routeSafety.segmentSafety,
        recommendedRoute: routeSafety.recommendedRoute,
        alternativeRoutes: routeSafety.alternativeRoutes,
        crowdLevel: routeSafety.crowdLevel,
      },
      recommendations: this.generateSafetyRecommendations(
        combinedSafetyScore,
        socialSafety,
        basicSafety,
      ),
      severity: this.determineAlertSeverity(combinedSafetyScore),
    };

    return safetyAnalysis;
  }

  // Analyze social safety indicators
  analyzeSocialSafetyIndicators(latitude, longitude) {
    const nearbyDevices = this.getNearbyDevices(latitude, longitude);
    const crowdDensity = this.calculateCrowdDensity(latitude, longitude);
    const peopleNearby = this.countPeopleNearby(latitude, longitude);
    const deviceDensity = this.calculateDeviceDensity(latitude, longitude);

    // Social safety score based on crowd presence
    let socialSafetyScore = 50; // Base score

    // Higher score for more people nearby (safety in numbers)
    if (peopleNearby > 10) {
      socialSafetyScore += 30;
    } else if (peopleNearby > 5) {
      socialSafetyScore += 20;
    } else if (peopleNearby > 2) {
      socialSafetyScore += 10;
    } else if (peopleNearby === 0) {
      socialSafetyScore -= 20; // Isolated area
    }

    // Higher score for more devices (more people with safety apps)
    if (deviceDensity > 5) {
      socialSafetyScore += 15;
    } else if (deviceDensity > 2) {
      socialSafetyScore += 10;
    }

    // Adjust based on crowd density
    if (crowdDensity === 'high') {
      socialSafetyScore += 20;
    } else if (crowdDensity === 'medium') {
      socialSafetyScore += 10;
    } else if (crowdDensity === 'low') {
      socialSafetyScore -= 10;
    }

    // Cap the score
    socialSafetyScore = Math.max(0, Math.min(100, socialSafetyScore));

    return {
      nearbyDevices,
      crowdDensity,
      socialSafetyScore,
      peopleNearby,
      deviceDensity,
    };
  }

  // Get nearby devices from the network
  getNearbyDevices(latitude, longitude) {
    // In a real implementation, this would fetch from your backend
    // For now, we'll simulate nearby devices
    const mockDevices = [
      {
        id: 1,
        latitude: latitude + 0.0001,
        longitude: longitude + 0.0001,
        lastSeen: new Date().toISOString(),
      },
      {
        id: 2,
        latitude: latitude - 0.0002,
        longitude: longitude + 0.0003,
        lastSeen: new Date().toISOString(),
      },
      {
        id: 3,
        latitude: latitude + 0.0003,
        longitude: longitude - 0.0001,
        lastSeen: new Date().toISOString(),
      },
    ];

    return mockDevices.filter(device => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        device.latitude,
        device.longitude,
      );
      return distance <= 500; // 500 meters radius
    });
  }

  // Calculate crowd density based on nearby devices and historical data
  calculateCrowdDensity(latitude, longitude) {
    const nearbyDevices = this.getNearbyDevices(latitude, longitude);
    const deviceCount = nearbyDevices.length;

    if (deviceCount > 10) return 'high';
    if (deviceCount > 5) return 'medium';
    if (deviceCount > 2) return 'low';
    return 'very_low';
  }

  // Count people nearby (estimated from devices)
  countPeopleNearby(latitude, longitude) {
    const nearbyDevices = this.getNearbyDevices(latitude, longitude);
    return nearbyDevices.length;
  }

  // Calculate device density in the area
  calculateDeviceDensity(latitude, longitude) {
    const nearbyDevices = this.getNearbyDevices(latitude, longitude);
    const area = Math.PI * 0.5 * 0.5; // 500m radius area in km²
    return nearbyDevices.length / area;
  }

  // Analyze route segment safety with social indicators
  analyzeRouteSegmentSafety(latitude, longitude) {
    const currentSegment = this.identifyRouteSegment(latitude, longitude);
    const socialIndicators = this.analyzeSocialSafetyIndicators(
      latitude,
      longitude,
    );

    let segmentSafety = 'moderate';
    let crowdLevel = 'low';

    // Determine segment safety based on social indicators
    if (socialIndicators.socialSafetyScore > 70) {
      segmentSafety = 'safe';
      crowdLevel = 'high';
    } else if (socialIndicators.socialSafetyScore > 50) {
      segmentSafety = 'moderate';
      crowdLevel = 'medium';
    } else {
      segmentSafety = 'unsafe';
      crowdLevel = 'low';
    }

    // Generate recommended routes
    const recommendedRoute = this.generateRecommendedRoute(
      latitude,
      longitude,
      socialIndicators,
    );
    const alternativeRoutes = this.findAlternativeRoutes(latitude, longitude);

    return {
      segmentSafety,
      recommendedRoute,
      alternativeRoutes,
      crowdLevel,
    };
  }

  // Identify current route segment
  identifyRouteSegment(latitude, longitude) {
    // Analyze the current area and classify it
    const socialIndicators = this.analyzeSocialSafetyIndicators(
      latitude,
      longitude,
    );
    const basicSafety = this.performBasicSafetyAnalysis(latitude, longitude);

    return {
      coordinates: {latitude, longitude},
      socialSafety: socialIndicators.socialSafetyScore,
      basicSafety: basicSafety.score,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate recommended route based on social safety
  generateRecommendedRoute(currentLat, currentLon, socialIndicators) {
    // In a real implementation, this would use a routing algorithm
    // For now, we'll provide basic recommendations

    const recommendations = [];

    if (socialIndicators.socialSafetyScore < 50) {
      recommendations.push({
        type: 'avoid',
        reason: 'Low crowd density - consider alternative route',
        priority: 'high',
      });
    }

    if (socialIndicators.peopleNearby < 3) {
      recommendations.push({
        type: 'caution',
        reason: 'Few people nearby - stay alert',
        priority: 'medium',
      });
    }

    if (socialIndicators.crowdDensity === 'high') {
      recommendations.push({
        type: 'recommend',
        reason: 'High crowd density - safer area',
        priority: 'high',
      });
    }

    return recommendations;
  }

  // Find alternative routes
  findAlternativeRoutes(latitude, longitude) {
    // Simulate alternative routes with different safety levels
    return [
      {
        id: 1,
        name: 'Main Street Route',
        safetyScore: 85,
        crowdLevel: 'high',
        distance: 1.2,
        reason: 'Well-lit, high traffic area',
      },
      {
        id: 2,
        name: 'Park Route',
        safetyScore: 65,
        crowdLevel: 'medium',
        distance: 0.8,
        reason: 'Moderate crowd, good lighting',
      },
      {
        id: 3,
        name: 'Residential Route',
        safetyScore: 45,
        crowdLevel: 'low',
        distance: 1.5,
        reason: 'Quiet area, limited visibility',
      },
    ];
  }

  // Calculate combined safety score
  calculateCombinedSafetyScore(basicSafety, socialSafety) {
    // Weight basic safety more heavily (60%) than social safety (40%)
    const basicWeight = 0.6;
    const socialWeight = 0.4;

    const combinedScore =
      basicSafety.score * basicWeight +
      socialSafety.socialSafetyScore * socialWeight;
    return Math.round(combinedScore);
  }

  // Generate safety recommendations based on combined analysis
  generateSafetyRecommendations(combinedScore, socialSafety, basicSafety) {
    const recommendations = [];

    // Social safety recommendations
    if (socialSafety.peopleNearby < 3) {
      recommendations.push('Consider taking a route with more people nearby');
    }

    if (socialSafety.crowdDensity === 'very_low') {
      recommendations.push('Avoid isolated areas - choose busier routes');
    }

    if (socialSafety.deviceDensity < 2) {
      recommendations.push('Few safety devices nearby - stay extra alert');
    }

    // Basic safety recommendations
    if (basicSafety.isInDangerZone) {
      recommendations.push(
        'You are in a high-risk area - move to a safer location immediately',
      );
    }

    if (combinedScore < 40) {
      recommendations.push('Consider calling a friend or family member');
      recommendations.push('Stay in well-lit, populated areas');
    }

    if (combinedScore > 80) {
      recommendations.push('You are in a safe area with good social presence');
    }

    return recommendations;
  }

  // Start enhanced tracking with social safety monitoring
  startTracking() {
    if (this.isTracking) return;

    if (!Geolocation) {
      console.error('Geolocation service is not available');
      return;
    }

    this.isTracking = true;

    // Start location tracking
    this.watchId = Geolocation.watchPosition(
      position => {
        this.handleLocationUpdate(position);
      },
      error => {
        console.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: this.safetyThresholds.updateInterval,
        fastestInterval: 5000,
      },
    );

    // Start social safety monitoring
    this.startSocialSafetyMonitoring();
  }

  // Start social safety monitoring
  startSocialSafetyMonitoring() {
    // Update nearby devices every 30 seconds
    this.deviceUpdateInterval = setInterval(() => {
      this.updateNearbyDevices();
    }, 30000);

    // Analyze crowd patterns every minute
    this.crowdAnalysisInterval = setInterval(() => {
      this.analyzeCrowdPatterns();
    }, 60000);
  }

  // Stop enhanced tracking
  stopTracking() {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.deviceUpdateInterval) {
      clearInterval(this.deviceUpdateInterval);
      this.deviceUpdateInterval = null;
    }

    if (this.crowdAnalysisInterval) {
      clearInterval(this.crowdAnalysisInterval);
      this.crowdAnalysisInterval = null;
    }

    this.isTracking = false;
  }

  // Update nearby devices data
  updateNearbyDevices() {
    if (this.currentLocation) {
      this.nearbyDevices = this.getNearbyDevices(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
      );
    }
  }

  // Analyze crowd patterns over time
  analyzeCrowdPatterns() {
    // Analyze historical crowd data to identify patterns
    // This could help predict safer times to travel
    console.log('Analyzing crowd patterns...');
  }

  // Get enhanced route safety analysis
  getEnhancedRouteSafetyAnalysis() {
    const analysis = {
      currentLocation: this.currentLocation,
      nearbyDevices: this.nearbyDevices,
      crowdDensity: this.calculateCrowdDensity(
        this.currentLocation?.latitude || 0,
        this.currentLocation?.longitude || 0,
      ),
      socialSafetyScore: this.socialSafetyScore,
      safeRouteSegments: this.safeRouteSegments,
      recommendations: this.generateRouteRecommendations(),
    };

    return analysis;
  }

  // Generate route recommendations based on social safety
  generateRouteRecommendations() {
    const recommendations = [];

    if (this.nearbyDevices.length < 3) {
      recommendations.push({
        type: 'warning',
        message: 'Few people nearby - consider alternative route',
        priority: 'high',
      });
    }

    if (this.socialSafetyScore < 50) {
      recommendations.push({
        type: 'caution',
        message: 'Low social safety score - stay alert',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  // Perform basic safety analysis (original logic)
  performBasicSafetyAnalysis(latitude, longitude) {
    const analysis = {
      isInSafeZone: false,
      isInDangerZone: false,
      nearestSafeZone: null,
      nearestDangerZone: null,
      score: 100, // 0-100, higher is safer
    };

    // Check safe zones
    let nearestSafeDistance = Infinity;
    this.safeZones.forEach(zone => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.latitude,
        zone.longitude,
      );
      if (distance <= zone.radius) {
        analysis.isInSafeZone = true;
        analysis.score = Math.max(analysis.score, 80);
      }
      if (distance < nearestSafeDistance) {
        nearestSafeDistance = distance;
        analysis.nearestSafeZone = {...zone, distance};
      }
    });

    // Check danger zones
    let nearestDangerDistance = Infinity;
    this.dangerZones.forEach(zone => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.latitude,
        zone.longitude,
      );
      if (distance <= zone.radius) {
        analysis.isInDangerZone = true;
        analysis.score = Math.min(analysis.score, 20);
      }
      if (distance < nearestDangerDistance) {
        nearestDangerDistance = distance;
        analysis.nearestDangerZone = {...zone, distance};
      }
    });

    // Calculate safety score based on distances
    if (nearestDangerDistance < 200) {
      analysis.score = Math.min(analysis.score, 50);
    }

    if (nearestSafeDistance < 500) {
      analysis.score = Math.max(analysis.score, 70);
    }

    return analysis;
  }

  // Determine alert severity based on safety score
  determineAlertSeverity(safetyScore) {
    if (safetyScore < 30) return 'high';
    if (safetyScore < 60) return 'medium';
    return 'low';
  }

  // Check nearby geofences
  checkNearbyGeofences(latitude, longitude) {
    const nearby = [];

    this.geofences.forEach(geofence => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        geofence.latitude,
        geofence.longitude,
      );
      if (distance <= geofence.radius * 1.5) {
        // Check within 1.5x radius for early warning
        nearby.push({
          ...geofence,
          distance,
          isInside: distance <= geofence.radius,
        });
      }
    });

    return nearby.sort((a, b) => a.distance - b.distance);
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Get route safety analysis
  getRouteSafetyAnalysis() {
    if (this.routeHistory.length < 2) {
      return {safety: 'unknown', route: []};
    }

    const route = this.routeHistory.map(point => ({
      ...point,
      safety: this.analyzeRouteSafety(point.latitude, point.longitude),
    }));

    const safetyScores = route.map(point => point.safety.safetyScore);
    const averageSafety =
      safetyScores.reduce((a, b) => a + b, 0) / safetyScores.length;

    let overallSafety = 'safe';
    if (averageSafety < 30) overallSafety = 'dangerous';
    else if (averageSafety < 60) overallSafety = 'warning';

    return {
      safety: overallSafety,
      averageScore: averageSafety,
      route,
      dangerPoints: route.filter(
        point => point.safety.basicSafety.isInDangerZone,
      ),
      safePoints: route.filter(point => point.safety.basicSafety.isInSafeZone),
    };
  }

  // Add custom geofence
  addGeofence(geofence) {
    this.geofences.push({
      id: `custom_${Date.now()}`,
      ...geofence,
    });
    this.saveData();
  }

  // Remove geofence
  removeGeofence(id) {
    this.geofences = this.geofences.filter(g => g.id !== id);
    this.saveData();
  }

  // Get current location
  getCurrentLocation() {
    return this.currentLocation;
  }

  // Check if geolocation is available
  isGeolocationAvailable() {
    return !!Geolocation;
  }

  // Get route history
  getRouteHistory() {
    return this.routeHistory;
  }

  // Get safety zones
  getSafetyZones() {
    return this.safetyZones;
  }

  // Clear route history
  clearRouteHistory() {
    this.routeHistory = [];
    this.saveData();
  }

  // Update safety thresholds
  updateSafetyThresholds(thresholds) {
    this.safetyThresholds = {...this.safetyThresholds, ...thresholds};
  }
}

export default new GeofencingService();
