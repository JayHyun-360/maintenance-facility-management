# Direct Database Reader Script
# This script connects directly to Supabase to read all SQL

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = "database-schema-export.sql"
)

# Get database URL from environment or prompt
$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
    Write-Host "SUPABASE_DB_URL not found in environment" -ForegroundColor Yellow
    Write-Host "Please enter your Supabase database URL:" -ForegroundColor Cyan
    Write-Host "Found in Supabase Dashboard > Settings > Database > Connection string" -ForegroundColor Gray
    $DbUrl = Read-Host "Database URL"
}

Write-Host "Connecting to database..." -ForegroundColor Blue

# Create SQL script to export schema
$sqlScript = @"
-- Complete Database Schema Export
-- Generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

-- Export all tables
SELECT 
    '-- Table: ' || table_name || ' (Schema: ' || table_schema || ')' AS table_info,
    'CREATE TABLE ' || table_schema || '.' || table_name || ' (' AS create_statement_start,
    STRING_AGG(
        column_name || ' ' || data_type || 
        CASE 
            WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', ' || CHAR(10) || '    '
    ) WITHIN GROUP (ORDER BY ordinal_position) AS columns,
    ');' AS create_statement_end
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%'
GROUP BY table_schema, table_name
ORDER BY table_schema, table_name;

-- Export all functions
SELECT 
    '-- Function: ' || routine_name || ' (Schema: ' || routine_schema || ')' AS function_info,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Export all triggers
SELECT 
    '-- Trigger: ' || trigger_name || ' on ' || event_object_table AS trigger_info,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- Export all RLS policies
SELECT 
    '-- Policy: ' || policyname || ' on ' || tablename AS policy_info,
    'CREATE POLICY ' || policyname || ' ON ' || tablename || ' FOR ' || cmd || ' TO ' || COALESCE(roles, 'public') || ' USING (' || COALESCE(qual, 'true') || ')' AS policy_definition
FROM pg_policies 
WHERE schemaname = 'public';
"@

# Execute and save results
try {
    $result = psql $DbUrl -c "$sqlScript" -A -t
    $result | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host "Database schema exported to: $OutputFile" -ForegroundColor Green
} catch {
    Write-Host "Error connecting to database: $($_)" -ForegroundColor Red
    exit 1
}
