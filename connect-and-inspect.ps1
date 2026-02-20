# PowerShell script to connect to Supabase database and run inspection
# Replace YOUR_PASSWORD with your actual database password

$DB_PASSWORD = "YOUR_PASSWORD"  # <-- REPLACE THIS
$DB_HOST = "aws-0-us-east-1.pooler.supabase.com"
$DB_PORT = "6543"
$DB_USER = "postgres.yozddskzyykymidjucqt"
$DB_NAME = "postgres"

Write-Host "Connecting to Supabase database..." -ForegroundColor Green

# Check if psql is available
try {
    psql --version | Out-Null
    Write-Host "psql found, connecting to database..." -ForegroundColor Green
    
    # Connect and run inspection script
    $connectionString = "postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME"
    
    Write-Host "Connection string prepared (password hidden)" -ForegroundColor Yellow
    Write-Host "Running database inspection..." -ForegroundColor Green
    
    # Run the inspection script
    psql "$connectionString" -f "database-inspection.sql"
    
} catch {
    Write-Host "psql not found. Installing PostgreSQL..." -ForegroundColor Yellow
    
    # Try to install PostgreSQL
    try {
        winget install PostgreSQL.PostgreSQL --accept-package-agreements --accept-source-agreements
        Write-Host "PostgreSQL installed. Please restart PowerShell and run this script again." -ForegroundColor Green
    } catch {
        Write-Host "Failed to install PostgreSQL automatically." -ForegroundColor Red
        Write-Host "Please install PostgreSQL manually from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        Write-Host "Or use the Supabase CLI with: npx supabase db shell" -ForegroundColor Yellow
    }
}

Write-Host "Script completed." -ForegroundColor Green
