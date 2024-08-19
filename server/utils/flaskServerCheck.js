const axios = require('axios');

const flaskServerUrl = process.env.FLASK_SERVER_URL;

async function checkFlaskServer() {
  try {
    await axios.get(`${flaskServerUrl}/health`, { timeout: 5000 });
    console.log('Flask server is accessible');
  } catch (error) {
    console.error('Flask server is not accessible:', error.message);
  }
}

module.exports = { checkFlaskServer };