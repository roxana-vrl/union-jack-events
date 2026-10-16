-- Returneaza doar status agregat pe zi, fara date personale ale clientilor.
create or replace function public.calendar_date_statuses(p_start date, p_end date)
returns table(event_date date, has_confirmed boolean, has_pending boolean)
language sql security definer set search_path = '' stable
as $$
 select b.event_date,
        bool_or(b.status = 'confirmed') as has_confirmed,
        bool_or(b.status = 'pending') as has_pending
 from public.bookings b
 where b.event_date between p_start and p_end
   and b.status in ('confirmed','pending')
 group by b.event_date;
$$;
revoke all on function public.calendar_date_statuses(date,date) from public;
grant execute on function public.calendar_date_statuses(date,date) to anon, authenticated;
-- Verifica datele reale, inclusiv 16, 17 si 18 octombrie:
select event_date, status, count(*) as numar
from public.bookings
where event_date between '2026-10-16' and '2026-10-18'
group by event_date, status order by event_date, status;
