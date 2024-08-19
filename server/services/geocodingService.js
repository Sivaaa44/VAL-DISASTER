const { Client } = require('@googlemaps/google-maps-services-js');
const mapsClient = new Client({});

async function geocodeAddress(address) {
  console.log(`Geocoding address: ${address}`);
  try {
    const response = await mapsClient.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 10000
    });
    const location = response.data.results[0]?.geometry?.location;
    if (location) {
      console.log('Coordinates found:', location);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.log('No location found for the address');
      return null;
    }
  } catch (error) {
    console.error('Error in geocodeAddress:', error.message);
    return null;
  }
}

module.exports = { geocodeAddress };