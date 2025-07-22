// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { 
    getFirestore,
    collection as firebaseCollection,
    addDoc as firebaseAddDoc,
    getDocs as firebaseGetDocs,
    doc as firebaseDoc,
    updateDoc as firebaseUpdateDoc,
    deleteDoc as firebaseDeleteDoc,
    query as firebaseQuery,
    orderBy as firebaseOrderBy,
    where as firebaseWhere,
    onSnapshot as firebaseOnSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase configuration - uses environment variables or defaults to empty for security
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY || "",
    authDomain: window.FIREBASE_AUTH_DOMAIN || "",
    projectId: window.FIREBASE_PROJECT_ID || "",
    storageBucket: window.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: window.FIREBASE_APP_ID || "",
    measurementId: window.FIREBASE_MEASUREMENT_ID || ""
};

// Debug: Log which environment variables are available
console.log('=== Firebase Configuration Debug ===');
console.log('Current hostname:', window.location.hostname);
console.log('Is Production?', window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
console.log('Environment variables check:');
console.log('FIREBASE_API_KEY:', window.FIREBASE_API_KEY ? 'SET (' + window.FIREBASE_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
console.log('FIREBASE_AUTH_DOMAIN:', window.FIREBASE_AUTH_DOMAIN ? 'SET' : 'NOT SET');
console.log('FIREBASE_PROJECT_ID:', window.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
console.log('FIREBASE_APP_ID:', window.FIREBASE_APP_ID ? 'SET (' + window.FIREBASE_APP_ID.substring(0, 15) + '...)' : 'NOT SET');

console.log('Firebase config object:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId,
    projectId: firebaseConfig.projectId || 'NOT_SET'
});

// Initialize Firebase
let db, analytics;

// Check if we have valid Firebase config
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

console.log('Has valid Firebase config:', hasValidConfig);

if (hasValidConfig) {
    try {
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        analytics = getAnalytics(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw new Error('Firebase configuration is invalid. Please check your environment variables.');
    }
} else {
    // For local development without Firebase config
    console.warn('Firebase configuration not found. This is expected for local development.');
    console.warn('For production deployment, make sure to set Firebase environment variables.');
    
    // Create a simple alert for users
    if (typeof window !== 'undefined') {
        setTimeout(() => {
            alert('This application requires Firebase configuration for production use. Please set up Firebase credentials for full functionality.');
        }, 1000);
    }
    
    // Create minimal db object to prevent errors
    db = null;
    analytics = null;
}

// Firebase function wrappers that handle missing configuration
const collection = function(db, path) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseCollection(db, path);
};

const addDoc = async function(collectionRef, data) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseAddDoc(collectionRef, data);
};

const getDocs = async function(queryRef) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseGetDocs(queryRef);
};

const doc = function(database, path, id) {
    if (!database) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseDoc(database, path, id);
};

const updateDoc = async function(docRef, data) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseUpdateDoc(docRef, data);
};

const deleteDoc = async function(docRef) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseDeleteDoc(docRef);
};

const query = function(collectionRef, ...constraints) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseQuery(collectionRef, ...constraints);
};

const orderBy = function(field, direction = 'asc') {
    return firebaseOrderBy(field, direction);
};

const where = function(field, operator, value) {
    return firebaseWhere(field, operator, value);
};

const onSnapshot = function(queryRef, callback) {
    if (!db) {
        throw new Error('Firebase not initialized. Please configure Firebase for production deployment.');
    }
    return firebaseOnSnapshot(queryRef, callback);
};

// Export the Firebase functions
export { 
    db, 
    analytics, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where, 
    onSnapshot
};
