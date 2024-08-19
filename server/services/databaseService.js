const { MongoClient } = require('mongodb');
const admin = require('firebase-admin');

let db;

async function connectToMongoDB() {
  try {
    const client = await MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true });
    db = client.db(process.env.MONGO_DB_NAME2);
    console.log('Connected to MongoDB');
    await db.command({ ping: 1 });
    console.log("MongoDB connection is active");
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

async function fetchGeoJSONData(db) {
  const collection = db.collection('requests');
  const data = await collection.find({}).toArray();

  const geojson = {
    type: 'FeatureCollection',
    features: data.map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)],
      },
      properties: {
        intensity: parseInt(item.quantity, 10),
        categories: item.categories, // Add this line to include categories
      },
    })),
  };

  return geojson;
}

async function saveDonation(location, resource, quantity) {
  console.log(`Saving donation data to database...`);
  try {
    const donationData = {
      location,
      resource,
      quantity,
      timestamp: new Date()
    };
    await db.collection('donors').insertOne(donationData);
    console.log('Donation data saved successfully');
  } catch (error) {
    console.error('Error saving donation data:', error.message);
    throw error;
  }
}

async function saveToFirestore(collection, data) {
  try {
    const docRef = await admin.firestore().collection(collection).add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Document saved to Firestore with ID: ${docRef.id}`);
  } catch (error) {
    console.error('Error saving to Firestore:', error.message);
    throw error;
  }
}

async function fetchGeoJSONData(db) {
  const collection = db.collection('requests');
  const data = await collection.find({}).toArray();

  const geojson = {
    type: 'FeatureCollection',
    features: data.map((item) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(item.longitude), parseFloat(item.latitude)],
      },
      properties: {
        intensity: parseInt(item.quantity, 10),
        categories: item.categories, // Add this line to include categories
      },
    })),
  };

  return geojson;
}

async function saveVolunteer(firstname,lastname,age,location,phone) {
  console.log(`Saving donation data to database...`);
  try {
    const volunteerData = {
      firstname,
      lastname,
      age,
      location,
      phone,
      timestamp: new Date()
    };
    await db.collection('volunteers').insertOne(volunteerData);
    console.log('Volunteer data saved successfully');
  } catch (error) {
    console.error('Error saving volunteer data:', error.message);
    throw error;
  }
}

async function saveRequest(type, categories, quantity, address, coordinates) {
  console.log(`Saving ${type} request to database...`);
  try {
    const requestData = {
      type,
      categories : [categories, "related"],
      quantity: typeof quantity === 'number' ? quantity : parseInt(quantity, 10),
      address,
      latitude: coordinates?.lat || null,
      longitude: coordinates?.lng || null,
      timestamp: new Date()
    };
    await db.collection('requests').insertOne(requestData);
    console.log(`${type.toUpperCase()} request saved successfully`);
  } catch (error) {
    console.error(`Error saving ${type} request:, error.message`);
    throw error;
  }
}

module.exports = {connectToMongoDB, saveRequest, saveToFirestore , saveDonation, fetchGeoJSONData, saveVolunteer};

