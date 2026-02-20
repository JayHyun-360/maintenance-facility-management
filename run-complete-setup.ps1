# Script to run complete schema setup
# Replace YOUR_PASSWORD with your actual database password

$DB_PASSWORD = "YOUR_PASSWORD"  # <-- REPLACE THIS
$DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
$DB_PORT = "6543"
$DB_USER = "postgres.yozddskzyykymidjucqt"
$DB_NAME = "postgres"

Write-Host "Running complete schema setup..." -ForegroundColor Green

try {
    psql --version | Out-Null
    Write-Host "psql found, setting up complete schema..." -ForegroundColor Green
    
    $connectionString = "postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME"
    
    Write-Host "Running complete-schema-setup.sql..." -ForegroundColor Green
    
    psql "$connectionString" -f "complete-schema-setup.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Complete schema setup successful!" -ForegroundColor Green
        Write-Host "All tables created and RLS policies fixed." -ForegroundColor Yellow
        Write-Host "Try logging in now via Google OAuth or email." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To set an existing user as Admin:" -ForegroundColor Cyan
        Write-Host "SELECT set_user_role('your-email@example.com', 'Admin');" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error during setup. Check the error messages above." -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ psql not found. Please install PostgreSQL or use Supabase Dashboard." -ForegroundColor Red
    Write-Host "Alternative: Go to https://yozddskzyykymidjucqt.supabase.co" -ForegroundColor Yellow
    Write-Host "Navigate to SQL Editor and run complete-schema-setup.sql manually" -ForegroundColor Yellow
}

Write-Host "Setup script completed." -ForegroundColor Green
