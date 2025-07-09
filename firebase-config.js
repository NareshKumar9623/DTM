// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { 
    getFirestore, 
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

// Create mock database for development since Firebase config is not real
console.log('Using mock database for development');
db = {
    _isMock: true,
    _mockData: new Map(),
    _getNextId: function() {
        return 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
};

// Mock Firebase functions
const collection = function(db, path) {
    return {
        _path: path,
        _isMock: true
    };
};

const addDoc = async function(collectionRef, data) {
    const id = db._getNextId();
    const docData = { id, ...data };
    
    if (!db._mockData.has(collectionRef._path)) {
        db._mockData.set(collectionRef._path, new Map());
    }
    
    db._mockData.get(collectionRef._path).set(id, docData);
    console.log('Mock: Added document to', collectionRef._path, docData);
    return { id };
};

const getDocs = async function(queryRef) {
    const path = queryRef._path;
    const mockCollection = db._mockData.get(path) || new Map();
    
    const docs = Array.from(mockCollection.values()).map(data => ({
        id: data.id,
        data: () => data
    }));
    
    console.log('Mock: Retrieved', docs.length, 'documents from', path);
    return { 
        empty: docs.length === 0,
        forEach: function(callback) {
            docs.forEach(callback);
        }
    };
};

const doc = function(db, path, id) {
    return {
        _path: path,
        _id: id,
        _isMock: true
    };
};

const updateDoc = async function(docRef, data) {
    const collectionPath = docRef._path;
    const docId = docRef._id;
    
    if (!db._mockData.has(collectionPath)) {
        db._mockData.set(collectionPath, new Map());
    }
    
    const collection = db._mockData.get(collectionPath);
    if (collection.has(docId)) {
        const existing = collection.get(docId);
        collection.set(docId, { ...existing, ...data });
        console.log('Mock: Updated document', docId, 'in', collectionPath);
    }
};

const deleteDoc = async function(docRef) {
    const collectionPath = docRef._path;
    const docId = docRef._id;
    
    const mockCollection = db._mockData.get(collectionPath);
    if (mockCollection && mockCollection.has(docId)) {
        mockCollection.delete(docId);
        console.log('Mock: Deleted document', docId, 'from', collectionPath);
    }
};

const query = function(collectionRef, ...constraints) {
    return {
        _path: collectionRef._path,
        _isMock: true,
        _constraints: constraints
    };
};

const orderBy = function(field, direction = 'asc') {
    return { type: 'orderBy', field, direction };
};

const where = function(field, operator, value) {
    return { type: 'where', field, operator, value };
};

const onSnapshot = function(queryRef, callback) {
    // For mock, just call the callback immediately
    setTimeout(() => {
        getDocs(queryRef).then(callback);
    }, 100);
    
    return function() {}; // Unsubscribe function
};

// Initialize sample data for testing
const initSampleData = () => {
    // Add sample users
    const usersPath = 'users';
    if (!db._mockData.has(usersPath)) {
        db._mockData.set(usersPath, new Map());
    }
    
    const users = db._mockData.get(usersPath);
    users.set('user1', {
        id: 'user1',
        username: 'naresh',
        password: 'password123',
        email: 'naresh@example.com',
        fullName: 'Naresh Kumar',
        createdAt: new Date().toISOString()
    });
    
    users.set('user2', {
        id: 'user2',
        username: 'admin',
        password: 'admin123',
        email: 'admin@example.com',
        fullName: 'Administrator',
        createdAt: new Date().toISOString()
    });
    
    users.set('user3', {
        id: 'user3',
        username: 'demo',
        password: 'demo123',
        email: 'demo@example.com',
        fullName: 'Demo User',
        createdAt: new Date().toISOString()
    });
    
    console.log('Mock: Sample users initialized');
};

// Initialize sample data
initSampleData();

// Export the initialized services
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
