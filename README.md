# Futuwwa

A habit-tracking dashboard: GitHub-style year heatmaps grouped into three
sections — Sharpen the Mind, Harden the Body, Soften the Heart. Click a day
to cycle it white → green → dark green → white. Salah gets its own
per-prayer (Fajr, Duhr, Asr, Maghrib, Isha) row layout by default.

Sign-in is email magic-link via Supabase Auth; habits and daily entries are
stored in Postgres, scoped per-user with row-level security — no backend
code beyond the Supabase project itself.

## Local setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Run `supabase/schema.sql` once in your Supabase project's SQL Editor to
create the `habits` and `entries` tables before first use.

## Deploy

Deployed on Vercel. Pushes to `master` deploy automatically once the
project's Git integration is connected; `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` must be set as environment variables on Vercel
(Production, Preview, Development).
