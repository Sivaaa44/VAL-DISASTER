require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { connectToMongoDB, saveDonation, fetchGeoJSONData, saveVolunteer, saveRequest } = require('./server/services/databaseService');
const smsRoutes = require('./server/routes/smsRoutes');
const ivrRoutes = require('./server/routes/ivrRoutes');
const { initializeFirebase } = require('./server/config/firebase');
const ngrok = require('ngrok');
const portfinder = require('portfinder');
const { spawn } = require('child_process');
const { twilioSmsClient, twilioIvrClient } = require('./server/config/twilio');
const cors = require('cors');
const schedule = require('node-schedule');
const { geocodeAddress } = require('./server/services/geocodingService');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('public'));

// Python
const pythonProcess = spawn('python', ['python/app.py']);

pythonProcess.stdout.on('data', (data) => {
  console.log(`Python stdout: ${data}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`Python stderr: ${data}`);
});

const runPythonScript = (scriptName) => {
  const pythonProcess = spawn('python', [`D:/projects/VALpython/${scriptName}`]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python stdout (${scriptName}): ${data}`);
  });

  // pythonProcess.stderr.on('data', (data) => {
  //   console.error(`Python stderr (${scriptName}): ${data}`);
  // });
};

let db;

// Connect to MongoDB and start servers only after the connection is established
async function initializeDatabaseAndServers() {
  try {
    db = await connectToMongoDB();
    console.log('MongoDB connected and assigned to "db"');

    // Start servers
    await startServer('SMS');
    await startServer('IVR/VOICE');
  } catch (err) {
    console.error('Error initializing database or starting servers:', err);
  }
}

// Ngrok and update Twilio
async function startServer(type) {
  let retries = 3;
  while (retries > 0) {
    try {
      const port = await portfinder.getPortPromise();
      const server = app.listen(port, () => console.log(`${type} server running on port ${port}`));
      const url = await ngrok.connect(port);
      initializeFirebase(); // Assuming Firebase initialization is independent of MongoDB
      console.log(`${type} Ngrok tunnel established at: ${url}`);
      console.log(`Set your ${type} Twilio webhook to: ${url}/${type.toLowerCase()}`);
      await updateTwilioWebhook(type, url);
      console.log(`${type} server setup completed successfully`);
      return;
    } catch (error) {
      console.error(`Error in ${type} server setup:`, error);
      retries--;
      if (retries === 0) {
        console.error(`Failed to start ${type} server after 3 attempts`);
      } else {
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

async function updateTwilioWebhook(type, url) {
  const client = type === 'SMS' ? twilioSmsClient : twilioIvrClient;
  const sidEnvVar = type === 'SMS' ? 'TWILIO_SMS2_PHONE_NUMBER_SID' : 'TWILIO_IVR_PHONE_NUMBER_SID';
  try {
    const phoneNumber = await client.incomingPhoneNumbers(process.env[sidEnvVar]).fetch();
    await phoneNumber.update({
      smsUrl: `${url}/${type.toLowerCase()}`,
      voiceUrl: `${url}/${type.toLowerCase()}`
    });
    console.log(`${type} Twilio webhook updated to: ${url}/${type.toLowerCase()}`);
  } catch (error) {
    console.error(`Error updating ${type} Twilio webhook:`, error);
  }
}

// Routes
app.use('/sms', smsRoutes);
app.use('/ivr', ivrRoutes);

app.post('/api/donate', async (req, res) => {
  try {
    const { location, resource, quantity } = req.body;
    // Save donation data to the database
    await saveDonation(location, resource, quantity);
    res.status(201).json({ message: 'Donation submitted successfully' });
  } catch (error) {
    console.error('Error submitting donation:', error);
    res.status(500).json({ message: 'Error submitting donation' });
  }
});


app.post('/api/volunteer', async (req, res) => {
  try {
    const { firstname, lastname, age, location, phone } = req.body;
    // Save donation data to the database
    await saveVolunteer(firstname, lastname, age, location, phone);
    res.status(201).json({ message: 'Volunteer submitted successfully' });
  } catch (error) {
    console.error('Error submitting donation:', error);
    res.status(500).json({ message: 'Error submitting volunteer' });
  }
});


//GeoJson
app.get('/api/geojson', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const data = await fetchGeoJSONData(db);

    // Log detailed information for each feature
    console.log('Fetched GeoJSON Data:');
    data.features.forEach((feature, index) => {
      console.log(`Feature ${index + 1}:`);
      console.log('Type:', feature.type);
      console.log('Geometry:', feature.geometry);
      console.log('Properties:', feature.properties);
    });

    console.log('Total number of data points:', data.features.length);
    res.json(data);
  } catch (error) {
    console.error('Error fetching GeoJSON data:', error);
    res.status(500).json({ message: 'Error fetching data' });
  }
});

app.post('/api/emergency-request', async (req, res) => {
  try {
    const { resource, location, quantity } = req.body;

    // Geocode the address
    const coordinates = await geocodeAddress(location);
    if (!coordinates) {
      return res.status(400).json({ message: 'Unable to geocode the provided address' });
    }

    // Create categories array with the resource and "related"
    const categories = resource;

    // Save the request to the database
    await saveRequest('web', categories, quantity, location, coordinates);

    res.status(201).json({ message: 'Emergency request submitted successfully' });
  } catch (error) {
    console.error('Error processing emergency request:', error);
    res.status(500).json({ message: 'Error submitting emergency request' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).send('Something broke!');
});

// Initialize database and servers
initializeDatabaseAndServers();

const port = 10000 || 3002;

async function startTwitterServer() {
  try {

    app.listen(port, async () => {
      console.log(`Server is running on port ${port}`);
    });
    schedule.scheduleJob('* * * * *', () => {

      // runPythonScript('tweet_retrieval.py');
      runPythonScript('p.py');
      runPythonScript('combinedmk2.py'); 
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
startTwitterServer();