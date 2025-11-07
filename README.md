# Codebase Analyzer Backend

A MERN stack backend API for analyzing codebases. The CLI can send codebase data to this backend, which will analyze it and return detailed insights in JSON format.

## Features

- Accepts codebase data from CLI
- Analyzes file structure, languages, and code metrics
- Provides insights and statistics
- Returns results in JSON format

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

### POST `/api/analyze`
Analyzes a codebase and returns detailed analysis.

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
  }
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Example CLI Request

```bash
curl -X POST http://localhost:5000/api/analyze \
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

## Project Structure

```
backend_hackprinceton/
├── server.js                 # Main Express server
├── services/
│   └── codebaseAnalyzer.js   # Codebase analysis logic
├── package.json
├── .env
├── .gitignore
└── README.md
```

