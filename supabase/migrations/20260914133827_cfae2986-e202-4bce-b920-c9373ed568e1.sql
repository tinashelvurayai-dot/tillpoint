ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS auto_approve_refunds boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.refund_items (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.refunds(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete cascade,
  variant_id uuid,
  quantity integer not null check (quantity > 0),
  unit_price numeric not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.refund_items TO authenticated;
GRANT ALL ON public.refund_items TO service_role;
ALTER TABLE public.refund_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed in staff read refund items" ON public.refund_items;
CREATE POLICY "Signed in staff read refund items" ON public.refund_items
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Signed in staff add refund items" ON public.refund_items;
CREATE POLICY "Signed in staff add refund items" ON public.refund_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.refund_sale_items(
  p_sale_id uuid,
  p_kind text DEFAULT 'refund',
  p_reason text DEFAULT NULL,
  p_restock boolean DEFAULT true,
  p_items jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s public.sales%ROWTYPE;
  new_id uuid;
  v_amount numeric := 0;
  r record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT * INTO s FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF s.status IN ('refunded','voided') THEN
    RAISE EXCEPTION 'This sale was already %', s.status;
  END IF;

  IF COALESCE(p_kind,'refund') = 'void' OR p_items IS NULL THEN
    RETURN public.refund_sale(p_sale_id, COALESCE(p_kind,'refund'), p_reason, COALESCE(p_restock,true));
  END IF;

  SELECT COALESCE(SUM(si.unit_price * x.quantity), 0) INTO v_amount
    FROM jsonb_to_recordset(p_items) AS x(sale_item_id uuid, quantity integer)
    JOIN public.sale_items si ON si.id = x.sale_item_id
   WHERE si.sale_id = p_sale_id;

  INSERT INTO public.refunds (sale_id, kind, reason, amount, restocked, created_by)
  VALUES (p_sale_id, 'refund', p_reason, v_amount, COALESCE(p_restock,true), auth.uid())
  RETURNING id INTO new_id;

  FOR r IN
    SELECT si.id, si.variant_id, si.unit_price, x.quantity
      FROM jsonb_to_recordset(p_items) AS x(sale_item_id uuid, quantity integer)
      JOIN public.sale_items si ON si.id = x.sale_item_id
     WHERE si.sale_id = p_sale_id AND x.quantity > 0
  LOOP
    INSERT INTO public.refund_items (refund_id, sale_item_id, variant_id, quantity, unit_price)
    VALUES (new_id, r.id, r.variant_id, r.quantity, r.unit_price);
    IF COALESCE(p_restock,true) THEN
      UPDATE public.stock SET quantity = quantity + r.quantity, available = true, updated_at = now()
       WHERE variant_id = r.variant_id;
    END IF;
  END LOOP;

  IF v_amount >= s.total_amount THEN
    UPDATE public.sales SET status = 'refunded' WHERE id = p_sale_id;
  END IF;

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.refund_sale_items(uuid, text, text, boolean, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_sale_items(uuid, text, text, boolean, jsonb) TO authenticated;