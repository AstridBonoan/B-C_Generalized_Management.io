# B&C General Management System

General-purpose business management demo for **B&C Software & Web**.

This repository is the reusable foundation for later industry-specific and customer-specific systems:

**B&C General Management System → Industry-Specific System → Customer-Specific System**

Live demo (GitHub Pages, `gh-pages` branch):  
https://astridbonoan.github.io/B-C_Generalized_Management.io/

## Demo sign-in

All seeded demo accounts use the password `demo123`.

| Role | Email |
| --- | --- |
| Administrator | `admin@bcsoftware.demo` |
| Manager | `manager@bcsoftware.demo` |
| Employee | `employee@bcsoftware.demo` |

The application runs in **demo mode** when Supabase environment variables are not set. Demo data is stored in the browser. Authorization is still enforced in the application data layer, not only in the UI.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase-ready authentication, schema, and Row Level Security
- GitHub Actions for lint, test, and build
- GitHub Pages from the `gh-pages` branch

## Local development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Supabase

1. Create a project in Supabase.
2. Run `supabase/migrations/0001_init.sql`.
3. Copy `.env.example` to `.env` and set:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit the service-role key. The frontend may only use the public anonymous key.

## GitHub Pages

Repository Settings → Pages → Deploy from a branch → `gh-pages` / root.

The production workflow deploys `main` to `gh-pages` after tests pass. Hash routing is used so the single-page app works under the repository path `/B-C_Generalized_Management.io/`.

## Architecture

Modules communicate through shared records rather than duplicated copies:

- Clients own client records
- Projects reference clients
- Tasks reference clients and/or projects
- Appointments reference clients and employees
- Documents reference clients and/or projects
- Activity history records actions across modules

Statuses, sources, tags, and notification types are stored as data so later industry systems can extend them without rewriting the core.

## Source control

`main` is the stable integrated branch. Features are developed on dedicated branches, tested, then merged.
