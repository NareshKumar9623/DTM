// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { 
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
    onSnapshot as firebaseOnSnapshot,
    setDoc as firebaseSetDoc
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
let db, analytics, auth, googleProvider;

// Check if we have valid Firebase config
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;

if (hasValidConfig) {
    try {
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        analytics = getAnalytics(app);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        // Fall back to mock database
        db = createMockDatabase();
        auth = createMockAuth();
    }
} else {
    // Create mock database for development since Firebase config is not real
    console.log('Using mock database for development');
    db = createMockDatabase();
    auth = createMockAuth();
}

function createMockDatabase() {
    return {
        _isMock: true,
        _mockData: new Map(),
        _getNextId: function() {
            return 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    };
}

function createMockAuth() {
    return {
        _isMock: true,
        _currentUser: null,
        _authStateListeners: new Set(),
        currentUser: null
    };
}

// Mock Firebase functions
const collection = function(db, path) {
    if (!db._isMock) {
        // Use real Firebase collection
        return firebaseCollection(db, path);
    }
    
    return {
        _path: path,
        _isMock: true
    };
};

const addDoc = async function(collectionRef, data) {
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseAddDoc(collectionRef, data);
    }
    
    // Mock implementation
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
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseGetDocs(queryRef);
    }
    
    // Mock implementation
    const path = queryRef._path;
    const mockCollection = db._mockData.get(path) || new Map();
    
    let docs = Array.from(mockCollection.values());
    
    // Apply constraints if they exist
    if (queryRef._constraints) {
        docs = applyConstraints(docs, queryRef._constraints);
    }
    
    const resultDocs = docs.map(data => ({
        id: data.id,
        data: () => data
    }));
    
    console.log('Mock: Retrieved', resultDocs.length, 'documents from', path);
    return { 
        empty: resultDocs.length === 0,
        forEach: function(callback) {
            resultDocs.forEach(callback);
        }
    };
};

// Helper function to apply query constraints
function applyConstraints(docs, constraints) {
    let result = [...docs];
    
    // Apply where constraints
    constraints.forEach(constraint => {
        if (constraint.type === 'where') {
            const { field, operator, value } = constraint;
            result = result.filter(doc => {
                const docValue = doc[field];
                switch (operator) {
                    case '==':
                        return docValue === value;
                    case '!=':
                        return docValue !== value;
                    case '<':
                        return docValue < value;
                    case '<=':
                        return docValue <= value;
                    case '>':
                        return docValue > value;
                    case '>=':
                        return docValue >= value;
                    case 'array-contains':
                        return Array.isArray(docValue) && docValue.includes(value);
                    case 'in':
                        return Array.isArray(value) && value.includes(docValue);
                    case 'not-in':
                        return Array.isArray(value) && !value.includes(docValue);
                    default:
                        return true;
                }
            });
        }
    });
    
    // Apply orderBy constraints
    constraints.forEach(constraint => {
        if (constraint.type === 'orderBy') {
            const { field, direction } = constraint;
            result.sort((a, b) => {
                const aValue = a[field];
                const bValue = b[field];
                
                if (direction === 'desc') {
                    return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
                } else {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
                }
            });
        }
    });
    
    return result;
}

const doc = function(db, path, id) {
    if (!db._isMock) {
        // Use real Firebase doc
        return firebaseDoc(db, path, id);
    }
    
    return {
        _path: path,
        _id: id,
        _isMock: true
    };
};

const updateDoc = async function(docRef, data) {
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseUpdateDoc(docRef, data);
    }
    
    // Mock implementation
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
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseDeleteDoc(docRef);
    }
    
    // Mock implementation
    const collectionPath = docRef._path;
    const docId = docRef._id;
    
    const mockCollection = db._mockData.get(collectionPath);
    if (mockCollection && mockCollection.has(docId)) {
        mockCollection.delete(docId);
        console.log('Mock: Deleted document', docId, 'from', collectionPath);
    }
};

const query = function(collectionRef, ...constraints) {
    if (!db._isMock) {
        // Use real Firebase query
        return firebaseQuery(collectionRef, ...constraints);
    }
    
    return {
        _path: collectionRef._path,
        _isMock: true,
        _constraints: constraints
    };
};

const orderBy = function(field, direction = 'asc') {
    if (!db._isMock) {
        return firebaseOrderBy(field, direction);
    }
    return { type: 'orderBy', field, direction };
};

const where = function(field, operator, value) {
    if (!db._isMock) {
        return firebaseWhere(field, operator, value);
    }
    return { type: 'where', field, operator, value };
};

const onSnapshot = function(queryRef, callback) {
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseOnSnapshot(queryRef, callback);
    }
    
    // For mock, just call the callback immediately
    setTimeout(() => {
        getDocs(queryRef).then(callback);
    }, 100);
    
    return function() {}; // Unsubscribe function
};

const setDoc = async function(docRef, data) {
    // If not mock, use real Firebase
    if (!db._isMock) {
        return firebaseSetDoc(docRef, data);
    }
    
    // Mock implementation
    const collectionPath = docRef._path;
    const docId = docRef._id;
    
    if (!db._mockData.has(collectionPath)) {
        db._mockData.set(collectionPath, new Map());
    }
    
    const collection = db._mockData.get(collectionPath);
    collection.set(docId, { id: docId, ...data });
    console.log('Mock: Set document', docId, 'in', collectionPath);
};

// Firebase Auth functions
const signInWithEmailAndPasswordMock = async function(auth, email, password) {
    if (!auth._isMock) {
        return signInWithEmailAndPassword(auth, email, password);
    }
    
    // Mock implementation - check against users collection
    const usersPath = 'users';
    const mockCollection = db._mockData.get(usersPath) || new Map();
    
    for (const [userId, userData] of mockCollection) {
        if (userData.email === email && userData.password === password) {
            const user = {
                uid: userId,
                email: email,
                displayName: userData.fullName || userData.username,
                providerData: [{ providerId: 'password' }]
            };
            auth._currentUser = user;
            auth.currentUser = user;
            
            // Notify auth state listeners
            auth._authStateListeners.forEach(listener => listener(user));
            
            return { user };
        }
    }
    
    throw new Error('Invalid email or password');
};

const signInWithPopupMock = async function(auth, provider) {
    if (!auth._isMock) {
        return signInWithPopup(auth, provider);
    }
    
    // Mock Google sign-in
    const user = {
        uid: 'google_' + Date.now(),
        email: 'user@gmail.com',
        displayName: 'Google User',
        photoURL: 'https://via.placeholder.com/100',
        providerData: [{ providerId: 'google.com' }]
    };
    
    auth._currentUser = user;
    auth.currentUser = user;
    
    // Store user in users collection
    const usersPath = 'users';
    if (!db._mockData.has(usersPath)) {
        db._mockData.set(usersPath, new Map());
    }
    
    const collection = db._mockData.get(usersPath);
    collection.set(user.uid, {
        id: user.uid,
        email: user.email,
        username: user.displayName.replace(/\s+/g, '').toLowerCase(),
        fullName: user.displayName,
        photoURL: user.photoURL,
        provider: 'google',
        createdAt: new Date().toISOString()
    });
    
    // Notify auth state listeners
    auth._authStateListeners.forEach(listener => listener(user));
    
    return { user };
};

const createUserWithEmailAndPasswordMock = async function(auth, email, password) {
    if (!auth._isMock) {
        return createUserWithEmailAndPassword(auth, email, password);
    }
    
    // Mock implementation
    const userId = 'user_' + Date.now();
    const user = {
        uid: userId,
        email: email,
        displayName: email.split('@')[0],
        providerData: [{ providerId: 'password' }]
    };
    
    auth._currentUser = user;
    auth.currentUser = user;
    
    // Store user in users collection
    const usersPath = 'users';
    if (!db._mockData.has(usersPath)) {
        db._mockData.set(usersPath, new Map());
    }
    
    const collection = db._mockData.get(usersPath);
    collection.set(userId, {
        id: userId,
        email: email,
        username: email.split('@')[0],
        fullName: user.displayName,
        provider: 'email',
        createdAt: new Date().toISOString()
    });
    
    // Notify auth state listeners
    auth._authStateListeners.forEach(listener => listener(user));
    
    return { user };
};

const signOutMock = async function(auth) {
    if (!auth._isMock) {
        return signOut(auth);
    }
    
    auth._currentUser = null;
    auth.currentUser = null;
    
    // Notify auth state listeners
    auth._authStateListeners.forEach(listener => listener(null));
};

const onAuthStateChangedMock = function(auth, callback) {
    if (!auth._isMock) {
        return onAuthStateChanged(auth, callback);
    }
    
    auth._authStateListeners.add(callback);
    
    // Call immediately with current state
    setTimeout(() => callback(auth._currentUser), 0);
    
    // Return unsubscribe function
    return () => {
        auth._authStateListeners.delete(callback);
    };
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
        email: 'naresh@example.com',
        password: 'password123',
        fullName: 'Naresh Kumar',
        provider: 'email',
        createdAt: new Date().toISOString()
    });
    
    users.set('user2', {
        id: 'user2',
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        fullName: 'Administrator',
        provider: 'email',
        createdAt: new Date().toISOString()
    });
    
    users.set('user3', {
        id: 'user3',
        username: 'demo',
        email: 'demo@example.com',
        password: 'demo123',
        fullName: 'Demo User',
        provider: 'email',
        createdAt: new Date().toISOString()
    });
    
    // Add sample tasks for demo user
    const demoTasksPath = 'data/demo/tasks';
    if (!db._mockData.has(demoTasksPath)) {
        db._mockData.set(demoTasksPath, new Map());
    }
    
    const demoTasks = db._mockData.get(demoTasksPath);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    demoTasks.set('task1', {
        id: 'task1',
        title: 'Complete project documentation',
        category: 'work',
        priority: 'high',
        timeSpent: 3.5,
        description: 'Finish writing the technical documentation for the new feature',
        status: 'completed',
        date: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        username: 'demo'
    });
    
    demoTasks.set('task2', {
        id: 'task2',
        title: 'Review code changes',
        category: 'work',
        priority: 'medium',
        timeSpent: 2.0,
        description: 'Review pull requests from team members',
        status: 'in-progress',
        date: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        username: 'demo'
    });
    
    demoTasks.set('task3', {
        id: 'task3',
        title: 'Exercise and gym',
        category: 'health',
        priority: 'medium',
        timeSpent: 1.5,
        description: 'Morning workout routine',
        status: 'completed',
        date: yesterday,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        username: 'demo'
    });
    
    console.log('Mock: Sample users and tasks initialized');
};

// Initialize sample data
if (db._isMock) {
    initSampleData();
}

// Export the initialized services
export { 
    db, 
    auth,
    googleProvider,
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
    onSnapshot,
    setDoc,
    signInWithEmailAndPasswordMock as signInWithEmailAndPassword,
    signInWithPopupMock as signInWithPopup,
    createUserWithEmailAndPasswordMock as createUserWithEmailAndPassword,
    signOutMock as signOut,
    onAuthStateChangedMock as onAuthStateChanged
};
