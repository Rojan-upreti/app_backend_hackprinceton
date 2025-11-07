# Codebase Analyzer Backend

A MERN stack backend API for analyzing codebases. The CLI can send codebase data to this backend, which will analyze it and return detailed insights in JSON format.

## Features

- ✅ Firebase Authentication integration
- ✅ Secure API endpoints with token verification
- ✅ Accepts codebase data from CLI
- ✅ Analyzes file structure, languages, and code metrics
- ✅ Provides insights and statistics
- ✅ Returns results in JSON format

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (already created with default values):
```env
PORT=5000
NODE_ENV=development
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## API Endpoints

### Public Endpoints (No Authentication)

#### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST `/api/auth/verify`
Verify Firebase ID token and get user information.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
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

### Protected Endpoints (Authentication Required)

#### POST `/api/analyze`
Analyzes a codebase and returns detailed analysis. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "codebase": [
    {
      "path": "src/index.js",
      "content": "const express = require('express');\nconst app = express();"
    },
    {
      "path": "package.json",
      "content": "{\"name\": \"my-app\"}"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalFiles": 2,
      "analyzedAt": "2024-01-01T00:00:00.000Z"
    },
    "files": [...],
    "statistics": {
      "totalLines": 100,
      "totalSize": 5000,
      "fileTypes": { "js": 1, "json": 1 },
      "languages": { "JavaScript": 1, "JSON": 1 }
    },
    "insights": [...]
  },
  "analyzedBy": {
    "uid": "user-id",
    "email": "user@example.com"
  }
}
```

#### GET `/api/auth/user`
Get current authenticated user information. **Requires authentication.**

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Response:**
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

## Authentication

This backend uses **Firebase Authentication** to secure API endpoints. All protected endpoints require a valid Firebase ID token in the `Authorization` header.

### Quick Start

1. **Sign in with Firebase** in your client app
2. **Get the ID token** from the authenticated user
3. **Include it in requests** as: `Authorization: Bearer <token>`

### Example Client Code

```javascript
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Sign in
const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// Get ID token
const idToken = await user.getIdToken();

// Make authenticated request
const response = await fetch('https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ codebase: [...] })
});
```

For detailed authentication documentation, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## Example CLI Request

### With Authentication

```bash
# First, get your Firebase ID token from your client app
# Then use it in the request:

curl -X POST https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/analyze \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codebase": [
      {
        "path": "app.js",
        "content": "console.log(\"Hello World\");"
      }
    ]
  }'
```

### Verify Authentication

```bash
curl -X POST https://backendhackprinceton--scanaraai.us-east4.hosted.app/api/auth/verify \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Project Structure

```
backend_hackprinceton/
├── server.js                 # Main Express server (local dev)
├── functions/
│   ├── index.js              # Firebase Functions entry point
│   ├── package.json          # Functions dependencies
│   ├── middleware/
│   │   └── auth.js           # Authentication middleware
│   └── services/
│       └── codebaseAnalyzer.js  # Codebase analysis logic
├── services/
│   └── codebaseAnalyzer.js   # Codebase analysis logic (local)
├── package.json
├── firebase.json             # Firebase configuration
├── .firebaserc               # Firebase project config
├── .env
├── .gitignore
├── README.md
└── AUTHENTICATION.md         # Detailed auth documentation
```

## Deployment

This backend is configured for Firebase Functions deployment.

### Deploy to Firebase

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Install dependencies
cd functions
npm install
cd ..

# Deploy
firebase deploy --only functions
```

Your API will be available at: `https://us-central1-<project-id>.cloudfunctions.net/api`

Or if using Firebase Hosting: `https://backendhackprinceton--scanaraai.us-east4.hosted.app/`

