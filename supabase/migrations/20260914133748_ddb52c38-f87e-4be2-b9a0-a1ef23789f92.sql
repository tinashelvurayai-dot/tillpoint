CREATE TABLE IF NOT EXISTS public.cashier_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  code1 text not null unique,
  code2 text not null,
  active boolean not null default true,
  sale_permission boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.cashier_accounts TO authenticated;
GRANT ALL ON public.cashier_accounts TO service_role;
ALTER TABLE public.cashier_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers manage cashier accounts" ON public.cashier_accounts;
CREATE POLICY "Managers manage cashier accounts" ON public.cashier_accounts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'manager'));