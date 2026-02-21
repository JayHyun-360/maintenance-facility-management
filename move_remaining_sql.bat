@echo off
echo Moving remaining SQL files to organized folders...

REM Move CHECK_TABLE_EXISTENCE.sql
if exist "CHECK_TABLE_EXISTENCE.sql" (
    copy "CHECK_TABLE_EXISTENCE.sql" "My SQLs\Scripts\CHECK_TABLE_EXISTENCE.sql"
    del "CHECK_TABLE_EXISTENCE.sql"
    echo Moved: CHECK_TABLE_EXISTENCE.sql
) else (
    echo File not found: CHECK_TABLE_EXISTENCE.sql
)

REM Move FINAL_ADMIN_RLS_FIX.sql
if exist "FINAL_ADMIN_RLS_FIX.sql" (
    copy "FINAL_ADMIN_RLS_FIX.sql" "My SQLs\Fixes\FINAL_ADMIN_RLS_FIX.sql"
    del "FINAL_ADMIN_RLS_FIX.sql"
    echo Moved: FINAL_ADMIN_RLS_FIX.sql
) else (
    echo File not found: FINAL_ADMIN_RLS_FIX.sql
)

REM Move FINAL_CORRECTED_FIX.sql
if exist "FINAL_CORRECTED_FIX.sql" (
    copy "FINAL_CORRECTED_FIX.sql" "My SQLs\Fixes\FINAL_CORRECTED_FIX.sql"
    del "FINAL_CORRECTED_FIX.sql"
    echo Moved: FINAL_CORRECTED_FIX.sql
) else (
    echo File not found: FINAL_CORRECTED_FIX.sql
)

REM Move complete-schema-setup.sql
if exist "complete-schema-setup.sql" (
    copy "complete-schema-setup.sql" "My SQLs\Schema\complete-schema-setup.sql"
    del "complete-schema-setup.sql"
    echo Moved: complete-schema-setup.sql
) else (
    echo File not found: complete-schema-setup.sql
)

REM Move final-authentication-fix.sql
if exist "final-authentication-fix.sql" (
    copy "final-authentication-fix.sql" "My SQLs\Fixes\final-authentication-fix.sql"
    del "final-authentication-fix.sql"
    echo Moved: final-authentication-fix.sql
) else (
    echo File not found: final-authentication-fix.sql
)

REM Move fix-authentication-issues.sql
if exist "fix-authentication-issues.sql" (
    copy "fix-authentication-issues.sql" "My SQLs\Fixes\fix-authentication-issues.sql"
    del "fix-authentication-issues.sql"
    echo Moved: fix-authentication-issues.sql
) else (
    echo File not found: fix-authentication-issues.sql
)

echo.
echo SQL file organization complete!
pause
