-- Debug hCaptcha configuration
-- Check if environment variables are set properly

-- This will help identify the issue
SELECT 
    'HCAPTCHA_SECRET_KEY Status' as check_name,
    CASE 
        WHEN current_setting('HCAPTCHA_SECRET_KEY') IS NULL THEN 'NOT SET'
        ELSE 'SET'
    END as status;

-- Also check other environment variables
SELECT 
    'NEXT_PUBLIC_HCAPTCHA_SITE_KEY Status' as check_name,
    CASE 
        WHEN current_setting('NEXT_PUBLIC_HCAPTCHA_SITE_KEY') IS NULL THEN 'NOT SET'
        ELSE 'SET'
    END as status;
