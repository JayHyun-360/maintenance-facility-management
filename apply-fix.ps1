# Script to apply the authentication fix
# Replace YOUR_PASSWORD with your actual database password

$DB_PASSWORD = "YOUR_PASSWORD"  # <-- REPLACE THIS
$DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
$DB_PORT = "6543"
$DB_USER = "postgres.yozddskzyykymidjucqt"
$DB_NAME = "postgres"

Write-Host "Applying authentication fix..." -ForegroundColor Green

# Check if psql is available
try {
    psql --version | Out-Null
    Write-Host "psql found, applying fix..." -ForegroundColor Green
    
    # Connect and run fix script
    $connectionString = "postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME"
    
    Write-Host "Running fix-authentication-issues.sql..." -ForegroundColor Green
    
    # Run the fix script
    psql "$connectionString" -f "fix-authentication-issues.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Fix applied successfully!" -ForegroundColor Green
        Write-Host "Try logging in now via Google OAuth or email." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error applying fix. Check the error messages above." -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ psql not found. Please install PostgreSQL or use Supabase Dashboard." -ForegroundColor Red
    Write-Host "Alternative: Go to https://yozddskzyykymidjucqt.supabase.co" -ForegroundColor Yellow
    Write-Host "Navigate to SQL Editor and run fix-authentication-issues.sql manually" -ForegroundColor Yellow
}

Write-Host "Script completed." -ForegroundColor Green
