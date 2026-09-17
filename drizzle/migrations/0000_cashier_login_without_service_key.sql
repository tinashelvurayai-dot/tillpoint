ALTER TABLE public.cashier_accounts
  ADD COLUMN IF NOT EXISTS login_email text,
  ADD COLUMN IF NOT EXISTS login_password text;

CREATE OR REPLACE FUNCTION public.cashier_login(p_code1 text, p_code2 text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.cashier_accounts%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.cashier_accounts
   WHERE upper(btrim(code1)) = upper(btrim(coalesce(p_code1, '')))
   LIMIT 1;

  IF r.id IS NULL OR upper(btrim(coalesce(r.code2, ''))) <> upper(btrim(coalesce(p_code2, ''))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Those access codes are not recognised.');
  END IF;

  IF r.active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This cashier account has been switched off.');
  END IF;

  IF r.login_email IS NULL OR r.login_password IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This cashier account is not set up yet.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'email', r.login_email,
    'password', r.login_password,
    'name', r.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cashier_login(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.cashier_login(text, text) TO anon, authenticated;