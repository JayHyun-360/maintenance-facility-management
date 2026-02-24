# Session Persistence Debugging Guide

## 🔍 How to Debug the Session Issue

After deploying the latest changes, you'll have comprehensive logging to identify exactly where the session is being lost. Here's how to use the debugging information:

## 📊 Console Log Analysis

### **1. Profile Creation Page Load:**
Look for these logs in the browser console:

```
=== PROFILE CREATION SESSION CHECK ===
Session attempt 1/3
Session result 1: { data: { session: {...} }, error: null }
Session found on attempt 1: {
  userId: "xxx",
  email: "user@example.com", 
  expiresAt: 1234567890,
  hasAccessToken: true,
  hasRefreshToken: true
}
=== SESSION VALIDATION SUCCESSFUL ===
Checking for existing profile...
Existing profile check result: { existingProfile: null, profileError: null }
=== PROFILE CREATION READY ===
```

**If you see:** `No session found after all attempts` → Session not reaching the page

### **2. Profile Creation Submission:**
When you submit the profile form, look for:

```
=== PROFILE CREATION SUBMISSION START ===
Getting session for profile creation...
Session found for profile creation: {
  userId: "xxx",
  email: "user@example.com",
  expiresAt: 1234567890
}
Creating profile with data: {...}
Profile created successfully
Updating user metadata...
User metadata updated successfully
Waiting for session to be fully updated...
=== POST-CREATION SESSION VALIDATION ===
Post-creation session check 1/3
Post-creation session result 1: { data: { session: {...} }, error: null }
Session validated on attempt 1: {...}
=== PROFILE CREATION COMPLETED SUCCESSFULLY ===
Redirecting to welcome screen: /welcome-user
```

**If you see:** `No session found during profile creation submission` → Session lost before submission

**If you see:** `SESSION LOST AFTER PROFILE CREATION` → Session lost during metadata update

## 🚨 Common Issues and Solutions

### **Issue 1: Session Not Reaching Profile Creation**
**Symptoms:**
- `No session found after all attempts`
- Redirect to login immediately

**Possible Causes:**
- Middleware blocking access
- Session not properly stored in cookies
- PKCE flow timing issues

**Solutions:**
- Check middleware logs for session validation
- Verify cookies are being set properly
- Check callback route for session establishment

### **Issue 2: Session Lost During Profile Creation**
**Symptoms:**
- Session found initially
- `No session found during profile creation submission`

**Possible Causes:**
- Session expiration
- Client-side storage issues
- Race conditions

**Solutions:**
- Check session expiration time
- Verify localStorage storage
- Increase wait times

### **Issue 3: Session Lost After Metadata Update**
**Symptoms:**
- Profile created successfully
- `SESSION LOST AFTER PROFILE CREATION`

**Possible Causes:**
- `updateUser()` call invalidating session
- Token refresh issues
- Storage corruption

**Solutions:**
- Check if `updateUser()` is causing session loss
- Verify token refresh mechanism
- Check localStorage for corruption

## 🔧 Additional Debugging Steps

### **1. Check Browser Storage:**
```javascript
// Open browser console and check:
console.log('LocalStorage:', localStorage);
console.log('Session Storage:', sessionStorage);
```

### **2. Check Network Requests:**
- Open Network tab in DevTools
- Look for `/auth/callback` request
- Check response headers for Set-Cookie
- Verify cookies are being set

### **3. Check Middleware Logs:**
Add this to middleware for debugging:
```typescript
console.log('Middleware session check:', session);
```

### **4. Check Server-Side Session:**
In the callback route, add:
```typescript
console.log('Server session after exchange:', data.session);
```

## 📋 Expected Successful Flow

### **Complete Success Logs:**
```
=== PROFILE CREATION SESSION CHECK ===
Session found on attempt 1: {...}
=== SESSION VALIDATION SUCCESSFUL ===
=== PROFILE CREATION READY ===

=== PROFILE CREATION SUBMISSION START ===
Session found for profile creation: {...}
Profile created successfully
User metadata updated successfully

=== POST-CREATION SESSION VALIDATION ===
Session validated on attempt 1: {...}
=== PROFILE CREATION COMPLETED SUCCESSFULLY ===
Redirecting to welcome screen: /welcome-user
```

## 🎯 Next Steps

1. **Deploy the changes** and test the OAuth flow
2. **Check browser console** for the debugging logs
3. **Identify where the session is lost** based on the logs
4. **Apply targeted fixes** based on the specific failure point

The comprehensive logging will show exactly where the session persistence fails, allowing for precise fixes rather than general improvements.
