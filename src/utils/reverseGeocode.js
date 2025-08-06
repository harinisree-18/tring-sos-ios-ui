const cache = {};
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

async function rateLimitedFetch(url, options) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await rateLimitedFetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function getAddressFromCoords(lat, lon) {
  const key = `${lat},${lon}`;
  if (cache[key]) return cache[key];

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
      lat,
    )}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&zoom=16`;

    const res = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'WomenSOS-App/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data || data.error) {
      throw new Error(data?.error || 'Invalid response from geocoding service');
    }

    let address = data.display_name;

    if (data.address) {
      const addr = data.address;
      const parts = [];

      if (addr.road) parts.push(addr.road);
      if (addr.house_number) parts.push(addr.house_number);
      if (addr.suburb && !parts.includes(addr.suburb)) parts.push(addr.suburb);
      if (addr.city && !parts.includes(addr.city)) parts.push(addr.city);
      if (addr.state && !parts.includes(addr.state)) parts.push(addr.state);

      if (parts.length > 0) {
        address = parts.join(', ');
      } else {
        address = data.display_name;
      }
    }

    if (!address || address.length < 5) {
      address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }

    cache[key] = address;
    return address;
  } catch (e) {
    console.error('Geocoding error:', e);
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

// New function to get just the city name
export async function getCityFromCoords(lat, lon) {
  const key = `city_${lat},${lon}`;
  if (cache[key]) return cache[key];

  try {
    // Try with different zoom levels to get better city information
    const urls = [
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&zoom=8`,
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&zoom=10`,
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        lat,
      )}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&zoom=12`,
    ];

    let cityName = 'Unknown Location';

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        if (data.address) {
          const addr = data.address;

          // Priority order for city name extraction
          if (addr.city && addr.city.length > 2) {
            cityName = addr.city;
            break;
          } else if (addr.town && addr.town.length > 2) {
            cityName = addr.town;
            break;
          } else if (addr.municipality && addr.municipality.length > 2) {
            cityName = addr.municipality;
            break;
          } else if (addr.district && addr.district.length > 2) {
            cityName = addr.district;
            break;
          } else if (addr.county && addr.county.length > 2) {
            cityName = addr.county;
            break;
          }
        }

        // If no structured address found, try to extract from display_name
        if (cityName === 'Unknown Location' && data.display_name) {
          const parts = data.display_name.split(', ');

          // Look for city names in the middle to end of the address
          for (
            let i = Math.max(1, Math.floor(parts.length / 3));
            i < parts.length - 1;
            i++
          ) {
            const part = parts[i].trim();
            if (part && part.length > 2 && !/^\d+$/.test(part)) {
              // Skip common non-city terms
              const lowerPart = part.toLowerCase();
              if (
                !lowerPart.includes('street') &&
                !lowerPart.includes('road') &&
                !lowerPart.includes('lane') &&
                !lowerPart.includes('avenue') &&
                !lowerPart.includes('drive') &&
                !lowerPart.includes('place') &&
                !lowerPart.includes('colony') &&
                !lowerPart.includes('nagar') &&
                !lowerPart.includes('layout') &&
                !lowerPart.includes('phase') &&
                !lowerPart.includes('block') &&
                !lowerPart.includes('sector') &&
                !lowerPart.includes('postal') &&
                !lowerPart.includes('pin') &&
                !lowerPart.includes('area') &&
                !lowerPart.includes('zone') &&
                !lowerPart.includes('ward') &&
                !lowerPart.includes('taluk') &&
                !lowerPart.includes('tehsil') &&
                !lowerPart.includes('suburb') &&
                !lowerPart.includes('neighborhood') &&
                !lowerPart.includes('locality')
              ) {
                cityName = part;
                break;
              }
            }
          }

          // If still no city found, try the second-to-last part (often the city)
          if (cityName === 'Unknown Location' && parts.length > 2) {
            const secondLastPart = parts[parts.length - 2].trim();
            if (
              secondLastPart &&
              secondLastPart.length > 2 &&
              !/^\d+$/.test(secondLastPart)
            ) {
              const lowerPart = secondLastPart.toLowerCase();
              if (
                !lowerPart.includes('street') &&
                !lowerPart.includes('road') &&
                !lowerPart.includes('lane') &&
                !lowerPart.includes('avenue') &&
                !lowerPart.includes('drive') &&
                !lowerPart.includes('place') &&
                !lowerPart.includes('colony') &&
                !lowerPart.includes('nagar') &&
                !lowerPart.includes('layout') &&
                !lowerPart.includes('phase') &&
                !lowerPart.includes('block') &&
                !lowerPart.includes('sector') &&
                !lowerPart.includes('postal') &&
                !lowerPart.includes('pin') &&
                !lowerPart.includes('area') &&
                !lowerPart.includes('zone') &&
                !lowerPart.includes('ward') &&
                !lowerPart.includes('taluk') &&
                !lowerPart.includes('tehsil') &&
                !lowerPart.includes('suburb') &&
                !lowerPart.includes('neighborhood') &&
                !lowerPart.includes('locality')
              ) {
                cityName = secondLastPart;
              }
            }
          }
        }

        // If we found a city name, break out of the loop
        if (cityName !== 'Unknown Location') {
          break;
        }
      } catch (e) {
        console.log('Error with URL:', url, e);
        continue;
      }
    }

    // If still no city found, try a broader search
    if (cityName === 'Unknown Location') {
      try {
        const broadUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
          lat,
        )}&lon=${encodeURIComponent(lon)}&format=json&addressdetails=1&zoom=6`;
        const res = await fetch(broadUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.address && data.address.state) {
            cityName = data.address.state;
          }
        }
      } catch (e) {
        console.log('Broad search error:', e);
      }
    }

    cache[key] = cityName;
    return cityName;
  } catch (e) {
    console.error('City geocoding error:', e);
    return 'Location Unavailable';
  }
}
