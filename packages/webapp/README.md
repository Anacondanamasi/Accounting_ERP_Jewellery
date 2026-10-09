# HKS Accounting Web App

This folder is an isolated web app workspace built with **Next.js + Supabase** so your existing mobile app can be ported to web with strict feature parity.

## What This Includes

- Supabase SSR session handling (`@supabase/ssr`)
- Auth flows: login, signup, logout
- Role-protected routing:
  - User area: `/dashboard`
  - Admin area: `/admin`, `/admin/users`
- Admin user table with:
  - Search
  - Pagination
  - Edit/Delete actions
- Clean separation of:
  - `src/app` (UI + routes)
  - `src/services` (Supabase data access)
  - `src/providers` + `src/hooks` (auth state)
  - `src/components` (reusable UI)

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
NEXT_PUBLIC_ROLE_TABLE=profiles
NEXT_PUBLIC_ROLE_COLUMN=role
NEXT_PUBLIC_ROLE_USER_ID_COLUMN=id
NEXT_PUBLIC_ADMIN_ROLE_VALUE=admin
```

## Local Run

From repository root:

```bash
pnpm install
pnpm --filter @jewelledger/webapp dev
```

## Supabase Integration Checklist

1. Keep using the same Supabase project as mobile.
2. Confirm role source table/columns (`profiles.role`, `profiles.id`) or adjust env vars.
3. Keep RLS enabled for every table.
4. Ensure anon/publishable key has no privileged access.
5. Ensure auth redirect URLs include web domain and localhost.

## Deployment

### Vercel

1. Import repo.
2. Set root directory to `packages/webapp`.
3. Add all env vars from `.env.local`.
4. Deploy.

### Netlify

1. New site from Git.
2. Base directory: `packages/webapp`
3. Build command: `pnpm --filter @jewelledger/webapp build`
4. Publish directory: `.next`
5. Add env vars and deploy.

### Firebase Hosting (App Hosting / SSR)

1. Build web app: `pnpm --filter @jewelledger/webapp build`
2. Configure Firebase App Hosting for Next.js runtime.
3. Add Supabase env vars in Firebase hosting settings.

## Mapping Mobile -> Web (Required for 100% Parity)

Use this template for each Flutter mobile screen:

| Mobile Screen | Web Route | Service | Status |
| --- | --- | --- | --- |
| `lib/...` | `/...` | `src/services/...` | Pending |

Then port each feature in this order:

1. Auth + onboarding
2. User core journey
3. Admin dashboard
4. All CRUD entities
5. Realtime + storage flows
6. Final visual parity polish

## Important Note

The Flutter mobile source is not in this workspace yet, so this package is a production-grade foundation and routing/security scaffold. After you share mobile source and exact feature inventory, each module can be ported one-by-one to reach true 100% parity.
