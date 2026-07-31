-- Futuwwa habit dashboard schema.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create extension if not exists "pgcrypto";

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'single' check (type in ('single', 'prayer')),
  category text not null default 'mind' check (category in ('mind', 'body', 'heart')),
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  entry_key text not null,
  level smallint not null check (level in (1, 2)),
  updated_at timestamptz not null default now(),
  unique (habit_id, entry_key)
);

create index if not exists entries_habit_id_idx on entries (habit_id);

alter table habits enable row level security;
alter table entries enable row level security;

create policy "Users manage their own habits"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own entries"
  on entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
