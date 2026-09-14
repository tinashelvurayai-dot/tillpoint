ALTER TABLE public.cashier_accounts
  ADD COLUMN IF NOT EXISTS sale_permission boolean NOT NULL DEFAULT true;