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

// Initialize Firebase
let db, analytics;

try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
    throw new Error('Firebase configuration is required for production deployment');
}

// Export the Firebase functions directly
export { 
    db, 
    analytics, 
    firebaseCollection as collection, 
    firebaseAddDoc as addDoc, 
    firebaseGetDocs as getDocs, 
    firebaseDoc as doc, 
    firebaseUpdateDoc as updateDoc, 
    firebaseDeleteDoc as deleteDoc, 
    firebaseQuery as query, 
    firebaseOrderBy as orderBy, 
    firebaseWhere as where, 
    firebaseOnSnapshot as onSnapshot
};
