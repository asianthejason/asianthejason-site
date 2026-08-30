-- Case-insensitive, race-safe display names.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  display_name_lower text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists display_name_lower text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

create or replace function public.normalize_display_name()
returns trigger language plpgsql as $$
begin
  new.display_name := btrim(new.display_name);
  new.display_name_lower := lower(new.display_name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists normalize_display_name_on_users on public.users;
create trigger normalize_display_name_on_users
before insert or update of display_name on public.users
for each row execute function public.normalize_display_name();

-- Make any legacy duplicates unique before adding the constraint.
with duplicates as (
  select id, display_name,
    row_number() over (partition by lower(btrim(display_name)) order by created_at, id) as n
  from public.users
  where nullif(btrim(display_name), '') is not null
)
update public.users u
set display_name = left(d.display_name, 43) || '-' || substr(u.id::text, 1, 6)
from duplicates d
where u.id = d.id and d.n > 1;

create unique index if not exists users_display_name_case_insensitive_unique
on public.users (lower(btrim(display_name)))
where nullif(btrim(display_name), '') is not null;

alter table public.users enable row level security;

drop policy if exists "Public profiles are readable" on public.users;
create policy "Public profiles are readable" on public.users
for select to anon, authenticated using (true);

drop policy if exists "Users update their own profile" on public.users;
create policy "Users update their own profile" on public.users
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.claim_display_name(requested_name text)
returns public.users
language plpgsql security definer set search_path = '' as $$
declare
  cleaned text := btrim(requested_name);
  result public.users;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if char_length(cleaned) < 2 or char_length(cleaned) > 50 then
    raise exception 'Display name must be between 2 and 50 characters' using errcode = '22023';
  end if;
  insert into public.users (id, email, display_name)
  values (auth.uid(), auth.jwt() ->> 'email', cleaned)
  on conflict (id) do update set display_name = excluded.display_name, email = excluded.email
  returning * into result;
  return result;
exception when unique_violation then
  raise exception 'That display name is already taken' using errcode = '23505';
end;
$$;

create or replace function public.ensure_user_profile()
returns public.users
language plpgsql security definer set search_path = '' as $$
declare
  base_name text := coalesce(nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''), nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''), split_part(auth.jwt() ->> 'email', '@', 1), 'Player');
  candidate text;
  result public.users;
  attempt integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into result from public.users where id = auth.uid();
  if found then return result; end if;
  loop
    candidate := case when attempt = 0 then left(base_name, 50) else left(base_name, 43) || '-' || substr(auth.uid()::text, 1, 6) end;
    begin
      insert into public.users (id, email, display_name) values (auth.uid(), auth.jwt() ->> 'email', candidate) returning * into result;
      return result;
    exception when unique_violation then attempt := attempt + 1;
    end;
  end loop;
end;
$$;

revoke all on function public.claim_display_name(text) from public, anon;
grant execute on function public.claim_display_name(text) to authenticated;
revoke all on function public.ensure_user_profile() from public, anon;
grant execute on function public.ensure_user_profile() to authenticated;
