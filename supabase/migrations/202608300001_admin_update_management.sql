-- Keep update management restricted to the existing administrator account.
drop policy if exists "Admin edits updates" on public.updates;
create policy "Admin edits updates" on public.updates
for update to authenticated
using ((select auth.jwt() ->> 'email') = 'asianthejason@gmail.com')
with check ((select auth.jwt() ->> 'email') = 'asianthejason@gmail.com');

drop policy if exists "Admin deletes updates" on public.updates;
create policy "Admin deletes updates" on public.updates
for delete to authenticated
using ((select auth.jwt() ->> 'email') = 'asianthejason@gmail.com');

grant update, delete on public.updates to authenticated;
