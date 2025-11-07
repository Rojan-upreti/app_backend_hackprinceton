const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import services and middleware
const { analyzeCodebase } = require('./services/codebaseAnalyzer');
const { verifyToken, optionalAuth } = require('./middleware/auth');

// ==================== Public Routes ====================

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Codebase Analyzer API is running',
    version: '1.0.0',
    endpoints: {
      public: ['/api/health', '/api/auth/verify'],
      protected: ['/api/analyze']
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

