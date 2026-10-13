# 🔧 Firebase Project Access Issue - Fix Guide

## Problem
"The project does not exist or you do not have permission"

## Quick Fix: Create New Project

### Step 1: Create New Firebase Project
1. Go to: https://console.firebase.google.com
2. Click "Add project"
3. Project name: `tesla-pulse` (or any name)
4. Disable Google Analytics (not needed)
5. Click "Create Project"

### Step 2: Enable Services

**Realtime Database:**
1. Left sidebar → Realtime Database
2. Click "Create Database"
3. Location: `asia-southeast1` (Singapore)
4. Security rules: "Start in test mode"
5. Enable

**Firestore:**
1. Left sidebar → Firestore Database
2. Click "Create database"
3. Location: `asia-southeast1` (Singapore)
4. Security rules: "Start in test mode"
5. Enable

**Authentication:**
1. Left sidebar → Authentication
2. Click "Get started"
3. Enable "Email/Password" provider

### Step 3: Get New Credentials

1. Click ⚙️ (Settings) → Project settings
2. Scroll down to "Your apps" section
3. Click </> (Web app icon)
4. App nickname: `tesla-pulse-dashboard`
5. Click "Register app"
6. Copy the `firebaseConfig` object

### Step 4: Update .env File

Replace in `tesla-pulse/.env`:

```env
VITE_FIREBASE_API_KEY=<your-new-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-new-project-id>.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://<your-new-project-id>-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=<your-new-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-new-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

### Step 5: Update .firebaserc

Replace project ID in `.firebaserc`:

```json
{
  "projects": {
    "default": "<your-new-project-id>"
  }
}
```

### Step 6: Push Mock Data

Run mock pusher to populate Realtime Database:

```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

### Step 7: Restart Dashboard

```bash
cd tesla-pulse
npm run dev
```

---

## Alternative: Get Access to Existing Project

If someone else owns `tesla-pulse-9acb2`:

1. Ask them to go: Firebase Console → ⚙️ Settings → Users and permissions
2. Click "Add member"
3. Enter your Gmail address
4. Role: "Editor" or "Owner"
5. Click "Add member"

Then try accessing again!

---

## Current Project Info

- Project ID: `tesla-pulse-9acb2`
- Database URL: `https://tesla-pulse-9acb2-default-rtdb.asia-southeast1.firebasestorage.app`
- Owner: Unknown (check who created the project)

---

**Need help? Provide:**
1. Gmail account you're using
2. Who created the original project?
3. Do you have access to the owner's account?
