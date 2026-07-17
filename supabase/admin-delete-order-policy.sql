-- Optional: allow admins to delete orders via Supabase client (RLS).
-- The admin-delete-order Edge Function uses the service role and works without this.
-- Run in Supabase SQL Editor if you want direct client deletes too.

drop policy if exists "Admins can delete all orders" on public.orders;

create policy "Admins can delete all orders"
  on public.orders
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
