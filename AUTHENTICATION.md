# Authentication System Documentation

This backend uses Firebase Authentication to secure API endpoints. All protected endpoints require a valid Firebase ID token.

## Firebase Configuration

The backend uses Firebase Admin SDK to verify tokens. Make sure your Firebase project is properly configured.

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Health Check
- **URL:** `GET /api/health`
- **Description:** Check if the API is running
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

#### 2. Verify Token
- **URL:** `POST /api/auth/verify`
- **Description:** Verify a Firebase ID token and get user information
- **Headers:**
  ```
  Authorization: Bearer <firebase-id-token>
  ```
- **Response (Success):**
  ```json
  {
    "success": true,
    "authenticated": true,
    "user": {
      "uid": "user-id",
      "email": "user@example.com",
      "emailVerified": true,
      "name": "User Name",
      "picture": "https://...",
      "provider": "password",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastSignIn": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Response (Error):**
  ```json
  {
    "success": false,
    "authenticated": false,
    "error": "Token expired",
    "message": "The Firebase ID token has expired. Please get a new token."
  }
  ```

### Protected Endpoints (Authentication Required)

#### 1. Get User Info
- **URL:** `GET /api/auth/user`
- **Description:** Get current authenticated user information
- **Headers:**
  ```
  Authorization: Bearer <firebase-id-token>
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "uid": "user-id",
      "email": "user@example.com",
      "emailVerified": true,
      "name": "User Name",
      "picture": "https://...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastSignIn": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 2. Analyze Codebase
- **URL:** `POST /api/analyze`
- **Description:** Analyze a codebase (requires authentication)
- **Headers:**
  ```
  Authorization: Bearer <firebase-id-token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "codebase": [
      {
        "path": "src/index.js",
        "content": "const express = require('express');"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "summary": { ... },
      "files": [ ... ],
      "statistics": { ... },
      "insights": [ ... ]
    },
    "analyzedBy": {
      "uid": "user-id",
      "email": "user@example.com"
    }
  }
  ```

## Client-Side Implementation

### 1. Initialize Firebase in Your App

```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: Replace these values with your own Firebase configuration
// Get your config from Firebase Console > Project Settings > Your apps
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "YOUR_APP_ID",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "YOUR_MEASUREMENT_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
```

**⚠️ Security Note:** Never commit your Firebase API keys to version control. Use environment variables or a secure configuration file that is excluded from git (add to `.gitignore`).

### 2. Sign In User

```javascript
import { signInWithEmailAndPassword } from "firebase/auth";

// Sign in with email and password
const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};
```

### 3. Get ID Token and Send to Backend

```javascript
import { onAuthStateChanged } from "firebase/auth";

// Get ID token and verify with backend
const verifyAuth = async () => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No user signed in');
  }
  
  // Get the ID token
  const idToken = await user.getIdToken();
  
  // Send to backend to verify
  const response = await fetch('https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/auth/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const result = await response.json();
  
  if (result.success && result.authenticated) {
    console.log('Authentication successful!', result.user);
    return result.user;
  } else {
    throw new Error('Authentication failed');
  }
};

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const verifiedUser = await verifyAuth();
      console.log('User authenticated:', verifiedUser);
    } catch (error) {
      console.error('Auth verification failed:', error);
    }
  }
});
```

### 4. Make Authenticated Request to Analyze Endpoint

```javascript
const analyzeCodebase = async (codebase) => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User must be signed in');
  }
  
  // Get fresh ID token
  const idToken = await user.getIdToken();
  
  // Send codebase to backend
  const response = await fetch('https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ codebase })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Analysis failed');
  }
  
  const result = await response.json();
  return result;
};
```

## Example: Complete Authentication Flow

```javascript
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign in user
const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Verify authentication with backend
const verifyWithBackend = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/auth/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
  
  const result = await response.json();
  return result.success ? result.user : null;
};

// Use authenticated endpoint
const sendCodebase = async (codebase) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const idToken = await user.getIdToken();
  
  const response = await fetch('https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ codebase })
  });
  
  return await response.json();
};

// Example usage
(async () => {
  // 1. Sign in
  await signIn('user@example.com', 'password');
  
  // 2. Verify with backend
  const verifiedUser = await verifyWithBackend();
  console.log('Verified user:', verifiedUser);
  
  // 3. Send codebase for analysis
  const codebase = [
    { path: 'app.js', content: 'console.log("Hello");' }
  ];
  const analysis = await sendCodebase(codebase);
  console.log('Analysis result:', analysis);
})();
```

## Error Handling

All authentication errors return a 401 status code with the following format:

```json
{
  "success": false,
  "authenticated": false,
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Common errors:
- `Token expired` - The ID token has expired, get a new one
- `Invalid token` - The token format is incorrect
- `No token provided` - Authorization header is missing
- `Authentication failed` - General authentication failure

## Security Notes

1. **Always use HTTPS in production** - Never send tokens over HTTP
2. **ID tokens expire after 1 hour** - Refresh them as needed using `user.getIdToken(true)`
3. **Store tokens securely on the client side** - Don't store tokens in localStorage for sensitive apps
4. **Never expose Firebase Admin SDK credentials on the client** - Admin SDK is server-side only
5. **The backend automatically verifies tokens with Firebase servers** - No need to manually verify
6. **Never commit API keys to version control** - Use environment variables or secure config files
7. **Use Firebase Security Rules** - Configure proper security rules in Firebase Console
8. **Rotate API keys if exposed** - If your API key is exposed, regenerate it in Firebase Console

### Best Practices for API Keys

1. **Use Environment Variables:**
   ```javascript
   // .env file (add to .gitignore)
   REACT_APP_FIREBASE_API_KEY=your_api_key_here
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   
   // In your code
   const firebaseConfig = {
     apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
     // ...
   };
   ```

2. **Create a config file (excluded from git):**
   ```javascript
   // config/firebase.js (add config/ to .gitignore)
   export const firebaseConfig = {
     apiKey: "your-api-key",
     // ...
   };
   ```

3. **Use Firebase App Check** - Add an extra layer of security by verifying requests come from your app

