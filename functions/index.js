const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Check if service account key exists (for local development)
  const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    // Use service account key for local development
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('Firebase Admin initialized with service account key');
  } else {
    // Use default credentials (for Firebase Functions deployment)
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials');
  }
}

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import services and middleware
const { analyzeCodebase } = require('./services/codebaseAnalyzer');
const { verifyToken, optionalAuth } = require('./middleware/auth');

// Get Firebase Web API Key from environment or service account
let firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || process.env.REACT_APP_FIREBASE_API_KEY;
if (!firebaseWebApiKey) {
  // Try to get from service account config
  const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    // API key is not in service account, but we can use the project ID
    // The API key should be set as environment variable
    console.warn('Firebase Web API Key not found. Please set FIREBASE_WEB_API_KEY environment variable.');
  }
}

// Middleware to restrict requests to 127.0.0.1:5500
const restrictToLocalhost = (req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const origin = req.headers.origin || req.headers.referer;
  
  // Allow requests from 127.0.0.1:5500 or localhost:5500
  const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ];
  
  // Check origin
  if (origin && !allowedOrigins.some(allowed => origin.includes(allowed))) {
    return res.status(403).json({
      success: false,
      authenticated: false,
      error: 'Forbidden',
      message: 'Requests from this origin are not allowed. Only requests from 127.0.0.1:5500 are accepted.'
    });
  }
  
  // Check IP (for additional security) - allow localhost IPs
  if (clientIp && !clientIp.includes('127.0.0.1') && !clientIp.includes('::1') && !clientIp.includes('localhost')) {
    // In production/Firebase Functions, IP might be different, so we rely on origin check
    // But for localhost restriction, we check both
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({
        success: false,
        authenticated: false,
        error: 'Forbidden',
        message: 'Requests from this IP are not allowed. Only requests from 127.0.0.1 are accepted.'
      });
    }
  }
  
  next();
};

// Helper function for error messages
function getErrorMessage(errorCode) {
  const errorMessages = {
    'INVALID_EMAIL': 'Invalid email address',
    'INVALID_PASSWORD': 'Invalid password',
    'USER_DISABLED': 'This user account has been disabled',
    'USER_NOT_FOUND': 'No user found with this email',
    'WRONG_PASSWORD': 'Incorrect password',
    'EMAIL_NOT_FOUND': 'No account found with this email',
    'INVALID_LOGIN_CREDENTIALS': 'Invalid email or password',
    'MISSING_PASSWORD': 'Password is required',
    'MISSING_EMAIL': 'Email is required'
  };
  return errorMessages[errorCode] || 'Authentication failed';
}

// ==================== Public Routes ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Codebase Analyzer API is running',
    version: '1.0.0',
    endpoints: {
      public: ['/api/health', '/api/auth/login', '/api/auth/verify'],
      protected: ['/api/analyze', '/api/auth/user']
    }
  });
});

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// ==================== Authentication Routes ====================

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * Only accepts requests from 127.0.0.1:5500
 */
app.post('/api/auth/login', restrictToLocalhost, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        authenticated: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Check if Firebase Web API Key is available
    if (!firebaseWebApiKey) {
      return res.status(500).json({
        success: false,
        authenticated: false,
        error: 'Configuration error',
        message: 'Firebase Web API Key is not configured. Please set FIREBASE_WEB_API_KEY environment variable.'
      });
    }

    // Use Firebase Auth REST API to verify credentials
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`;
    
    const response = await fetch(firebaseAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Authentication failed
      const errorCode = data.error?.message || 'INVALID_LOGIN_CREDENTIALS';
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: errorCode,
        message: getErrorMessage(errorCode)
      });
    }

    // Authentication successful
    const idToken = data.idToken;
    const refreshToken = data.refreshToken;
    
    // Get user info from Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    res.json({
      success: true,
      authenticated: true,
      message: 'Authentication successful',
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: userRecord.displayName || decodedToken.name,
        picture: userRecord.photoURL || decodedToken.picture,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime
      },
      tokens: {
        idToken: idToken,
        refreshToken: refreshToken,
        expiresIn: data.expiresIn
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/verify
 * Verify Firebase ID token and return user information
 * This endpoint allows apps to verify authentication
 */
app.post('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided. Please include a Firebase ID token in the Authorization header as "Bearer <token>"'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
    }

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get additional user data
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    res.json({
      success: true,
      authenticated: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name || userRecord.displayName,
        picture: decodedToken.picture || userRecord.photoURL,
        provider: decodedToken.firebase?.sign_in_provider,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Token expired',
        message: 'The Firebase ID token has expired. Please get a new token.'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Invalid token',
        message: 'The Firebase ID token is invalid.'
      });
    }

    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/user
 * Get current authenticated user information
 * Requires authentication
 */
app.get('/api/auth/user', verifyToken, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.user.uid);
    
    res.json({
      success: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
        emailVerified: req.user.emailVerified,
        name: req.user.name || userRecord.displayName,
        picture: req.user.picture || userRecord.photoURL,
        createdAt: userRecord.metadata.creationTime,
        lastSignIn: userRecord.metadata.lastSignInTime
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ==================== Protected Routes ====================

/**
 * POST /api/analyze
 * Analyze codebase - Requires authentication
 */
app.post('/api/analyze', verifyToken, async (req, res) => {
  try {
    const { codebase } = req.body;

    if (!codebase) {
      return res.status(400).json({
        success: false,
        error: 'Codebase is required',
        message: 'Please provide a codebase in the request body'
      });
    }

    // Analyze the codebase
    const analysisResult = await analyzeCodebase(codebase);

    res.json({
      success: true,
      data: analysisResult,
      analyzedBy: {
        uid: req.user.uid,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

