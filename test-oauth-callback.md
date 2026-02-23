# OAuth Callback Test Guide

## Testing the Fixed Google OAuth Flow

### 1. Local Development Testing

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the login page:**
   ```
   http://localhost:3000/login
   ```

3. **Test Google OAuth:**
   - Click on the "Google" tab
   - Click "Continue with Google"
   - Complete the Google authentication flow
   - Verify you're redirected to the appropriate dashboard (not `/auth/error`)

### 2. Production Testing

1. **Navigate to your production app:**
   ```
   https://maintenance-facility-management.vercel.app/login
   ```

2. **Test the same flow as above**

### 3. Debugging Information

The callback now includes enhanced logging. Check your browser console and server logs for:

- **Auth callback received:** Shows what parameters were detected
- **Full URL:** The complete callback URL
- **Search params:** Query parameters received
- **Hash:** URL fragment (where access tokens are stored)

### 4. Expected Flow

1. **User clicks "Continue with Google"**
2. **Redirects to Google OAuth**
3. **Google redirects back to:** `/auth/callback`
4. **URL contains:** `#access_token=...` in the fragment
5. **Callback route:** Parses fragment and exchanges for session
6. **User redirected:** To dashboard or profile creation

### 5. Common Issues & Solutions

#### Issue: Still getting "No authentication parameters found"
**Check:**
- Google Cloud Console redirect URIs include your exact callback URL
- Supabase Auth settings have Google OAuth enabled
- Environment variables are correctly set

#### Issue: Redirect loop
**Check:**
- User profile exists in database
- Role assignment is working correctly
- Middleware isn't conflicting

### 6. Verification Commands

After successful login, verify the session:

```javascript
// In browser console
await supabase.auth.getSession()
```

The session should contain user data and valid tokens.

### 7. Environment Variables Checklist

Ensure these are set correctly in both local and production:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=your_app_url (http://localhost:3000 for dev)
```

### 8. Google Cloud Console Settings

Verify your OAuth 2.0 Client ID has:

**Authorized redirect URIs:**
- `http://localhost:3000/auth/callback` (development)
- `https://maintenance-facility-management.vercel.app/auth/callback` (production)
