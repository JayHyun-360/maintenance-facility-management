# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these to Vercel → Project Settings → Environment Variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://yozddskzyykymidjucqt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED]

# Google OAuth Configuration
NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID=[REDACTED]
SUPABASE_GOOGLE_CLIENT_SECRET=[REDACTED]

# Application URLs
NEXT_PUBLIC_SITE_URL=https://maintenance-facility-management.vercel.app
```

## Verification Steps

### 1. Vercel Dashboard

- Go to Project Settings → Environment Variables
- Add all variables above
- Ensure they are set to "Production" environment
- Trigger new deployment

### 2. Supabase Dashboard

- Project: yozddskzyykymidjucqt
- Authentication → Providers → Google
- Enable Google provider
- Set redirect URI: `https://maintenance-facility-management.vercel.app/auth/callback`
- Save configuration

### 3. Google Cloud Console

- OAuth Client: 26889083563-ardkhstrl1vqckq4gh3kd42rf3l4mkv2.apps.googleusercontent.com
- Authorized redirect URIs: `https://maintenance-facility-management.vercel.app/auth/callback`
- JavaScript origins: `https://maintenance-facility-management.vercel.app`

### 4. Testing Commands

```bash
# Test callback reachability
curl -I https://maintenance-facility-management.vercel.app/auth/callback
# Expected: 200 OK

curl -I https://maintenance-facility-management.vercel.app/api/auth/callback/google
# Expected: 404 (correct for App Router)
```

### 5. Incognito Test

1. Open incognito window
2. Navigate to: https://maintenance-facility-management.vercel.app/login
3. Click "Sign in with Google (Admin)"
4. Complete Google OAuth flow
5. Verify successful redirect to admin dashboard

## Security Notes

- .env.local contains production secrets and should NOT be in version control
- Consider rotating credentials if they were exposed
- Monitor Vercel deployment logs for environment variable warnings
