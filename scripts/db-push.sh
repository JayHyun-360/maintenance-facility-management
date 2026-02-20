#!/bin/bash

# Database Push Script for Supabase
# Usage: ./scripts/db-push.sh [migration-file]

set -e

# Check if migration file is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a migration file"
    echo "Usage: ./scripts/db-push.sh migrations/your_migration.sql"
    exit 1
fi

MIGRATION_FILE=$1

# Check if file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file '$MIGRATION_FILE' not found"
    exit 1
fi

echo "🚀 Pushing migration to Supabase..."
echo "📁 Migration file: $MIGRATION_FILE"

# Get project reference from config or use default
PROJECT_REF="yozddskzyykymidjucqt"

# Execute migration using psql
echo "🔗 Connecting to Supabase project: $PROJECT_REF"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed. Please install PostgreSQL client tools"
    exit 1
fi

# Get database URL from environment or prompt
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DB_URL not found in environment"
    echo "🔗 Please enter your Supabase database URL:"
    echo "   Found in Supabase Dashboard > Settings > Database > Connection string"
    read -p "Database URL: " SUPABASE_DB_URL
fi

# Execute migration
echo "📝 Executing migration..."
psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"

echo "✅ Migration completed successfully!"
echo "🎯 Migration '$MIGRATION_FILE' has been applied to your Supabase database"
