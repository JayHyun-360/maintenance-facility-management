# OAuth Authentication Error - QUICK FIX GUIDE

## Problem Summary

Google OAuth login fails in production with: "OAuth Error: server_error - Database error saving new user"

**Root Cause**: Schema mismatch. Your database migrations created conflicting `id` vs `user_id` columns, causing the trigger to fail silently.

---

## ✅ Solutions Applied

### 1. Created New Migration

**File**: `supabase/migrations/20260225000000_consolidate_schema_fix.sql`

This migration:

- ✅ Removes conflicting `user_id` column
- ✅ Resets `profiles` table to use `id` as PRIMARY KEY
- ✅ Creates bulletproof trigger
- ✅ Fixes all RLS policies
- ✅ Adds `debug_oauth_issue()` function

### 2. Fixed Code Issues

**Files Updated**:

- ✅ `src/app/auth/callback/route.ts` - Now queries profiles by `id` instead of `user_id`
- ✅ `src/app/auth/callback/AuthCallbackClient.tsx` - Added schema mismatch detection

---

## 🚀 Immediate Next Steps

### Step 1: Test Locally

```bash
cd c:\Users\Charljay\Desktop\maintenance-facility-management

# Reset your local database with new migration
supabase db reset

# Start development server
npm run dev

# Test OAuth flow at: http://localhost:3000/login
```

**Expected Result**: OAuth completes, user created in profiles table ✓

### Step 2: Deploy to Vercel

```bash
# Commit changes
git add -A
git commit -m "Fix OAuth schema mismatch - consolidate id vs user_id columns"
git push origin main

# Vercel auto-deploys on push
```

### Step 3: Apply Schema to Production

```bash
# Push schema migration to production Supabase
supabase db push

# Enter production database password when prompted
```

### Step 4: Verify Production Fix

```
1. Go to: https://maintenance-facility-management.vercel.app/login
2. Click "Sign in with Google"
3. Complete OAuth flow
4. You should be redirected to profile creation or dashboard (NOT error page)
```

---

## 🔍 Verify It Worked

### In Supabase Dashboard

**SQL Editor → Run this query:**

```sql
-- Check profiles table structure (should show NO user_id column)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Should see ONLY these columns:
-- id (UUID) - PRIMARY KEY
-- full_name (TEXT)
-- database_role (TEXT)
-- visual_role (TEXT)
-- educational_level (TEXT)
-- department (TEXT)
-- is_anonymous (BOOLEAN)
-- theme_preference (TEXT)
-- created_at (TIMESTAMPTZ)
```

**If OAuth still fails, run diagnostic:**

```sql
-- First, get a test user ID from recent auth.users
SELECT id, email FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

-- Run debug function with that ID (copy user ID from above)
SELECT * FROM public.debug_oauth_issue('YOUR_USER_ID_HERE');

-- Interpretation:
-- If user_exists=true but profile_exists=false: Trigger failed (check logs)
-- If both true: User created successfully ✓
```

---

## 📋 Configuration Checklist

- [ ] Migration file created: `20260225000000_consolidate_schema_fix.sql`
- [ ] Code files updated (route.ts, AuthCallbackClient.tsx)
- [ ] Local database reset: `supabase db reset`
- [ ] Local OAuth tested successfully
- [ ] Changes committed and pushed to main branch
- [ ] Schema pushed to production: `supabase db push`
- [ ] Verified production OAuth works
- [ ] Checked profiles table in Supabase (no user_id column exists)

---

## 🆘 If Problem Persists

1. **Check Supabase Logs**:
   - Supabase Dashboard → Logs
   - Filter by: error, database
   - Look for trigger errors

2. **Run Diagnostic**:

   ```sql
   SELECT * FROM public.debug_oauth_issue('USER_ID_HERE');
   ```

3. **Key Questions**:
   - Does new `profiles` record appear after OAuth? (Check profiles table)
   - Does `auth.users` record exist? (Check auth.users)
   - Any error messages in Supabase logs?

---

## 📄 Full Documentation

See `OAUTH_ERROR_DIAGNOSIS.md` for:

- Complete root cause analysis
- Detailed schema migration explanation
- Extended debugging steps
- Environment variable verification
- Deployment checklist
