import Geolocation from '@react-native-community/geolocation';

// Cache for geocoding results
const cache = {};

/**
 * Get city name from coordinates using a simple reverse geocoding approach
 * This uses a free geocoding service that works well for city names
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string>} - City name
 */
export async function getCityFromCoords(latitude, longitude) {
  const key = `city_${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (cache[key]) return cache[key];
  
  try {
    // Use a free geocoding service that's reliable for city names
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Priority order: city > locality > principalSubdivision
    let cityName = 'Location Unavailable';
    
    if (data && data.city) {
      // City field is usually the main city name
      cityName = data.city;
    } else if (data && data.locality) {
      // Check if locality is actually a major city or just a suburb
      const locality = data.locality.toLowerCase();
      
      // List of major Indian cities to prioritize
      const majorCities = [
        'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 
        'pune', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 
        'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 
        'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 
        'meerut', 'rajkot', 'kalyan', 'vasai', 'vijayawada', 'jabalpur', 
        'gwalior', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli', 
        'vadodara', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 
        'amritsar', 'allahabad', 'ranchi', 'howrah', 'cochin', 'bhubaneswar',
        'goa', 'panaji', 'margao', 'vasco da gama', 'mapusa', 'ponda'
      ];
      
      if (majorCities.includes(locality)) {
        cityName = data.locality;
      } else {
        // If locality is not a major city, try to get the main city from other fields
        if (data.city) {
          cityName = data.city;
        } else if (data.principalSubdivision) {
          cityName = data.principalSubdivision;
        }
      }
    } else if (data && data.principalSubdivision) {
      cityName = data.principalSubdivision;
    }
    
    // If we still don't have a good city name, try a broader search
    if (cityName === 'Location Unavailable' || cityName.length < 3) {
      // Try with a broader zoom level to get the main city
      const broadUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en&localityLevel=city`;
      
      try {
        const broadResponse = await fetch(broadUrl);
        const broadData = await broadResponse.json();
        
        if (broadData && broadData.city) {
          cityName = broadData.city;
        } else if (broadData && broadData.locality) {
          cityName = broadData.locality;
        }
      } catch (broadError) {
        console.log('Broad search failed:', broadError);
      }
    }
    
    cache[key] = cityName;
    return cityName;
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Location Unavailable';
  }
}

/**
 * Get current location and city name
 * @returns {Promise<{latitude: number, longitude: number, city: string}>}
 */
export async function getCurrentLocationAndCity() {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const city = await getCityFromCoords(latitude, longitude);
          resolve({ latitude, longitude, city });
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

/**
 * Update location periodically and return city name
 * @param {Function} setLocation - Function to update location state
 */
export async function updateLocation(setLocation) {
  try {
    const { city } = await getCurrentLocationAndCity();
    setLocation(city);
  } catch (error) {
    console.error('Error updating location:', error);
    setLocation('Location Unavailable');
  }
} 