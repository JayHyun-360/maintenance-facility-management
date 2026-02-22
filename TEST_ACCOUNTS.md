# Test Account Instructions

## 📋 Current Status

The test accounts use **anonymous authentication** to avoid email verification issues. They work immediately without any setup required.

## 🔄 Anonymous Test Authentication

### How Test Accounts Work:

1. **User selects role** (User/Admin toggle on login page)
2. **Clicks "Continue with Test Account"**
3. **System automatically**:
   - Uses `signInAnonymously()` (no email verification needed)
   - Passes test metadata (name, role, visual role)
   - Triggers `handle_new_user()` function
   - Creates profile in `public.profiles` table
   - Sets `auth.users.app_metadata.role` for routing
   - Redirects to appropriate dashboard

### 🎯 Test Account Details:

| Role  | Name            | Database Role | Visual Role | Account Type |
| ----- | --------------- | ------------- | ----------- | ------------ |
| User  | User Test User  | user          | Teacher     | Anonymous    |
| Admin | Admin Test User | admin         | Staff       | Anonymous    |

## ✅ Expected Behavior:

**Every Login:**

- Instant sign-in (no email verification)
- Creates/uses anonymous profile with test metadata
- Sets proper metadata for role-based routing
- Redirects to correct dashboard (`/dashboard` or `/admin/dashboard`)

**Special Features:**

- `is_test_account: true` flag for identification
- `is_anonymous: true` for proper categorization
- Consistent user experience

## 🚀 Testing Steps:

1. Go to `/login`
2. Select "User" role → Click "Continue with Test Account"
3. Should redirect to `/dashboard` as "User Test User"
4. Sign out
5. Select "Admin" role → Click "Continue with Test Account"
6. Should redirect to `/admin/dashboard` as "Admin Test User"

## 🎯 Why Anonymous Authentication:

**✅ Benefits:**

- **No Email Verification**: Bypasses email confirmation requirements
- **Instant Setup**: Works immediately without database configuration
- **Consistent UX**: Same flow as guest accounts
- **Clean Testing**: Professional developer experience
- **Metadata Support**: Full role and profile information

**❌ Avoids:**

- Email verification delays
- Fake email domain issues
- Manual account creation
- Admin API permission problems

## 📝 Database Verification:

After login, you can verify test profiles exist:

```sql
SELECT id, full_name, database_role, visual_role, is_anonymous, created_at
FROM public.profiles
WHERE raw_user_meta_data->>'is_test_account' = 'true';
```

## 🔍 Identifying Test Accounts:

Test accounts are marked with:

- `is_anonymous: true` in profiles table
- `is_test_account: true` in user metadata
- Predictable names: "User Test User" / "Admin Test User"

**The test accounts use anonymous authentication for instant, reliable testing!**
