ALTER TABLE public.cashier_accounts
  ADD COLUMN IF NOT EXISTS sale_permission boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.cashier_permission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id uuid NOT NULL REFERENCES public.cashier_accounts(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cashier_permission_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers read cashier permission events" ON public.cashier_permission_events;
CREATE POLICY "Managers read cashier permission events"
  ON public.cashier_permission_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));
GRANT SELECT ON public.cashier_permission_events TO authenticated;
GRANT ALL ON public.cashier_permission_events TO service_role;
