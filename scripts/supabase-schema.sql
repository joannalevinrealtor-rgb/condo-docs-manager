-- ============================================================================
-- Condo Docs Manager — Supabase database setup
-- Run this once in the Supabase SQL Editor (it is safe to re-run).
-- ============================================================================

-- 1. Properties: one row per condo transaction. The whole property record is
--    stored as JSON so the app's data shape can evolve without schema churn.
create table if not exists public.properties (
  id          text primary key,
  data        jsonb not null,
  archived    boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- 2. File metadata per property (the actual file bytes live in Storage, below).
create table if not exists public.property_files (
  property_id text primary key references public.properties(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 3. Lock the tables down with Row Level Security.
alter table public.properties     enable row level security;
alter table public.property_files enable row level security;

-- 4. Shared-team model: anyone who is logged in can read/write everything.
--    (Logged-out visitors get nothing — the login is enforced here.)
drop policy if exists "team access" on public.properties;
create policy "team access" on public.properties
  for all to authenticated using (true) with check (true);

drop policy if exists "team access" on public.property_files;
create policy "team access" on public.property_files
  for all to authenticated using (true) with check (true);

-- 5. A private Storage bucket for the uploaded document files.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 6. Storage access: logged-in team members can manage files in that bucket.
drop policy if exists "team read"   on storage.objects;
drop policy if exists "team insert" on storage.objects;
drop policy if exists "team update" on storage.objects;
drop policy if exists "team delete" on storage.objects;

create policy "team read"   on storage.objects for select to authenticated using (bucket_id = 'documents');
create policy "team insert" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
create policy "team update" on storage.objects for update to authenticated using (bucket_id = 'documents');
create policy "team delete" on storage.objects for delete to authenticated using (bucket_id = 'documents');
