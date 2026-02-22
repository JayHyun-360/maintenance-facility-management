# Test Account Instructions

## 📋 Current Status

The test accounts use **smart sign-in with automatic creation**. They will be created automatically on first use - no manual setup required.

## 🔄 Smart Sign-In Process

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

### 🎯 Test Credentials:

| Role  | Email               | Password   | Database Role | Visual Role |
| ----- | ------------------- | ---------- | ------------- | ----------- |
| User  | UserTest@gmail.com  | User12345  | user          | Teacher     |
| Admin | AdminTest@gmail.com | Admin12345 | admin         | Staff       |

## ✅ Expected Behavior:

**First Time Login:**

- "Test account not found, creating..." in console
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

## 🎯 Why This Approach:

**✅ Benefits:**

- **One-Click Testing**: No extra modals or forms
- **Automatic Setup**: Creates accounts on-demand
- **Consistent UX**: Same flow as real users
- **Error Handling**: Graceful fallback if account doesn't exist
- **Professional**: Clean testing experience

**❌ Avoids:**

- Manual database setup
- Extra modals showing credentials
- Redundant form filling
- User confusion

## 📝 Database Verification:

After first login, you can verify profiles exist:

```sql
SELECT id, full_name, database_role, visual_role, is_anonymous, created_at
FROM public.profiles
WHERE email IN ('AdminTest@gmail.com', 'UserTest@gmail.com');
```

**The test accounts are designed for seamless development testing with automatic creation!**
