-- Run in Supabase SQL Editor. Add admin users via Authentication dashboard.
create extension if not exists pgcrypto;
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 event_date date not null,
 event_type text not null,
 package_name text not null,
 guests integer not null check (guests between 1 and 2000),
 customer_name text not null,
 customer_phone text not null,
 notes text not null default '',
 services text[] not null default '{}',
 status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
 created_at timestamptz not null default now(),
 constraint booking_future_date check (event_date >= date '2026-01-01')
);
create unique index if not exists one_confirmed_booking_per_day on public.bookings(event_date) where status='confirmed';
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.bookings enable row level security;
alter table public.admins enable row level security;
create policy "Admins read own membership" on public.admins for select to authenticated using (user_id=auth.uid());
create policy "Public may submit requests" on public.bookings for insert to anon, authenticated with check (status='pending');
create policy "Admins read bookings" on public.bookings for select to authenticated using (exists(select 1 from public.admins where user_id=auth.uid()));
create policy "Admins update bookings" on public.bookings for update to authenticated using (exists(select 1 from public.admins where user_id=auth.uid())) with check (exists(select 1 from public.admins where user_id=auth.uid()));
-- Public availability: expose dates only, never customer personal information.
create or replace function public.unavailable_dates(p_start date,p_end date)
returns table(event_date date) language sql security definer set search_path = '' as $$
 select distinct b.event_date from public.bookings b where b.status='confirmed' and b.event_date between p_start and p_end
$$;
grant execute on function public.unavailable_dates(date,date) to anon, authenticated;
-- Protect approval against races using partial unique index; return useful error to admin.
-- After creating the admin user in Authentication, run:
-- insert into public.admins(user_id) values ('YOUR_AUTH_USER_UUID');
