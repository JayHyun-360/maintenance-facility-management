# Supabase Development Workflow

This document outlines the streamlined development workflow for managing your Supabase database.

## 🚀 Quick Start

### 1. Database Migration Management

#### Push a new migration:
```bash
# PowerShell (Windows)
npm run db:push migrations/your_migration.sql

# Bash (if available)
npm run db:push:bash migrations/your_migration.sql
```

#### Check database status:
```bash
npm run db:status
```

#### Generate TypeScript types:
```bash
npm run db:types
```

### 2. Supabase CLI Commands

#### Login to Supabase:
```bash
npm run supabase:login
```

#### Link project (already done):
```bash
npm run supabase:link
```

#### Check project status:
```bash
npm run supabase:status
```

## 📁 Migration Files

Place your SQL migration files in the `migrations/` directory:
```
migrations/
├── phase1_initial_schema.sql
├── phase2_profiles_table.sql
├── phase3_rls_policies.sql
└── phase4_triggers.sql
```

## 🔧 Environment Setup

### Required Environment Variables:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database Connection (for migrations)
SUPABASE_DB_URL=postgresql://user:pass@your-project.supabase.co:5432/postgres
```

### Get Database URL:
1. Go to Supabase Dashboard
2. Settings → Database → Connection string
3. Copy the "Connection string" value
4. Set it as `SUPABASE_DB_URL` environment variable

## 🛠️ Development Workflow

### 1. Making Database Changes:
1. Create SQL migration file in `migrations/`
2. Test locally with sample data
3. Push to production: `npm run db:push migrations/your_file.sql`

### 2. TypeScript Integration:
1. After schema changes, regenerate types: `npm run db:types`
2. Use generated types in `src/types/supabase.ts`

### 3. Best Practices:
- Always backup before major changes
- Use descriptive migration names
- Test migrations on staging first
- Keep migrations reversible

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run db:push` | Push migration to Supabase (PowerShell) |
| `npm run db:push:bash` | Push migration to Supabase (Bash) |
| `npm run db:status` | Check remote database changes |
| `npm run db:types` | Generate TypeScript types |
| `npm run supabase:login` | Login to Supabase CLI |
| `npm run supabase:link` | Link project to Supabase |
| `npm run supabase:status` | Check project status |

## 🔍 Troubleshooting

### Common Issues:
1. **psql not found**: Install PostgreSQL client tools
2. **Connection failed**: Check SUPABASE_DB_URL environment variable
3. **Permission denied**: Ensure proper database permissions

### Docker Alternative:
If you want full local development with Docker:
1. Install Docker Desktop
2. Run `npx supabase start`
3. Use `npx supabase db push` for local migrations

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- CLI Reference: https://supabase.com/docs/reference/cli
