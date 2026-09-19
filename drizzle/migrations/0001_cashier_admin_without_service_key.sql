-- Managers manage cashier accounts directly under RLS (no service-role key needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cashier_accounts TO authenticated;
GRANT ALL ON public.cashier_accounts TO service_role;

DROP POLICY IF EXISTS "Managers manage cashier accounts" ON public.cashier_accounts;
CREATE POLICY "Managers manage cashier accounts"
ON public.cashier_accounts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Link a freshly self-registered cashier auth user to its account row
CREATE OR REPLACE FUNCTION public.cashier_link_user(p_code1 text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.cashier_accounts
     SET user_id = p_user_id
   WHERE upper(btrim(code1)) = upper(btrim(coalesce(p_code1, '')))
     AND (user_id IS NULL OR user_id = p_user_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'cashier')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.cashier_link_user(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cashier_link_user(text, uuid) TO anon, authenticated;