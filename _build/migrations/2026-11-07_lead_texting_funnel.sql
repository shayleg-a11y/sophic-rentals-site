-- Sophic Rentals site v3 (2026-11-07): free step-1 leads + automatic lead texting.
-- Apply BEFORE deploying the site (step 1 no longer collects email).
-- Texts go into public.messages (status queued) and are sent by the Mac Studio ops bot (8am–9pm LA).
-- Owner gets an iMessage alert via public.owner_alerts the moment a lead lands.

alter table public.applications alter column email drop not null;
alter table public.applications add column if not exists lead_sms_count int not null default 0;
alter table public.applications add column if not exists lead_sms_last_at timestamptz;

create or replace function public.lead_resume_url(a public.applications) returns text language sql immutable as $$
  select 'https://sophicrentals.com/' || case when a.application_type = 'driver' then 'drive' else '' end || '?resume=' || a.reference_number
$$;

create or replace function public.lead_text_body(a public.applications, n int) returns text language plpgsql stable as $$
declare first text := coalesce(nullif(initcap(trim(a.first_name)),''), 'there'); link text := public.lead_resume_url(a);
begin
  if a.application_type = 'driver' then
    if n = 0 then return 'Hi ' || first || ', it''s Sophic Rentals - thanks for your interest in driving one of our Teslas. Finish your application here and we verify you in 24-48h: ' || link || ' Any questions, just reply. Reply STOP to opt out.';
    elsif n = 1 then return 'Hi ' || first || ', Sophic here. Anything I can answer about the fleet driver program? Insurance and maintenance are included. Finish here: ' || link;
    else return 'Last check-in from Sophic Rentals: still want to drive a Tesla this week? Finish in 1 minute: ' || link || ' Reply STOP to opt out.'; end if;
  end if;
  if n = 0 then return 'Hi ' || first || ', it''s Sophic Rentals - got your request for a Tesla' || coalesce(' (' || nullif(a.preferred_car,'') || ')', '') || '. We have cars near LAX, SNA and Orange. Upfront at pickup is a $500 deposit + $500 first week (Model 3). Finish verification here, $9.99 credited to week 1: ' || link || ' Questions? Just reply. Reply STOP to opt out.';
  elsif n = 1 then return 'Hi ' || first || ', Sophic here. Any questions I can answer - insurance, pickup, charging? Most drivers are verified in 24-48h. Finish here: ' || link;
  else return 'Last check-in from Sophic Rentals: still want a Tesla this week? Cars go fast. Finish in 1 minute: ' || link || ' Reply STOP to opt out.'; end if;
end $$;

create or replace function public.applications_lead_count() returns trigger language plpgsql as $$
begin
  if new.phone is not null and coalesce(new.email,'') !~* '(e2etest|\+test)' and coalesce(new.first_name,'') !~* '^test' then
    new.lead_sms_count := 1; new.lead_sms_last_at := now();
  end if;
  return new;
end $$;

create or replace function public.applications_lead_alert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone is null or coalesce(new.email,'') ~* '(e2etest|\+test)' or coalesce(new.first_name,'') ~* '^test' then return new; end if;
  if tg_op = 'INSERT' then
    insert into messages(direction, channel, body, status, authored_by, kind, to_phone, dedupe_key)
      values ('outbound','sms', public.lead_text_body(new, 0), 'queued', 'system', 'lead_welcome', new.phone, 'lead:' || new.reference_number || ':0')
      on conflict do nothing;
    insert into owner_alerts(kind, body, ref_table, ref_id)
      values ('new_lead', 'NEW LEAD (' || new.application_type || '): ' || coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'') || ' ' || new.phone || ' - ' || coalesce(new.platform,'?') || ', ' || coalesce(nullif(new.preferred_car,''),'first available') || '. Ref ' || new.reference_number || '. Auto-text queued; reply fast.', 'applications', new.id::text);
  elsif tg_op = 'UPDATE' and new.stage = 'details' and coalesce(old.stage,'') <> 'details' then
    insert into owner_alerts(kind, body, ref_table, ref_id)
      values ('lead_step2', 'Step 2 done (at checkout): ' || coalesce(new.first_name,'') || ' ' || coalesce(new.last_name,'') || ' ' || new.phone || ' - insurance: ' || coalesce(new.insurance_status,'?') || '. Ref ' || new.reference_number, 'applications', new.id::text);
  end if;
  return new;
end $$;

drop trigger if exists applications_lead_count on public.applications;
create trigger applications_lead_count before insert on public.applications for each row execute function public.applications_lead_count();
drop trigger if exists applications_lead_alert on public.applications;
create trigger applications_lead_alert after insert or update of stage on public.applications for each row execute function public.applications_lead_alert();

-- 1h and 24h nudges for anyone who hasn't paid (stops automatically once paid)
create or replace function public.lead_followups() returns int language plpgsql security definer set search_path = public as $$
declare a public.applications; n int := 0;
begin
  for a in select * from applications
    where payment_status = 'unpaid' and phone is not null and created_at > now() - interval '3 days'
      and ((lead_sms_count = 1 and created_at <= now() - interval '1 hour')
        or (lead_sms_count = 2 and created_at <= now() - interval '24 hours'))
  loop
    insert into messages(direction, channel, body, status, authored_by, kind, to_phone, dedupe_key)
      values ('outbound','sms', public.lead_text_body(a, a.lead_sms_count), 'queued', 'system', 'lead_followup', a.phone, 'lead:' || a.reference_number || ':' || a.lead_sms_count)
      on conflict do nothing;
    update applications set lead_sms_count = a.lead_sms_count + 1, lead_sms_last_at = now() where id = a.id;
    n := n + 1;
  end loop;
  return n;
end $$;

select cron.schedule('sophic-lead-followups', '*/10 * * * *', 'select public.lead_followups()');
