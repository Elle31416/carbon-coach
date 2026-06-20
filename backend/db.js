import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'config.json');
const LOCAL_DB_FILE = path.join(__dirname, 'footprint_db.json');

// Initialize configuration file if it doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    geminiApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
    googleApiKey: '',
    googleRedirectUri: 'https://carbon-coach-1-3hu1.onrender.com/oauth2callback',
    homeLocation: 'San Francisco, CA',
    wakeupTime: '07:00', // HH:MM
    firebaseConfig: {
      projectId: '',
      clientEmail: '',
      privateKey: ''
    },
    googleTokens: null // Stores OAuth2 tokens (refresh token, access token)
  }, null, 2));
}

// Initialize local DB file if it doesn't exist
if (!fs.existsSync(LOCAL_DB_FILE)) {
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify({
    footprints: {},
    chats: {}
  }, null, 2));
}

// Helper to get configuration
export function getConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config.json:', error);
    return {};
  }
}

// Helper to save configuration
export function saveConfig(config) {
  try {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2));
    // Re-initialize Firestore if Firebase config was updated
    initFirestore(updatedConfig);
    return updatedConfig;
  } catch (error) {
    console.error('Error saving config.json:', error);
    throw error;
  }
}

// Firestore status and database reference
let db = null;
let isFirestoreEnabled = false;

function initFirestore(config) {
  const fb = config.firebaseConfig || {};
  if (fb.projectId) {
    try {
      // Check if already initialized
      if (admin.apps.length > 0) {
        admin.app().delete();
      }
      
      if (fb.clientEmail && fb.privateKey) {
        // Format private key (replace escaped newlines if any)
        const privateKey = fb.privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: fb.projectId,
            clientEmail: fb.clientEmail,
            privateKey: privateKey,
          })
        });
        console.log(`Firebase Firestore cert-based initialization for project: ${fb.projectId}`);
      } else {
        // Initialize with just projectId (uses Application Default Credentials)
        admin.initializeApp({
          projectId: fb.projectId
        });
        console.log(`Firebase Firestore ADC-based initialization for project: ${fb.projectId}`);
      }

      db = admin.firestore();
      isFirestoreEnabled = true;
      console.log('Firebase Firestore initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Firestore, falling back to local JSON database:', error);
      db = null;
      isFirestoreEnabled = false;
    }
  } else {
    db = null;
    isFirestoreEnabled = false;
    console.log('No Firestore credentials configured. Using local JSON database.');
  }
}

// Initialize on start
initFirestore(getConfig());

// Read local DB
function readLocalDB() {
  try {
    const data = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading footprint_db.json:', error);
    return { footprints: {}, chats: {} };
  }
}

// Write local DB
function writeLocalDB(data) {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to footprint_db.json:', error);
  }
}

export async function getFootprint(date) {
  if (isFirestoreEnabled && db) {
    try {
      const doc = await db.collection('footprints').doc(date).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error(`Error fetching footprint from Firestore for date ${date}:`, error);
    }
  }
  
  // Local DB Fallback
  const localDB = readLocalDB();
  return localDB.footprints[date] || null;
}

export async function saveFootprint(date, footprintData) {
  const dataToSave = {
    date,
    updatedAt: new Date().toISOString(),
    ...footprintData
  };

  if (isFirestoreEnabled && db) {
    try {
      await db.collection('footprints').doc(date).set(dataToSave, { merge: true });
      return dataToSave;
    } catch (error) {
      console.error(`Error saving footprint to Firestore for date ${date}:`, error);
    }
  }

  // Local DB Fallback
  const localDB = readLocalDB();
  localDB.footprints[date] = {
    ...(localDB.footprints[date] || {}),
    ...dataToSave
  };
  writeLocalDB(localDB);
  return dataToSave;
}

export async function getFootprintsHistory(limit = 30) {
  if (isFirestoreEnabled && db) {
    try {
      const snapshot = await db.collection('footprints')
        .orderBy('date', 'desc')
        .limit(limit)
        .get();
      const records = [];
      snapshot.forEach(doc => records.push(doc.data()));
      return records;
    } catch (error) {
      console.error('Error fetching footprint history from Firestore:', error);
    }
  }

  // Local DB Fallback
  const localDB = readLocalDB();
  const sortedDates = Object.keys(localDB.footprints).sort().reverse();
  return sortedDates.slice(0, limit).map(date => localDB.footprints[date]);
}

export async function getChatHistory(date) {
  if (isFirestoreEnabled && db) {
    try {
      const doc = await db.collection('chats').doc(date).get();
      return doc.exists ? doc.data().messages : [];
    } catch (error) {
      console.error(`Error fetching chat history from Firestore for date ${date}:`, error);
    }
  }

  // Local DB Fallback
  const localDB = readLocalDB();
  return localDB.chats[date] || [];
}

export async function saveChatHistory(date, messages) {
  if (isFirestoreEnabled && db) {
    try {
      await db.collection('chats').doc(date).set({
        date,
        messages,
        updatedAt: new Date().toISOString()
      });
      return messages;
    } catch (error) {
      console.error(`Error saving chat history to Firestore for date ${date}:`, error);
    }
  }

  // Local DB Fallback
  const localDB = readLocalDB();
  localDB.chats[date] = messages;
  writeLocalDB(localDB);
  return messages;
}

export function isUsingFirestore() {
  return isFirestoreEnabled;
}
