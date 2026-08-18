-- 1. Per-variant peak quantity + no negative stock
ALTER TABLE public.stock ADD COLUMN IF NOT EXISTS peak_quantity integer NOT NULL DEFAULT 40;
UPDATE public.stock SET peak_quantity = GREATEST(quantity, 40) WHERE peak_quantity < GREATEST(quantity, 40);
UPDATE public.stock SET quantity = 0 WHERE quantity < 0;
ALTER TABLE public.stock DROP CONSTRAINT IF EXISTS stock_quantity_non_negative;
ALTER TABLE public.stock ADD CONSTRAINT stock_quantity_non_negative CHECK (quantity >= 0);

-- keep the peak in step whenever stock is received
CREATE OR REPLACE FUNCTION public.record_stock_in(p_stock_id uuid, p_variant_id uuid, p_quantity integer, p_unit_buying_price numeric, p_supplier_id uuid DEFAULT NULL::uuid, p_received_at timestamp with time zone DEFAULT now(), p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  INSERT INTO public.stock_in_records (
    variant_id, stock_id, supplier_id, quantity, unit_buying_price, total_cost, received_at, notes, recorded_by
  ) VALUES (
    p_variant_id, p_stock_id, p_supplier_id, p_quantity, COALESCE(p_unit_buying_price, 0),
    p_quantity * COALESCE(p_unit_buying_price, 0), COALESCE(p_received_at, now()), p_notes, auth.uid()
  ) RETURNING id INTO new_id;

  UPDATE public.stock
     SET quantity = quantity + p_quantity,
         peak_quantity = GREATEST(peak_quantity, quantity + p_quantity),
         available = true,
         updated_at = now()
   WHERE id = p_stock_id;

  RETURN new_id;
END $function$;

-- reset returns each variant to its own registered peak
CREATE OR REPLACE FUNCTION public.reset_transactions(p_peak integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.refunds;
  DELETE FROM public.sale_items;
  DELETE FROM public.sales;
  UPDATE public.stock
     SET quantity = COALESCE(p_peak, peak_quantity, 40),
         low_stock_alert_level = 10,
         available = true,
         updated_at = now();
END;
$function$;

-- 2. Refunds & voids
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'refund',
  reason text,
  amount numeric NOT NULL DEFAULT 0,
  restocked boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Till devices operate refunds" ON public.refunds;
CREATE POLICY "Till devices operate refunds" ON public.refunds FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.refund_sale(p_sale_id uuid, p_kind text DEFAULT 'refund', p_reason text DEFAULT NULL, p_restock boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.sales%ROWTYPE;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  SELECT * INTO s FROM public.sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;
  IF s.status IN ('refunded', 'voided') THEN
    RAISE EXCEPTION 'This sale was already %', s.status;
  END IF;

  INSERT INTO public.refunds (sale_id, kind, reason, amount, restocked, created_by)
  VALUES (p_sale_id, COALESCE(p_kind, 'refund'), p_reason, s.total_amount, COALESCE(p_restock, true), auth.uid())
  RETURNING id INTO new_id;

  IF COALESCE(p_restock, true) THEN
    UPDATE public.stock st
       SET quantity = st.quantity + si.quantity,
           available = true,
           updated_at = now()
      FROM public.sale_items si
     WHERE si.sale_id = p_sale_id AND st.variant_id = si.variant_id;
  END IF;

  UPDATE public.sales
     SET status = CASE WHEN COALESCE(p_kind, 'refund') = 'void' THEN 'voided' ELSE 'refunded' END
   WHERE id = p_sale_id;

  RETURN new_id;
END $function$;