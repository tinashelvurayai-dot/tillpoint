ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sell_mode text NOT NULL DEFAULT 'unit',
  ADD COLUMN IF NOT EXISTS pack_size integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS pack_price numeric;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_sell_mode_check CHECK (sell_mode IN ('unit', 'pack', 'both'));

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_pack_size_check CHECK (pack_size > 0);

COMMENT ON COLUMN public.product_variants.sell_mode IS 'How this variant may be sold: unit, pack, or both';
COMMENT ON COLUMN public.product_variants.pack_size IS 'Number of individual units contained in one pack';
COMMENT ON COLUMN public.product_variants.pack_price IS 'Price of one full pack';