import api from '../components/config/axios';
import backgroundLocationService from './backgroundLocationService';

export const fetchRoutes = userId => {
  if (!userId) return;
  api
    .get(`/routes/user/${userId}`)
    .then(async res => {
      const data = res.data || [];
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
          if (!isValidLatLng(fromLat, fromLon) || !isValidLatLng(toLat, toLon))
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
        await backgroundLocationService.setRoutesForTracking(routesForTracking);
      }
    })
    .catch(err => {
      console.log('Fetch routes error:', err);
    });
};

export const fetchContacts = async userId => {
  if (!userId) return;
  try {
    const response = await api.get(`/user-contacts/by-user/${userId}`);
    const data = response.data || [];
    const contactPhones = data.map(contact => contact.phone);
    return contactPhones;
  } catch (error) {
    console.log('fetch contacts error', error);
  }
};
