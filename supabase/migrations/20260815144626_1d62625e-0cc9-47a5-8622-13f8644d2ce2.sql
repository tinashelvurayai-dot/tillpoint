-- 1. Till devices (signed-in users) can operate the shop data.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','product_variants','stock','sales','sale_items','expenses','daily_cash','suppliers','purchase_orders','restock_orders','audit_logs','app_settings','profiles'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "Till devices operate %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Till devices operate %1$s" ON public.%1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 2. Stock-in records
CREATE TABLE IF NOT EXISTS public.stock_in_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES public.stock(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_buying_price numeric NOT NULL DEFAULT 0 CHECK (unit_buying_price >= 0),
  total_cost numeric NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_in_records TO authenticated;
GRANT ALL ON public.stock_in_records TO service_role;
ALTER TABLE public.stock_in_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Till devices operate stock_in_records" ON public.stock_in_records;
CREATE POLICY "Till devices operate stock_in_records" ON public.stock_in_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS stock_in_records_received_at_idx ON public.stock_in_records (received_at DESC);

-- 3. Helpers that keep stock levels in sync
CREATE OR REPLACE FUNCTION public.record_stock_in(
  p_stock_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_unit_buying_price numeric,
  p_supplier_id uuid DEFAULT NULL,
  p_received_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
         available = true,
         updated_at = now()
   WHERE id = p_stock_id;

  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_stock_in_record(
  p_id uuid,
  p_quantity integer,
  p_unit_buying_price numeric,
  p_supplier_id uuid DEFAULT NULL,
  p_received_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rec public.stock_in_records%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  SELECT * INTO rec FROM public.stock_in_records WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock-in record not found';
  END IF;

  UPDATE public.stock
     SET quantity = GREATEST(0, quantity - rec.quantity + p_quantity),
         updated_at = now()
   WHERE id = rec.stock_id;

  UPDATE public.stock_in_records
     SET quantity = p_quantity,
         unit_buying_price = COALESCE(p_unit_buying_price, 0),
         total_cost = p_quantity * COALESCE(p_unit_buying_price, 0),
         supplier_id = p_supplier_id,
         received_at = COALESCE(p_received_at, received_at),
         notes = p_notes
   WHERE id = p_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.record_stock_in(uuid,uuid,integer,numeric,uuid,timestamptz,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_stock_in_record(uuid,integer,numeric,uuid,timestamptz,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_stock_in(uuid,uuid,integer,numeric,uuid,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stock_in_record(uuid,integer,numeric,uuid,timestamptz,text) TO authenticated;