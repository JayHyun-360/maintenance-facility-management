# Announcement Functionality Test Checklist

## Issue Fixed ✅
The RLS policies on the `notifications` table have been updated to allow admins to create notifications for all users when sending announcements.

## Manual Testing Steps

### Prerequisites
- Development server running at http://localhost:3000
- Test accounts available:
  - **Admin**: AdminTest@gmail.com / Admin12345
  - **User**: UserTest@gmail.com / User12345

### Test Flow

#### 1. Admin Creates Announcement
1. Login as **AdminTest@gmail.com**
2. Navigate to Admin Dashboard
3. Click on "Announcements" tab
4. Click "Send Announcement"
5. Fill in:
   - Title: "Test Announcement"
   - Message: "This is a test announcement to verify notifications work"
6. Click "Send Announcement"
7. Verify success message appears

#### 2. User Receives Notification
1. Open new browser window/incognito mode
2. Login as **UserTest@gmail.com**
3. Navigate to User Dashboard
4. Check notification bell icon (top right)
5. **Expected Result**: Should see new notification with title "Test Announcement"
6. Click on notification to view details
7. Verify announcement modal opens with correct content

#### 3. Database Verification (if possible)
If you have database access, verify:

**Announcements Table:**
```sql
SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5;
```
Should show the newly created announcement.

**Notifications Table:**
```sql
SELECT * FROM notifications 
WHERE target_role = 'user' 
ORDER BY created_at DESC LIMIT 10;
```
Should show notifications created for each user.

### Expected Behavior
✅ **Admin**: Can create announcements successfully  
✅ **Users**: Receive notifications for new announcements  
✅ **Database**: Announcements stored in `announcements` table, notifications in `notifications` table  
✅ **UI**: Notifications appear in user dashboard with correct title and message  

### Troubleshooting

If notifications don't appear:

1. **Check browser console** for any JavaScript errors
2. **Verify RLS policies** were applied correctly
3. **Check network tab** for failed API calls
4. **Ensure user is logged in** with correct test account

### Key Files Modified
- `/supabase/migrations/20260306030000_fix_maintenance_requests_rls.sql`
  - Updated RLS policies to allow admins to create notifications for any user

### Technical Details
The fix allows admins to bypass the `user_id = auth.uid()` restriction when creating notifications, while maintaining security by checking `(auth.jwt() ->> 'role') = 'admin'`.

This follows the "Circuit Breaker" pattern using JWT metadata for role checks instead of querying the profiles table.
