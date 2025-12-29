# Firebase Project Setup Instructions

This document provides step-by-step instructions for setting up the Firebase project for Litplan. This setup requires access to the Firebase Console and Apple Developer account.

## Prerequisites

- Google account (for Firebase)
- Apple Developer account (for Sign in with Apple)
- Firebase CLI installed: `npm install -g firebase-tools`
- Node.js 18+ installed

---

## Part 1: Firebase Console Setup

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Navigate to: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Add project" or "Create a project"
   - Project name: `litplan-dev` (for development)
   - Click "Continue"

3. **Google Analytics (Optional)**
   - Enable/disable Google Analytics as preferred
   - If enabled, select or create an Analytics account
   - Click "Create project"

4. **Wait for Project Creation**
   - Firebase will provision your project (takes ~30 seconds)
   - Click "Continue" when ready

---

### Step 2: Enable Firestore Database

1. **Navigate to Firestore**
   - In left sidebar, click "Firestore Database"
   - Click "Create database"

2. **Security Rules**
   - Select "Start in **test mode**" (we'll update rules later)
   - Click "Next"

3. **Choose Location**
   - Select region closest to your users
   - Recommended: `us-central1` (Iowa) or `europe-west1` (Belgium)
   - **Warning**: Location cannot be changed later!
   - Click "Enable"

4. **Wait for Database Creation**
   - Firestore will provision (takes ~1 minute)
   - You'll see an empty database view when ready

---

### Step 3: Enable Firebase Authentication

1. **Navigate to Authentication**
   - In left sidebar, click "Authentication"
   - Click "Get started"

2. **Enable Sign in with Apple**
   - Click "Sign-in method" tab
   - Click "Apple" from the list
   - Toggle "Enable"

3. **Configure Apple Sign In** (Skip for now - needs Apple Developer credentials)
   - Service ID: (will be provided by Apple)
   - Apple Team ID: (from Apple Developer account)
   - Key ID: (from Apple Developer account)
   - Private Key: (download from Apple Developer account)
   - Click "Save"

   **Note**: For initial development, you can skip Apple configuration and use Firebase Email/Password authentication for testing.

---

### Step 4: Enable Firebase Storage

1. **Navigate to Storage**
   - In left sidebar, click "Storage"
   - Click "Get started"

2. **Security Rules**
   - Select "Start in **test mode**"
   - Click "Next"

3. **Choose Location**
   - Use the same region as Firestore
   - Click "Done"

4. **Create Folders** (Optional - can be done later)
   - Create folder: `cities/` (for city images)
   - Create folder: `plans/` (for plan images)
   - Create folder: `users/` (for user avatars)

---

### Step 5: Set up Firebase Functions

1. **Navigate to Functions**
   - In left sidebar, click "Functions"
   - Click "Get started"
   - Review the overview (no action needed yet)

2. **Upgrade to Blaze Plan** (Required for Cloud Functions)
   - Click "Upgrade project" in bottom-left
   - Select "Blaze (pay as you go)"
   - Add billing information
   - Confirm upgrade

   **Note**: Firebase has generous free tier. You won't be charged unless you exceed:
   - 2M function invocations/month
   - 400K GB-seconds of compute
   - 200K CPU-seconds of compute

---

## Part 2: Firebase CLI Setup

### Step 1: Install Firebase CLI

```bash
# Install globally
npm install -g firebase-tools

# Verify installation
firebase --version
# Should show version 13.x.x or higher
```

---

### Step 2: Login to Firebase

```bash
# Login to Firebase
firebase login

# This will:
# 1. Open browser for Google account authentication
# 2. Request permissions for Firebase CLI
# 3. Confirm login in terminal
```

---

### Step 3: Initialize Firebase in Project

```bash
# Navigate to backend folder
cd /path/to/litplanAI/backend

# Initialize Firebase
firebase init

# Select features (use spacebar to select, enter to confirm):
# ◉ Firestore: Configure security rules and indexes files
# ◉ Functions: Configure a Cloud Functions directory
# ◉ Storage: Configure a security rules file for Cloud Storage

# Use an existing project:
# > Select "litplan-dev" from the list

# Firestore setup:
# - Firestore rules file: firestore.rules
# - Firestore indexes file: firestore.indexes.json

# Functions setup:
# - Language: TypeScript
# - Use ESLint: Yes
# - Install dependencies: Yes

# Storage setup:
# - Storage rules file: storage.rules
```

---

### Step 4: Configure Project Files

After initialization, you'll have these files:
- `firebase.json` - Firebase configuration
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Database indexes
- `storage.rules` - Storage security rules
- `functions/` - Cloud Functions code

**Verify structure:**
```bash
backend/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── functions/
    ├── src/
    ├── package.json
    └── tsconfig.json
```

---

## Part 3: Environment Configuration

### Step 1: Get Firebase Config

1. **Go to Project Settings**
   - In Firebase Console, click gear icon → "Project settings"

2. **Copy Project ID**
   - Under "General" tab, copy "Project ID"
   - Example: `litplan-dev`

3. **Generate Service Account Key**
   - Go to "Service accounts" tab
   - Click "Generate new private key"
   - Click "Generate key"
   - Save JSON file securely (contains sensitive credentials)

---

### Step 2: Set up Environment Variables

```bash
# Navigate to functions folder
cd functions

# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
# or use your preferred editor
```

Add your Firebase credentials:
```env
FIREBASE_PROJECT_ID=litplan-dev
FIREBASE_PRIVATE_KEY=your-private-key-from-json
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@litplan-dev.iam.gserviceaccount.com
```

**Security**: Never commit `.env` to git! It's already in `.gitignore`.

---

## Part 4: Deploy Firestore Rules

### Step 1: Create Security Rules

Edit `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /activity/{activityId} {
        allow read, write: if request.auth.uid == userId;
      }

      match /savedCities/{cityId} {
        allow read: if request.auth.uid == userId;
        allow write: if request.auth.uid == userId;
      }
    }

    // Cities and plans are read-only for clients
    match /cities/{cityId} {
      allow read: if request.auth != null;
      allow write: if false;

      match /plans/{planId} {
        allow read: if request.auth != null;
        allow write: if false;
      }

      match /groupFlows/{flowId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }

    // Config is read-only
    match /config/{doc} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

### Step 2: Deploy Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Verify in Firebase Console:
# Firestore → Rules tab → Should show updated rules
```

---

## Part 5: Local Development Setup

### Step 1: Install Dependencies

```bash
# In functions folder
cd functions
npm install
```

---

### Step 2: Build TypeScript

```bash
# Build once
npm run build

# Or watch for changes
npm run build:watch
```

---

### Step 3: Start Firebase Emulators

```bash
# Start local emulators
firebase emulators:start

# Emulator UI will be available at:
# http://localhost:4000

# Functions will run at:
# http://localhost:5001/litplan-dev/us-central1/api
```

---

### Step 4: Test Health Endpoint

```bash
# Test with curl
curl http://localhost:5001/litplan-dev/us-central1/api/health

# Expected response:
# {
#   "status": "healthy",
#   "version": "1.0.0",
#   "timestamp": "2025-01-15T12:00:00.000Z"
# }
```

---

## Part 6: Production Deployment

### Step 1: Create Production Project

1. **Create New Firebase Project**
   - In Firebase Console, click "Add project"
   - Project name: `litplan-prod`
   - Follow same steps as development project

2. **Add Production Project to CLI**
   ```bash
   firebase use --add
   # Select: litplan-prod
   # Alias: prod
   ```

---

### Step 2: Deploy to Development

```bash
# Switch to development
firebase use default  # or firebase use litplan-dev

# Deploy functions
firebase deploy --only functions

# Deploy all (functions + rules + indexes)
firebase deploy
```

---

### Step 3: Deploy to Production

```bash
# Switch to production
firebase use prod

# Deploy all
firebase deploy

# Verify deployment in Firebase Console
```

---

## Part 7: Apple Sign In Configuration (Later)

**Note**: This requires an Apple Developer account ($99/year). Skip for initial development.

### Prerequisites
- Apple Developer account
- App registered in App Store Connect
- Bundle ID: `com.yourcompany.litplan`

### Steps

1. **Create Service ID**
   - Go to: https://developer.apple.com/account/resources/identifiers
   - Click "+" to create new identifier
   - Select "Services IDs"
   - Description: `Litplan Sign In`
   - Identifier: `com.yourcompany.litplan.signin`
   - Enable "Sign in with Apple"
   - Configure domain: `litplan-dev.firebaseapp.com`
   - Return URL: `https://litplan-dev.firebaseapp.com/__/auth/handler`

2. **Create Key**
   - Go to: https://developer.apple.com/account/resources/authkeys
   - Click "+" to create new key
   - Name: `Litplan Sign In Key`
   - Enable "Sign in with Apple"
   - Download key file (only available once!)
   - Note the Key ID

3. **Configure in Firebase**
   - Copy Service ID, Team ID, Key ID
   - Upload private key file
   - Save configuration

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
firebase functions:log

# Logs for specific function
firebase functions:log --only api
```

### Monitor Usage

1. **Firebase Console → Usage and billing**
   - View function invocations
   - Check storage usage
   - Monitor bandwidth

2. **Set up Budget Alerts**
   - Click "Set budget alert"
   - Set monthly limit (e.g., $10)
   - Add email for notifications

---

## Troubleshooting

### Issue: "Permission denied" when deploying

**Solution**:
```bash
# Re-authenticate
firebase login --reauth

# Verify project
firebase projects:list
firebase use litplan-dev
```

---

### Issue: Functions not deploying

**Solution**:
```bash
# Check for TypeScript errors
cd functions
npm run build

# Check logs
firebase functions:log
```

---

### Issue: "Billing account not configured"

**Solution**:
- Upgrade to Blaze plan in Firebase Console
- Add valid payment method

---

## Security Checklist

- [ ] Firestore rules deployed and tested
- [ ] Storage rules deployed
- [ ] Environment variables secured (not in git)
- [ ] Service account key stored securely
- [ ] Budget alerts configured
- [ ] API keys restricted (in Google Cloud Console)
- [ ] CORS configured properly
- [ ] Rate limiting implemented

---

## Next Steps

1. **Seed initial data** (cities, config)
2. **Implement API endpoints** (auth, cities, plans)
3. **Test with iOS app**
4. **Set up CI/CD** (GitHub Actions)
5. **Configure monitoring** (error alerts)

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions/get-started)

---

**Status**: Setup guide complete - Ready for Firebase project creation

**Note**: Actual Firebase Console setup will be done when user provides their Google account and Apple Developer credentials.
