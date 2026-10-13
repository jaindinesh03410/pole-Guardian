# Login Bypass Toggle

## To DISABLE Login (Current State - Login ENABLED):
File: `tesla-pulse/src/App.tsx`

Current code (Line ~40):
```tsx
<Route path="/dashboard" element={
  <AuthGuard>
    <DashboardLayout />
  </AuthGuard>
}>
```

## To ENABLE Bypass (Skip Login for Testing):
Replace with:
```tsx
<Route path="/dashboard" element={<DashboardLayout />}>
```

Remove the `<AuthGuard>` wrapper to skip authentication.

---

## Quick Toggle Commands:

### Option 1: Enable Login (Production Mode)
✅ **Current state - Already enabled**

### Option 2: Bypass Login (Demo Mode)
Remove AuthGuard wrapper from `/dashboard` route in App.tsx

---

**Note:** Login is now ENABLED. You must create a user in Firebase Authentication before you can sign in.
