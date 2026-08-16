ALTER TABLE public.stock ALTER COLUMN low_stock_alert_level SET DEFAULT 10;
UPDATE public.stock SET low_stock_alert_level = 10, updated_at = now();

CREATE OR REPLACE FUNCTION public.reset_transactions(p_peak integer DEFAULT 40)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sale_items;
  DELETE FROM public.sales;
  UPDATE public.stock SET quantity = p_peak, low_stock_alert_level = 10, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_transactions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_transactions(integer) TO service_role;