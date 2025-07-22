import fs from 'fs/promises';
import path from 'path';

async function build() {
    console.log('Building for production...');
    
    // Check environment variables
    const envVars = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN', 
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
        'FIREBASE_MEASUREMENT_ID'
    ];
    
    console.log('\nEnvironment Variables Check:');
    let hasAllVars = true;
    envVars.forEach(varName => {
        const value = process.env[varName];
        const status = value ? 'SET' : 'NOT SET';
        console.log(`${varName}: ${status}`);
        if (!value) hasAllVars = false;
    });
    
    if (!hasAllVars) {
        console.warn('\n⚠️  WARNING: Some Firebase environment variables are not set!');
        console.warn('This is expected for local development, but required for production deployment.');
        console.warn('Make sure GitHub repository secrets are configured for production builds.');
    } else {
        console.log('\n✅ All Firebase environment variables are set!');
    }
    
    // Create dist directory
    await fs.mkdir('dist', { recursive: true });
    
    // Copy all files except config files and build scripts
    const filesToCopy = [
        'index.html',
        'styles.css',
        'app.js',
        'firebase-config.js',
        'config-manager.js'
    ];
    
    for (const file of filesToCopy) {
        try {
            await fs.copyFile(file, path.join('dist', file));
            console.log(`Copied ${file}`);
        } catch (error) {
            console.error(`Error copying ${file}:`, error.message);
        }
    }
    
    // Read and modify index.html to inject environment variables
    let indexContent = await fs.readFile('index.html', 'utf8');
    
    // Inject environment variables script before the closing head tag
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
        
        // Debug logging for environment variable injection
        console.log('Build-time environment variable injection:');
        console.log('API Key:', window.FIREBASE_API_KEY ? 'INJECTED' : 'EMPTY');
        console.log('Project ID:', window.FIREBASE_PROJECT_ID ? 'INJECTED' : 'EMPTY'); 
        console.log('App ID:', window.FIREBASE_APP_ID ? 'INJECTED' : 'EMPTY');
    </script>
</head>`;
    
    indexContent = indexContent.replace('</head>', envScript);
    
    await fs.writeFile(path.join('dist', 'index.html'), indexContent);
    console.log('Updated index.html with environment variables');
    
    console.log('Build completed successfully!');
    console.log('Files are ready in the dist/ directory');
}

build().catch(console.error);
