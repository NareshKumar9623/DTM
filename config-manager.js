// Configuration manager for different environments
class Config {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' && 
                           window.location.hostname !== '';
    }

    getFirebaseConfig() {
        if (this.isProduction) {
            // For production, use environment variables injected during build
            const config = {
                apiKey: window.FIREBASE_API_KEY || "",
                authDomain: window.FIREBASE_AUTH_DOMAIN || "",
                projectId: window.FIREBASE_PROJECT_ID || "",
                storageBucket: window.FIREBASE_STORAGE_BUCKET || "",
                messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "",
                appId: window.FIREBASE_APP_ID || "",
                measurementId: window.FIREBASE_MEASUREMENT_ID || ""
            };
            
            // Validate that required fields are present
            if (!config.projectId || !config.apiKey || !config.appId) {
                console.error('Missing required Firebase configuration values in production');
                console.error('Make sure environment variables are set during build process');
                console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, FIREBASE_APP_ID');
                throw new Error('Firebase configuration is incomplete. Missing required values: projectId, apiKey, or appId');
            }
            
            return config;
        } else {
            // For local development, use mock configuration for security
            console.warn('Running in development mode with mock configuration');
            // Return empty configuration for security
            return {
                apiKey: "",
                authDomain: "",
                projectId: "",
                storageBucket: "",
                messagingSenderId: "",
                appId: "",
                measurementId: ""
            };
        }
    }
}

export default new Config();
