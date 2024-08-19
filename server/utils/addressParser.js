const axios = require('axios');
const flaskServerUrl = process.env.FLASK_SERVER_URL;

async function parseMessage(body) {
  console.log(`Parsing message: ${body}`);
  try {
    const response = await axios.post(`${flaskServerUrl}/process`, { text: body });
    const { address, needs, numbers } = response.data;
    
    const result = {
      location: address,
      message: needs[0] || '',
      quantity: numbers[0] ? parseInt(numbers[0], 10) : null,
      isValid: needs.length > 0
    };
    console.log('Parsed message result:', result);
    return result;
  } catch (error) {
    console.error('Error parsing message:', error.message);
    throw error;
  }
}

module.exports = { parseMessage };