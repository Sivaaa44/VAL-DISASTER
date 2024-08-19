const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(process.env.FIREBASE_APPLICATION_CREDENTIALS);

let db;

function initializeFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  console.log('Firebase initialized');
  return db;
}

function getFirestore() {
  if (!db) {
    throw new Error('Firebase has not been initialized. Call initializeFirebase() first.');
  }
  return db;
}

module.exports = { initializeFirebase, getFirestore };