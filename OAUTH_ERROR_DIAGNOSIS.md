# OAuth Authentication Error: Diagnosis & Recovery Guide

## Error Symptoms

- **Environment**: Production only (Vercel)
- **Trigger**: Immediate after Google OAuth redirect
- **Error Message**: "OAuth Error: server_error - Database error saving new user"
- **Local Development**: Works correctly

---

## Root Cause Analysis

The error occurs due to **schema mismatch** from conflicting database migrations:

### The Problem

Your migration history has conflicting approaches:

1. **Original schema** (20260223020400): Uses `id` as PRIMARY KEY with FOREIGN KEY to `auth.users(id)`
2. **Later migrations** (20260224050000, 20260224082407): Added separate `user_id` column
3. **Result**: Production database likely has both columns, causing the trigger to find the wrong reference

### Why It Fails in Production but Not Locally

- Local development may have migrations applied in different order
- Or manual schema fixes on local override the migration versions
- Production runs migrations in strict order, exposing the conflict

### Detailed Flow

```
1. User clicks "Sign in with Google"
2. Supabase creates auth.users record ✓
3. Trigger `on_auth_user_created` fires
4. Trigger tries to INSERT into profiles.user_id (which may not exist properly)
5. INSERT fails with "database error"
6. Trigger exception is caught silently
7. Client receives: "OAuth Error: server_error - Database error saving new user"
```

---

## Recommended Fixes (In Priority Order)

### IMMEDIATE ACTION (Before Deploy)

#### 1. Apply Schema Consolidation Migration

Deploy the new migration file:

```
supabase/migrations/20260225000000_consolidate_schema_fix.sql
```

This migration:

- ✅ Removes conflicting `user_id` column
- ✅ Recreates `profiles` table with clean schema (using `id` as FK)
- ✅ Creates bulletproof trigger with proper error handling
- ✅ Fixes all RLS policies consistently
- ✅ Adds debug function `debug_oauth_issue()`

**How to apply:**

1. **Local testing first:**

   ```bash
   supabase db pull  # Get current schema
   supabase db reset # Apply all migrations locally
   npx npm test      # Verify OAuth flow works
   ```

2. **Production deployment:**
   ```bash
   supabase db push  # Push schema to production
   ```

---

### VERIFICATION STEPS

#### Step 1: Check Production Database Schema

In Supabase Dashboard → SQL Editor, run:

```sql
-- Check profiles table structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Should show ONLY these columns (no 'user_id'):
-- id (UUID, PRIMARY KEY)
-- full_name (TEXT)
-- database_role (TEXT)
-- visual_role (TEXT)
-- educational_level (TEXT)
-- department (TEXT)
-- is_anonymous (BOOLEAN)
-- theme_preference (TEXT)
-- created_at (TIMESTAMPTZ)
```

#### Step 2: Verify Trigger Exists

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Should return: on_auth_user_created | INSERT | auth.users
```

#### Step 3: Check RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Should show policies with consistent 'id' column references
```

---

### DEBUGGING: If OAuth Still Fails After Migration

#### Option A: Check Supabase Logs

1. Go to Supabase Dashboard → **Logs**
2. Filter by: `error` or `database`
3. Look for entries from time of OAuth attempt
4. Copy full error message

#### Option B: Run Debug Function

If you successfully authenticate (session exists), run:

```sql
SELECT * FROM public.debug_oauth_issue('USER_ID_HERE');
```

Interpretation:

- `user_exists: true` - User in auth.users ✓
- `profile_exists: false` - Profile not created ✗ (trigger failed)
- `trigger_should_work: true` - Trigger should fire next time ⚠️

#### Option C: Check OAuth Provider Settings

In Supabase Dashboard → **Authentication** → **Providers** → **Google**:

Verify these match your Vercel environment:

- ✓ Client ID
- ✓ Client Secret
- ✓ Redirect URL: `https://maintenance-facility-management.vercel.app/auth/callback`

---

### CODE FIXES

#### Fix 1: Update AuthCallbackClient.tsx (Optional Enhancement)

Your current code is actually fine, but this makes debugging better:

**In** [src/app/auth/callback/AuthCallbackClient.tsx](src/app/auth/callback/AuthCallbackClient.tsx#L1):

```tsx
// Add this check after line 47 (when profile error occurs)
if (profileError) {
  console.error("Profile query failed:", profileError);

  // NEW: Check if it's a schema-related error
  if (profileError.message?.includes('column') || profileError.code === '42703') {
    console.error('SCHEMA MISMATCH: Columns missing. Trigger may have failed.');
    console.error('Run: SELECT * FROM public.debug_oauth_issue(...);');
  }

  // Continue with existing logic...
```

#### Fix 2: Update route.ts (Better Error Diagnostics)

**In** [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts#L90):

Add this after the profile query (around line 90):

```typescript
if (profileError) {
  console.error("Profile query failed:", profileError);

  // NEW: Log schema diagnostics
  try {
    const { data: debugData } = await supabase.rpc('debug_oauth_issue', {
      p_user_id: data.session.user.id
    });
    console.error("OAuth Debug Info:", JSON.stringify(debugData, null, 2));
  } catch (e) {
    console.error("Debug function failed:", e);
  }

  // If profile query fails but session is valid, assume new user...
```

---

## Environment Variables Verification

Ensure these are set in Vercel (Settings → Environment Variables):

```
✓ NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from Supabase]
✗ Do NOT set: SUPABASE_SERVICE_ROLE_KEY in client-side code (security risk)
```

The **anon key** is used for public operations and must match your Supabase project.

---

## Deployment Checklist

- [ ] Created migration: `20260225000000_consolidate_schema_fix.sql`
- [ ] Applied migration locally: `supabase db reset`
- [ ] Verified trigger exists and has correct logic
- [ ] Verified RLS policies use consistent `id` column
- [ ] Tested OAuth flow locally
- [ ] Deployed to Vercel: `git push origin main`
- [ ] Pushed schema to production: `supabase db push`
- [ ] Tested OAuth flow in production (https://maintenance-facility-management.vercel.app/login)
- [ ] Checked Supabase logs for any errors
- [ ] Ran `debug_oauth_issue()` function to verify profile creation

---

## If Problem Persists

### Quick Diagnostic Commands

Run these in Supabase SQL Editor:

```sql
-- 1. Check recent auth.users (replace with current time)
SELECT id, email, created_at FROM auth.users
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 2. Check if profiles exist for those users
SELECT id, full_name, created_at FROM public.profiles
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- 3. Compare the two (should match)
-- If auth.users count > profiles count = trigger is failing

-- 4. Test trigger manually (create test user)
-- (Don't do this on production without backup)
```

### Escalation Path

If still failing:

1. **Enable Database Logs**: Supabase → Logs, filter for trigger errors
2. **Check Function Permissions**: Ensure trigger function has SECURITY DEFINER
3. **Verify Service Role**: Some operations require service_role key (but OAuth uses anon key)
4. **Contact Supabase Support**: Provide profiles table structure + trigger code + error logs

---

## Success Indicators

After applying the migration:

1. ✅ OAuth redirect completes without error
2. ✅ User redirected to `/profile-creation` or `/dashboard`
3. ✅ New profile appears in Supabase `profiles` table
4. ✅ `auth.users` and `profiles` rows match
5. ✅ No "database error" messages in logs
