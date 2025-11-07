# Firebase Service Account Configuration

This directory contains Firebase Admin SDK service account credentials for local development.

## ⚠️ Security Warning

**DO NOT commit the service account JSON file to version control!**

The `firebase-service-account.json` file is already added to `.gitignore` to prevent accidental commits.

## File Location

- **Service Account Key:** `config/firebase-service-account.json`
- **Project ID:** `scanaraai`

## How It Works

The backend automatically detects and uses the service account key:

1. **Local Development:** If `config/firebase-service-account.json` exists, it uses the service account key
2. **Firebase Functions Deployment:** If the file doesn't exist, it uses default credentials (automatic in Firebase Functions)

## Setup Instructions

1. Place your Firebase service account JSON file in this directory
2. Rename it to `firebase-service-account.json`
3. The backend will automatically use it for local development

## Getting Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`scanaraai`)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file to `config/firebase-service-account.json`

## Verification

The backend will log which initialization method it uses:
- `Firebase Admin initialized with service account key` - Using service account file
- `Firebase Admin initialized with default credentials` - Using default credentials (Firebase Functions)

## Troubleshooting

If you get authentication errors:

1. Verify the service account file exists: `ls config/firebase-service-account.json`
2. Check file permissions: `chmod 600 config/firebase-service-account.json`
3. Verify the project ID matches: Check `project_id` in the JSON file
4. Ensure the service account has proper permissions in Firebase Console

