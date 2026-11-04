-- =========================================================================
-- PARCHE SQL: COMBOS Y PROMOCIONES
-- Ejecutar este script en el SQL Editor de Supabase ANTES de
-- supabase_patch_ganancias_arqueo.sql
--
-- complete_sale_rpc (parche de ganancias) consulta combo_items y
-- products."isCombo" en cada venta: sin esto, todas las ventas fallan.
-- Replica la estructura que ya existe en la base de desarrollo.
-- Es idempotente: si algo ya existe, no lo toca.
-- No modifica datos existentes.
-- =========================================================================

-- 1. Products: combo flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS "isCombo" BOOLEAN DEFAULT FALSE;

-- 2. Combo components
CREATE TABLE IF NOT EXISTS public.combo_items (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    CONSTRAINT combo_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT combo_items_unique_pair UNIQUE ("comboId", "productId"),
    CONSTRAINT "combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public.products(id) ON DELETE CASCADE,
    CONSTRAINT "combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE RESTRICT
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS combo_items_select ON public.combo_items;
CREATE POLICY combo_items_select
    ON public.combo_items FOR SELECT
    USING (true);

DROP POLICY IF EXISTS combo_items_write ON public.combo_items;
CREATE POLICY combo_items_write
    ON public.combo_items FOR ALL
    USING (public.has_role('administrador', 'repositor'))
    WITH CHECK (public.has_role('administrador', 'repositor'));

-- 3. Promotions
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    "productId" TEXT,
    category TEXT,
    "buyQty" NUMERIC DEFAULT 2,
    "payQty" NUMERIC DEFAULT 1,
    "discountPercent" NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    "startDate" TIMESTAMPTZ DEFAULT NOW(),
    "endDate" TIMESTAMPTZ,
    CONSTRAINT promotions_type_check CHECK (type IN ('nxm', 'percentage_discount', 'fixed_bundle')),
    CONSTRAINT "promotions_buyQty_check" CHECK ("buyQty" > 0),
    CONSTRAINT "promotions_payQty_check" CHECK ("payQty" >= 0),
    CONSTRAINT "promotions_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.products(id) ON DELETE CASCADE
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promotions_select ON public.promotions;
CREATE POLICY promotions_select
    ON public.promotions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS promotions_write ON public.promotions;
CREATE POLICY promotions_write
    ON public.promotions FOR ALL
    USING (public.has_role('administrador', 'repositor'))
    WITH CHECK (public.has_role('administrador', 'repositor'));
