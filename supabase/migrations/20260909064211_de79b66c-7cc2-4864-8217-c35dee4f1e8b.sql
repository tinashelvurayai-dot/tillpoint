CREATE TABLE public.cashier_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  code1 text NOT NULL UNIQUE,
  code2 text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashier_accounts TO authenticated;
GRANT ALL ON public.cashier_accounts TO service_role;

ALTER TABLE public.cashier_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers manage cashier accounts"
ON public.cashier_accounts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_cashier_accounts_updated
BEFORE UPDATE ON public.cashier_accounts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();