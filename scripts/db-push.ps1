# Database Push Script for Supabase (PowerShell)
# Usage: .\scripts\db-push.ps1 [migration-file]

param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile
)

# Check if file exists
if (-not (Test-Path $MigrationFile)) {
    Write-Host "❌ Error: Migration file '$MigrationFile' not found" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Pushing migration to Supabase..." -ForegroundColor Green
Write-Host "📁 Migration file: $MigrationFile" -ForegroundColor Yellow

# Project reference
$ProjectRef = "yozddskzyykymidjucqt"

# Get database URL from environment or prompt
$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
    Write-Host "⚠️  SUPABASE_DB_URL not found in environment" -ForegroundColor Yellow
    Write-Host "🔗 Please enter your Supabase database URL:" -ForegroundColor Cyan
    Write-Host "   Found in Supabase Dashboard > Settings > Database > Connection string" -ForegroundColor Gray
    $DbUrl = Read-Host "Database URL"
}

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ Error: psql is not installed. Please install PostgreSQL client tools" -ForegroundColor Red
    Write-Host "   Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

# Execute migration
Write-Host "📝 Executing migration..." -ForegroundColor Blue
try {
    & psql $DbUrl -f $MigrationFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "🎯 Migration '$MigrationFile' has been applied to your Supabase database" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Error executing migration: $($_)" -ForegroundColor Red
    exit 1
}
