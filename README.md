# Daily Task Logger

A modern, responsive web application for tracking daily tasks with Firebase backend integration.

## Features

- ✅ User authentication and personalized task management
- 📊 Real-time task statistics and progress tracking
- 🔍 Advanced search and filtering capabilities
- 📱 Responsive design for all devices
- 💾 Export functionality for task data
- 🔐 Secure Firebase integration with environment variables

## Live Demo

[View Live Application](https://nareshkumar9623.github.io/DTM)

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase Firestore
- **Styling**: Modern CSS with Flexbox and Grid
- **Icons**: Font Awesome
- **Deployment**: GitHub Pages

## Firebase Setup

Before deploying, you need to:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Set up the following collections in Firestore:
   - `users` - for storing user credentials
   - `data/{username}/tasks` - for storing user-specific tasks

### Required Environment Variables

Add these secrets to your GitHub repository (Settings > Secrets and variables > Actions):

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

### Local Development

For local development without Firebase credentials:
1. Clone the repository
2. Open `index.html` in your browser
3. You'll see a message that Firebase is not configured
4. The login functionality will not work until Firebase is properly set up

### Production Deployment

The application will work fully when deployed to GitHub Pages with proper Firebase environment variables configured.

## Users Collection Structure

Create users in the `users` collection with the following structure:
```json
{
  "username": "your_username",
  "password": "your_password",
  "email": "user@example.com",
  "fullName": "Full Name",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

## Deployment

The application is automatically deployed to GitHub Pages using GitHub Actions when changes are pushed to the main branch.

## Security

- All Firebase configuration is handled through environment variables
- API keys are never exposed in the repository
- Production deployment uses secure environment variable injection

## License

MIT License - See LICENSE file for details
