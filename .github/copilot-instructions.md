# Copilot Instructions for Maintenance Facility Management

## Project Overview

**Stack**: Next.js 15 (App Router) + Supabase Auth + PostgreSQL + Tailwind CSS  
**Auth**: Google OAuth via Supabase with PKCE flow  
**Database**: Postgres with Row-Level Security (RLS) policies  
**Key Pattern**: Circuit breaker pattern for role management

---

## 🔒 CRITICAL SECURITY RULES

### Circuit Breaker Pattern (Non-Negotiable)

**NEVER write an RLS policy that queries `public.profiles` to check a user's role.** This causes infinite recursion and 5-second hangs.

**MANDATORY**: Always use JWT metadata for role checks in RLS policies:

```sql
-- ✅ CORRECT: Uses JWT token metadata (instant)
CREATE POLICY "admin_only" ON public.maintenance_requests
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

-- ❌ WRONG: Queries table → recursion → HANG
CREATE POLICY "admin_only" ON public.maintenance_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND database_role = 'admin')
  );
```

**Role Stamping**: Roles are synced from `database_role` column to `auth.users.raw_app_metadata.role` via PostgreSQL trigger. This ensures JWT always has current role.

---

## Architecture & Data Flows

### Authentication Flow (CRITICAL - Recently Debugged)

```
User → Google OAuth → /auth/callback (route.ts)
  → exchangeCodeForSession()
  → Trigger: handle_new_user() creates profiles row
  → Checks if profile exists
  → Redirects to /profile-creation or /dashboard
```

**Key insight**: All new users must have BOTH:

1. `auth.users` record (created by Supabase)
2. `public.profiles` record (created by trigger `handle_new_user()`)

**Schema**: `profiles.id` → FK to `auth.users.id` (PRIMARY KEY, not user_id)

### Role Management & Database Roles

**Only two database roles exist**:

- `admin`: Dashboard admin access (rare)
- `user`: Standard authenticated user (portal access)

```
User signs up → Trigger reads database_role from metadata
  → Stores in profiles.database_role
  → Syncs to auth.users.raw_app_metadata.role via trigger
  → Middleware reads app_metadata?.role for redirects
  → RLS policies check JWT: (auth.jwt() ->> 'role') = 'admin'
```

**Critical files**:

- `middleware.ts`: Enforces role-based redirects (line 37+)
- `src/app/auth/callback/route.ts`: Profile creation check (line 80+)
- `supabase/migrations/20260225000000_*`: Trigger ensures JWT always has current role

### Database Structure

**Core tables**:

- `public.profiles`: User profiles with `database_role` synced to `auth.users.app_metadata`
- `public.maintenance_requests`: Facility requests linked to `profiles.id`
- `public.notifications`: User notifications
- `public.audit_logs`: Change tracking

### Visual Roles vs Database Roles (Important Distinction)

**Database Roles**: `admin` or `user` - control authentication and feature access

**Visual Roles**: `Teacher`, `Staff`, or `Student` - for reporting/display only, NOT auth

- Only `user` role accounts (Google OAuth or Guest) can select visual roles
- Stored in `profiles.visual_role` column
- NOT used in RLS policies or authentication
- Combined with `educational_level` for context

### Guest Logic (Special Case)

Guests are authenticated as `user` role with optional metadata:

- Name + Visual Role required
- Educational Level optional
- Department mandatory ONLY if Educational Level = 'College'

**RLS Policy Pattern**:

```sql
CREATE POLICY "users_can_view_own" ON table_name
  FOR SELECT USING (auth.uid() = id);
```

All policies check `auth.uid()` against `id` column (never `user_id`).

---

## Project Structure & Patterns

### Route Organization

- `/auth/callback`: OAuth endpoint (server route)
- `/login`: Email/Google/Guest authentication
- `/dashboard`: User main area
- `/admin/dashboard`: Admin area (requires `role='admin'`)
- `/profile-creation`: First-time setup (redirected from `/auth/callback`)
- `/welcome-*`: Post-login onboarding

### Code Patterns

**Session Management** (enforced via @supabase/ssr)

Use `@supabase/ssr` for ALL session handling. This manages PKCE flow and cookie lifecycle automatically:

```typescript
// Client-side (use in page.tsx "use client")
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // Singleton with PKCE enabled

// Server-side (use in route.ts or server components)
import { createServerClient } from "@/lib/supabase/server";
const supabase = await createServerClient(); // SSR-aware with cookies
```

Never mix client and server clients; use appropriate one based on context.

**Server component auth check**:

```typescript
const supabase = await createServerClient();
const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) redirect("/login");
```

**Query by user ID**:

```typescript
// Always use 'id' column, never 'user_id'
.eq("id", session.user.id)
```

---

## Supabase Configuration

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from dashboard]
```

### PKCE OAuth Flow (Non-Negotiable)

Both client and server use PKCE:

- Client: `src/lib/supabase/client.ts` line 26 (`flowType: 'pkce'`)
- Server: `src/lib/supabase/server.ts` uses `@supabase/ssr` library

Why: Session security and token refresh without exposing secrets.

---

## Common Patterns & Anti-Patterns

### ✅ DO:

- Query profiles by `id`, not `user_id`: `.eq("id", user.id)`
- Use trigger for new user profile creation (automatic)
- Check `auth.uid()` in RLS policies
- Use server client in route handlers: `await createServerClient()`
- Redirect unauthenticated users from middleware (line 30)

### ❌ DON'T:

- **Query `profiles` in RLS policies** - causes recursion and 5+ second hangs; use JWT metadata instead
- **Query profiles by `user_id`** - doesn't exist in fixed schema; always use `id`
- **Manually insert into profiles** - trigger handles this automatically
- **Use service_role key in client code** - security risk; only use anon key in frontend
- **Reference or create `user_id` column** - consolidation removed it permanently

---

## Development Workflows & Project Structure

### Directory Structure (Follow Strictly)

```
src/
├── app/              # Next.js App Router pages & routes
├── components/       # Reusable React components
├── lib/
│   └── supabase/     # Supabase client singletons (client.ts, server.ts)
└── types/
    └── database.ts   # Generated from Supabase schema
```

### Start dev server

```bash
npm run dev
# Server runs on http://localhost:3000
```

### Type checking & linting

```bash
npm run type-check  # TypeScript errors
npm run lint        # ESLint
```

### Database migrations

```bash
# Reset local Supabase (applies all migrations)
supabase db reset

# Pull production schema
supabase db pull

# Push to production
supabase db push
```

### Debug OAuth failures

Use `public.debug_oauth_issue(user_id)` function (added by Feb 25 migration):

```sql
SELECT * FROM public.debug_oauth_issue('USER_UUID');
-- Returns: user_exists, profile_exists, app_metadata, profile_data
```

---

## Recent OAuth Schema Fix (ESSENTIAL CONTEXT)

**Problem**: Migration conflicts created ambiguous `id` vs `user_id` columns.  
**Root cause**: Multiple Feb 24 patches added `user_id` without cleaning up `id`.  
**Solution**: Migration `20260225000000_consolidate_schema_fix.sql` enforces:

- `profiles.id` as PRIMARY KEY (only column referencing auth.users)
- No `user_id` column exists
- All RLS policies use `id`
- Trigger `handle_new_user()` inserts into `id` column

**Key diff** from earlier migrations:

- ✅ Correct: `.eq("id", user.id)`
- ❌ Wrong: `.eq("user_id", user.id)`

---

## Debugging Tips

1. **OAuth not working?**
   - Check Supabase logs: Dashboard → Logs
   - Run: `SELECT * FROM public.debug_oauth_issue(user_id)`
   - Check: Does profile exist? (`profile_exists` field)

2. **Type errors?**
   - Sync database types: `supabase gen types typescript > src/types/database.ts`
   - Run: `npm run type-check`

3. **RLS policy blocking queries?**
   - Check: Does authenticated user have `auth.uid()` matching `id`?
   - Remember: Policies check the JWT claim from `auth.users.app_metadata`

4. **Session not persisting?**
   - Verify: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
   - Check: Cookies set by Supabase (look in browser DevTools)

---

## Key Files Reference

| File                                           | Purpose                           |
| ---------------------------------------------- | --------------------------------- |
| `middleware.ts`                                | Auth guard + role-based redirects |
| `src/app/auth/callback/route.ts`               | OAuth callback handler (server)   |
| `src/app/auth/callback/AuthCallbackClient.tsx` | OAuth fallback (client)           |
| `src/lib/supabase/client.ts`                   | Client-side Supabase singleton    |
| `src/lib/supabase/server.ts`                   | Server-side Supabase              |
| `src/types/database.ts`                        | Generated Supabase types          |
| `supabase/migrations/20260225000000_*.sql`     | **LATEST CRITICAL MIGRATION**     |

---

## When Adding Features

1. **New authenticated page?** → Add route to `middleware.ts` auth check
2. **New table with user data?** →
   - Add RLS policy using `auth.uid()` for row access
   - Never query `profiles` table in RLS; use JWT metadata for roles
3. **New user field?** → Add to `profiles` table + `src/types/database.ts` + regenerate types
4. **Admin-only feature?** → Check `session.user.app_metadata?.role === 'admin'`
5. **New migration?** → Maintain trigger logic: `handle_new_user()` must sync `database_role` to app_metadata
