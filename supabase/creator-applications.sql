-- Run in Supabase SQL Editor to enable creator program registrations.

create type public.creator_tier as enum ('nano', 'micro', 'mid', 'macro', 'mega');

create table if not exists public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  platform text not null,
  handle text not null,
  follower_count integer not null check (follower_count >= 1000),
  tier public.creator_tier,
  niche text not null,
  portfolio_url text,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists creator_applications_status_idx on public.creator_applications (status);
create index if not exists creator_applications_created_at_idx on public.creator_applications (created_at desc);

alter table public.creator_applications enable row level security;

create policy "Anyone can submit creator applications"
  on public.creator_applications
  for insert
  to anon, authenticated
  with check (true);

create policy "Applicants can read own applications"
  on public.creator_applications
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read all creator applications"
  on public.creator_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "Admins can update creator applications"
  on public.creator_applications
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
