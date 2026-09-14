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
GRANT SELECT ON public.cashier_permission_events TO authenticated;
GRANT ALL ON public.cashier_permission_events TO service_role;

DROP POLICY IF EXISTS "Managers read cashier permission events" ON public.cashier_permission_events;
CREATE POLICY "Managers read cashier permission events"
  ON public.cashier_permission_events FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'manager'));

CREATE OR REPLACE FUNCTION public.log_cashier_sale_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.sale_permission IS DISTINCT FROM OLD.sale_permission THEN
    INSERT INTO public.cashier_permission_events (cashier_id, changed_by, enabled)
    VALUES (NEW.id, (select auth.uid()), NEW.sale_permission);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cashier_sale_permission_audit ON public.cashier_accounts;
CREATE TRIGGER trg_cashier_sale_permission_audit
AFTER UPDATE OF sale_permission ON public.cashier_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_cashier_sale_permission_change();

CREATE INDEX IF NOT EXISTS cashier_permission_events_cashier_created_idx
  ON public.cashier_permission_events (cashier_id, created_at DESC);

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS purchase_orders_status_idx ON public.purchase_orders (status);
