DROP POLICY IF EXISTS "Till devices operate app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Till devices operate audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Till devices operate daily_cash" ON public.daily_cash;
DROP POLICY IF EXISTS "Till devices operate expenses" ON public.expenses;
DROP POLICY IF EXISTS "Till devices operate product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Till devices operate products" ON public.products;
DROP POLICY IF EXISTS "Till devices operate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Till devices operate purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Till devices operate refund_items" ON public.refund_items;
DROP POLICY IF EXISTS "Till devices operate refunds" ON public.refunds;
DROP POLICY IF EXISTS "Till devices operate sales" ON public.sales;
DROP POLICY IF EXISTS "Till devices operate sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Till devices operate stock" ON public.stock;
DROP POLICY IF EXISTS "Till devices operate stock_in_records" ON public.stock_in_records;
DROP POLICY IF EXISTS "Till devices operate suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Till devices operate restock_orders" ON public.restock_orders;
DROP POLICY IF EXISTS "Till devices operate user_roles" ON public.user_roles;

DROP POLICY IF EXISTS "Signed in read stock" ON public.stock;
CREATE POLICY "Signed in read stock" ON public.stock FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Cashiers create own sales" ON public.sales;
CREATE POLICY "Cashiers create own sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = cashier_id);

DROP POLICY IF EXISTS "Users read own sales" ON public.sales;
CREATE POLICY "Users read own sales" ON public.sales FOR SELECT TO authenticated USING (auth.uid() = cashier_id OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Managers manage sales" ON public.sales;
CREATE POLICY "Managers manage sales" ON public.sales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Cashiers create own sale items" ON public.sale_items;
CREATE POLICY "Cashiers create own sale items" ON public.sale_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.has_role(auth.uid(), 'manager'))));

DROP POLICY IF EXISTS "Read sale items" ON public.sale_items;
CREATE POLICY "Read sale items" ON public.sale_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (s.cashier_id = auth.uid() OR public.has_role(auth.uid(), 'manager'))));

DROP POLICY IF EXISTS "Managers manage sale items" ON public.sale_items;
CREATE POLICY "Managers manage sale items" ON public.sale_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Signed in read suppliers" ON public.suppliers;
CREATE POLICY "Signed in read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage stock" ON public.stock;
CREATE POLICY "Managers manage stock" ON public.stock FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Managers manage stock_in_records" ON public.stock_in_records;
CREATE POLICY "Managers manage stock_in_records" ON public.stock_in_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Read refunds" ON public.refunds;
CREATE POLICY "Read refunds" ON public.refunds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage refunds" ON public.refunds;
CREATE POLICY "Managers manage refunds" ON public.refunds FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));