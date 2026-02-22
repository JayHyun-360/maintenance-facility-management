-- ==========================================
-- Seed Test Accounts for Development
-- ==========================================

-- Note: These accounts will be created through the auth trigger
-- when users sign in with the following credentials:

-- Admin Test Account
-- Email: AdminTest@gmail.com
-- Password: Admin12345
-- Role: admin

-- User Test Account  
-- Email: UserTest@gmail.com
-- Password: User12345
-- Role: user

-- The trigger will automatically create profiles with the correct roles
-- when these users authenticate for the first time.

-- No manual inserts needed - the handle_new_user() trigger handles this
