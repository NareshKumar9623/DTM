import fs from 'fs/promises';
import path from 'path';

async function build() {
    console.log('Building for production...');
    
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
    </script>
</head>`;
    
    indexContent = indexContent.replace('</head>', envScript);
    
    await fs.writeFile(path.join('dist', 'index.html'), indexContent);
    console.log('Updated index.html with environment variables');
    
    console.log('Build completed successfully!');
    console.log('Files are ready in the dist/ directory');
}

build().catch(console.error);
