// Test script to verify environment variables in build process
import fs from 'fs/promises';

async function testBuild() {
    console.log('Testing environment variable injection...');
    
    // Simulate environment variables (you would set these in your environment)
    process.env.FIREBASE_API_KEY = 'test-api-key';
    process.env.FIREBASE_PROJECT_ID = 'test-project-id';
    process.env.FIREBASE_APP_ID = 'test-app-id';
    
    // Read index.html
    let indexContent = await fs.readFile('index.html', 'utf8');
    
    // Inject environment variables script
    const envScript = `
    <script>
        // Environment variables injected during build
        window.FIREBASE_API_KEY = '${process.env.FIREBASE_API_KEY || ''}';
        window.FIREBASE_AUTH_DOMAIN = '${process.env.FIREBASE_AUTH_DOMAIN || ''}';
        window.FIREBASE_PROJECT_ID = '${process.env.FIREBASE_PROJECT_ID || ''}';
        window.FIREBASE_STORAGE_BUCKET = '${process.env.FIREBASE_STORAGE_BUCKET || ''}';
        window.FIREBASE_MESSAGING_SENDER_ID = '${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}';
        window.FIREBASE_APP_ID = '${process.env.FIREBASE_APP_ID || ''}';
        window.FIREBASE_MEASUREMENT_ID = '${process.env.FIREBASE_MEASUREMENT_ID || ''}';
        console.log('Injected environment variables:', {
            apiKey: window.FIREBASE_API_KEY,
            projectId: window.FIREBASE_PROJECT_ID,
            appId: window.FIREBASE_APP_ID
        });
    </script>
</head>`;
    
    const modifiedContent = indexContent.replace('</head>', envScript);
    
    console.log('Environment variables that would be injected:');
    console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY || 'NOT SET');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || 'NOT SET');
    console.log('FIREBASE_APP_ID:', process.env.FIREBASE_APP_ID || 'NOT SET');
    
    // Write test file
    await fs.writeFile('test-index.html', modifiedContent);
    console.log('Test file created: test-index.html');
    console.log('Check this file to see if environment variables are properly injected.');
}

testBuild().catch(console.error);
