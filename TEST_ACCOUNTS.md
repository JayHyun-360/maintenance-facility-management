# Test Account Instructions

## 📋 Current Status

The test accounts use **email/password authentication** to avoid captcha verification issues. They work immediately with automatic account creation.

## 🔄 Email/Password Test Authentication

### How Test Accounts Work:

1. **User selects role** (User/Admin toggle on login page)
2. **Clicks "Continue with Test Account"**
3. **System automatically**:
   - Attempts to sign in with test credentials
   - If account doesn't exist → Creates it via `signUp()`
   - Triggers `handle_new_user()` function
   - Creates profile in `public.profiles` table
   - Sets `auth.users.app_metadata.role` for routing
   - Completes sign-in and redirects to dashboard

### 🎯 Test Account Details:

| Role  | Email               | Password   | Database Role | Visual Role | Account Type |
| ----- | ------------------- | ---------- | ------------- | ----------- | ------------ |
| User  | user-test@demo.dev  | User12345  | user          | Teacher     | Regular      |
| Admin | admin-test@demo.dev | Admin12345 | admin         | Staff       | Regular      |

## ✅ Expected Behavior:

**First Time Login:**

- "Test account not found, creating..." in console
- "Skipping email verification for test account..." in console
- Creates new profile automatically via trigger
- Sets proper metadata for role-based routing
- Redirects to correct dashboard (`/dashboard` or `/admin/dashboard`)

**Subsequent Logins:**

- Signs in directly (account already exists)
- Uses existing profile from database
- Maintains same role and metadata

## 🚀 Testing Steps:

1. Go to `/login`
2. Select "User" role → Click "Continue with Test Account"
3. Should redirect to `/dashboard` as "User Test User"
4. Sign out
5. Select "Admin" role → Click "Continue with Test Account"
6. Should redirect to `/admin/dashboard` as "Admin Test User"

## 🎯 Why Email/Password Authentication:

**✅ Benefits:**

- **No Captcha Issues**: Bypasses anonymous authentication restrictions
- **Reliable Creation**: Standard sign-up flow works consistently
- **Automatic Setup**: Creates accounts on-demand
- **Consistent UX**: Same flow as real users
- **Clean Testing**: Professional developer experience

**❌ Avoids:**

- Captcha verification blocking anonymous sign-ins
- Email verification delays for fake domains
- Manual database setup
- Complex authentication flows

## 📝 Database Verification:

After first login, you can verify test profiles exist:

```sql
SELECT id, full_name, database_role, visual_role, is_anonymous, is_test_account, created_at
FROM public.profiles
WHERE email IN ('admin-test@demo.dev', 'user-test@demo.dev');
```

## 🔍 Identifying Test Accounts:

Test accounts are marked with:

- `is_test_account: true` flag in profiles table
- `is_anonymous: false` (regular accounts, not anonymous)
- Predictable emails: `*-test@demo.dev`
- Predictable names: "User Test User" / "Admin Test User"

## 🛠️ Captcha Issue Resolution:

**❌ Previous Problem:**

- `signInAnonymously()` blocked by captcha verification
- Error: "captcha verification process failed"

**✅ Current Solution:**

- Use `signInWithPassword()` with test credentials
- Auto-create accounts if they don't exist
- Skip email verification for development testing
- Clean, reliable authentication flow

**The test accounts use email/password authentication to avoid captcha issues!**
