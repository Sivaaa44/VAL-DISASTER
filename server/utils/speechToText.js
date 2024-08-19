const { SpeechClient } = require('@google-cloud/speech');
const axios = require('axios');
const fs = require('fs');
const { geocodeAddress } = require('../services/geocodingService');
const { saveRequest } = require('../services/databaseService');

const speechClient = new SpeechClient();
const ivrAccountSid = process.env.TWILIO_IVR_ACCOUNT_SID;
const ivrAuthToken = process.env.TWILIO_IVR_AUTH_TOKEN;

async function fetchRecordingWithRetry(recordingSid, retries = 5, delayMs = 2000) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ivrAccountSid}/Recordings/${recordingSid}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`IVR: Attempt ${attempt} to fetch recording...`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        auth: { username: ivrAccountSid, password: ivrAuthToken }
      });
      return response.data;
    } catch (error) {
      if (attempt < retries && error.response && error.response.status === 404) {
        console.log(`IVR: Recording not found (404). Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('IVR: Error fetching recording:', error.message);
        throw error;
      }
    }
  }
  throw new Error(`IVR: Failed to fetch recording after ${retries} attempts`);
}

async function convertSpeechToText(fileName) {
  console.log(`IVR: Starting speech-to-text conversion for file: ${fileName}`);
  try {
    const file = fs.readFileSync(fileName);
    const audioBytes = file.toString('base64');
    const audio = { content: audioBytes };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 8000,
      languageCode: 'en-IN',
    };
    const [response] = await speechClient.recognize({ audio, config });
    if (response.results && response.results.length > 0) {
      const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');
      console.log('IVR: Transcription result:', transcription);
      return transcription;
    } else {
      console.log('IVR: No transcription results found');
      return null;
    }
  } catch (error) {
    console.error('IVR: Error in convertSpeechToText:', error.message);
    throw error;
  }
}

async function processRecording(recordingSid, categories, quantity) {
  let fileName;
  try {
    console.log(`IVR: Processing recording for ${categories}, quantity: ${quantity}`);
    const audioContent = await fetchRecordingWithRetry(recordingSid);
    console.log(`IVR: Audio content length: ${audioContent.length} bytes`);
    fileName = `recording-${Date.now()}.wav`;
    fs.writeFileSync(fileName, audioContent);
    console.log(`IVR: Audio file saved as ${fileName}`);
    const address = await convertSpeechToText(fileName);
    console.log('IVR: Address transcribed:', address);
    if (!address) {
      console.error('IVR: Failed to transcribe address');
      return;
    }
    const coordinates = await geocodeAddress(address);
    if (coordinates) {
      console.log('IVR: Coordinates found:', coordinates);
    } else {
      console.log('IVR: Could not find coordinates for the address');
    }
    await saveRequest('ivr', categories, quantity, address, coordinates);
    console.log('IVR: Request saved successfully');
  } catch (error) {
    console.error('IVR: Error in processRecording:', error.message);
    throw error;
  } finally {
    if (fileName) {
      fs.unlink(fileName, err => {
        if (err) console.error('IVR: Error deleting audio file:', err.message);
        else console.log(`IVR: Deleted audio file: ${fileName}`);
      });
    }
  }
}

module.exports = { processRecording };