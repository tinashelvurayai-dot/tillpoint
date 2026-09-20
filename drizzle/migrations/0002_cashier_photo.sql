ALTER TABLE public.cashier_accounts ADD COLUMN IF NOT EXISTS photo_url text;

CREATE OR REPLACE FUNCTION public.my_cashier_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('name', c.name, 'photo_url', c.photo_url)
  FROM public.cashier_accounts c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_cashier_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.my_cashier_profile() TO authenticated;