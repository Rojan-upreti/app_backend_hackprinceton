const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import analysis service
const { analyzeCodebase } = require('./services/codebaseAnalyzer');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Codebase Analyzer API is running' });
});

// Main endpoint for codebase analysis
app.post('/api/analyze', async (req, res) => {
  try {
    const { codebase } = req.body;

    if (!codebase) {
      return res.status(400).json({
        error: 'Codebase is required',
        message: 'Please provide a codebase in the request body'
      });
    }

    // Analyze the codebase
    const analysisResult = await analyzeCodebase(codebase);

    res.json({
      success: true,
      data: analysisResult
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

