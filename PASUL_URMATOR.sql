-- Executa acest script in Supabase SQL Editor inainte de testarea site-ului.
-- Expune numai datele ocupate, nu informatiile clientilor.
create or replace function public.unavailable_dates(p_start date, p_end date)
returns table(event_date date)
language sql security definer set search_path = ''
as $$
 select b.event_date from public.bookings b
 where b.status = 'confirmed' and b.event_date between p_start and p_end
   and p_start is not null and p_end is not null
   and p_end >= p_start and p_end <= p_start + 366;
$$;
revoke all on function public.unavailable_dates(date,date) from public;
grant execute on function public.unavailable_dates(date,date) to anon, authenticated;
