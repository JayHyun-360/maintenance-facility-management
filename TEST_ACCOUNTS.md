# Test Account Instructions

## 📋 Current Status

The test accounts **DO NOT exist** in `auth.users` table yet. They will be created automatically when you first sign in using the "Continue with Test Account" option.

## 🔄 Profile Creation Process

### How Test Accounts Work:

1. **User selects role** (User/Admin toggle on login page)
2. **Clicks "Continue with Test Account"** 
3. **System automatically**:
   - Signs in with pre-configured credentials
   - Triggers `handle_new_user()` function
   - Creates profile in `public.profiles` table
   - Sets `auth.users.app_metadata.role` for routing

### 🎯 Test Credentials:

| Role | Email | Password | Database Role | Visual Role |
|-------|--------|----------|--------------|-------------|
| User | UserTest@gmail.com | User12345 | user | Teacher |
| Admin | AdminTest@gmail.com | Admin12345 | admin | Staff |

## ✅ Expected Behavior:

**First Time Login:**
- Creates new profile automatically via trigger
- Sets proper metadata for role-based routing
- Redirects to correct dashboard (`/dashboard` or `/admin/dashboard`)

**Subsequent Logins:**
- Uses existing profile from database
- Maintains same role and metadata

## 🚀 Testing Steps:

1. Go to `/login`
2. Select "User" role → Click "Continue with Test Account"
3. Should redirect to `/dashboard` as "User Test User"
4. Sign out
5. Select "Admin" role → Click "Continue with Test Account"  
6. Should redirect to `/admin/dashboard` as "Admin Test User"

## 📝 Database Verification:

After first login, you can verify profiles exist:
```sql
SELECT id, full_name, database_role, visual_role, is_anonymous, created_at 
FROM public.profiles 
WHERE email IN ('AdminTest@gmail.com', 'UserTest@gmail.com');
```

**The test accounts are designed for development testing and will be created on-demand through the authentication trigger!**
