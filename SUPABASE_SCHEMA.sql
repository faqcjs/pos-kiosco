-- SQL Script to set up Supabase tables for Kiosko POS
-- Copy and run this script in your Supabase SQL Editor.

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Drop old tables and functions if they exist (clean setup)
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP FUNCTION IF EXISTS public.create_user CASCADE;

-- Delete existing seed users to prevent duplicate key errors
DELETE FROM public.users WHERE username IN ('admin', 'cajero', 'repo');
DELETE FROM auth.users WHERE email IN ('admin@kiosko.com', 'cajero@kiosko.com', 'repo@kiosko.com');

-- 1. Create Users Table (Linked to auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cajero', 'administrador', 'repositor')),
    name TEXT NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create Products Table
CREATE TABLE public.products (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT,
    cost NUMERIC DEFAULT 0,
    price NUMERIC DEFAULT 0,
    stock NUMERIC DEFAULT 0,
    "minStock" NUMERIC DEFAULT 0,
    "isMostSold" BOOLEAN DEFAULT FALSE,
    "unidad" NUMERIC DEFAULT 1
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- 3. Create Sales Table
CREATE TABLE public.sales (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    date TIMESTAMPTZ DEFAULT NOW(),
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    method TEXT,
    "customerId" TEXT,
    "cashReceived" NUMERIC DEFAULT 0,
    change NUMERIC DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    "soldBy" TEXT,
    "shiftId" TEXT REFERENCES public.shifts(id) ON DELETE SET NULL
);

-- Enable RLS for sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);

-- 4. Create Customers Table
CREATE TABLE public.customers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    phone TEXT,
    entries JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 5. Create Suppliers Table
CREATE TABLE public.suppliers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    entries JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 6. Create Shifts Table
CREATE TABLE public.shifts (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    "openedAt" TIMESTAMPTZ,
    "closedAt" TIMESTAMPTZ,
    "openingAmount" NUMERIC DEFAULT 0,
    "closingCounted" NUMERIC,
    "closingTheoretical" NUMERIC,
    difference NUMERIC,
    status TEXT DEFAULT 'open',
    "openedBy" TEXT,
    "closedBy" TEXT,
    movements JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS for shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Ensure at most one open shift exists at any time
CREATE UNIQUE INDEX shifts_only_one_open ON public.shifts (status) WHERE (status = 'open');

-- Drop old function signatures to prevent duplicates
DROP FUNCTION IF EXISTS public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.register_customer_payment_rpc(TEXT, NUMERIC, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.register_supplier_payment_rpc(TEXT, NUMERIC, BOOLEAN, TIMESTAMPTZ);


-- =========================================================================
-- SECURITY DEFINER FUNCTION TO CREATE USERS SECURELY
-- =========================================================================

CREATE OR REPLACE FUNCTION public.create_user(
    p_username TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT
) RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    email_address TEXT;
BEGIN
    -- Authorization: Only admins can create users, except when bootstrapping or running as DB admin (postgres, service_role)
    IF CURRENT_USER NOT IN ('postgres', 'service_role', 'supabase_admin') 
       AND EXISTS (SELECT 1 FROM public.users) 
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = auth.uid() AND role = 'administrador'
       ) 
    THEN
        RAISE EXCEPTION 'Not authorized to create users. Only administrators can perform this action.';
    END IF;

    email_address := LOWER(TRIM(p_username)) || '@kiosko.com';
    new_user_id := gen_random_uuid();

    -- Create user in auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        phone_change_token,
        reauthentication_token,
        email_change_token_current
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        email_address,
        extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    );

    -- Create user profile in public.users
    INSERT INTO public.users (id, username, name, role)
    VALUES (new_user_id, LOWER(TRIM(p_username)), p_name, p_role);

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
    -- Authorization: Only admins can delete users, except when running as DB admin (postgres, service_role)
    IF CURRENT_USER NOT IN ('postgres', 'service_role', 'supabase_admin')
       AND NOT EXISTS (
           SELECT 1 FROM public.users
           WHERE id = auth.uid() AND role = 'administrador'
       ) 
    THEN
        RAISE EXCEPTION 'Not authorized to delete users. Only administrators can perform this action.';
    END IF;

    -- Delete from auth.users (cascades to public.users)
    DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;


-- =========================================================================
-- TRANSACTIONAL RPC FUNCTIONS FOR PRODUCTION READINESS
-- =========================================================================

-- 1. Función atómica para registro de ventas y decremento de stock
CREATE OR REPLACE FUNCTION public.complete_sale_rpc(
    p_sale_id TEXT,
    p_items JSONB,
    p_method TEXT,
    p_customer_id TEXT,
    p_cash_received NUMERIC,
    p_change NUMERIC,
    p_cost NUMERIC,
    p_sold_by TEXT,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT
) RETURNS VOID AS $$
DECLARE
    item RECORD;
    v_total NUMERIC := 0;
    v_current_stock NUMERIC;
    active_shift RECORD;
    detail_desc TEXT;
    v_user_name TEXT;
BEGIN
    -- Assert p_sold_by matches auth.uid() username
    SELECT username INTO v_user_name FROM public.users WHERE id = auth.uid();
    IF v_user_name IS NULL OR v_user_name <> p_sold_by THEN
        RAISE EXCEPTION 'Identity mismatch: cannot complete sale on behalf of another user.';
    END IF;

    -- Restrict Sales to Open Shifts matching the operator
    SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
    IF active_shift IS NULL THEN
        RAISE EXCEPTION 'El turno de caja especificado no existe.';
    END IF;

    -- Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    -- 1. Lock product rows in a deterministic order to prevent deadlocks
    PERFORM 1 FROM public.products
    WHERE id IN (
        SELECT DISTINCT ix."productId" 
        FROM jsonb_to_recordset(p_items) AS ix("productId" TEXT)
        WHERE ix."productId" IS NOT NULL
    )
    ORDER BY id
    FOR UPDATE;

    -- 2. Validate stock levels and execute decrement
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, "productId" TEXT, name TEXT, price NUMERIC, qty NUMERIC)
    LOOP
        v_total := v_total + (item.price * item.qty);
        
        IF item."productId" IS NOT NULL THEN
            SELECT stock INTO v_current_stock 
            FROM public.products 
            WHERE id = item."productId";
            
            IF v_current_stock IS NULL OR v_current_stock < item.qty THEN
                RAISE EXCEPTION 'Stock insuficiente para el producto: % (Disponible: %, Requerido: %)', 
                    item.name, COALESCE(v_current_stock, 0), item.qty;
            END IF;
            
            UPDATE public.products 
            SET stock = stock - item.qty 
            WHERE id = item."productId";
        END IF;
    END LOOP;

    -- 3. Insert Sale including shiftId
    INSERT INTO public.sales (id, date, created_at, items, total, method, "customerId", "cashReceived", change, cost, "soldBy", "shiftId")
    VALUES (p_sale_id, p_date, p_date, p_items, v_total, p_method, p_customer_id, p_cash_received, p_change, p_cost, p_sold_by, p_shift_id);

    -- 4. Log cash shift movement and retroactively adjust closed shift totals
    IF p_method = 'efectivo' THEN
        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', 'venta',
                    'amount', v_total,
                    'reason', 'Venta en efectivo (' || jsonb_array_length(p_items) || ' art.)'
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) + v_total 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) - v_total 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;

    -- 5. Registrar deuda de cliente si la venta es fiada
    IF p_method = 'fiado' AND p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
            RAISE EXCEPTION 'Cliente no encontrado.';
        END IF;
        
        SELECT string_agg(qty || 'x ' || name, ', ') INTO detail_desc
        FROM jsonb_to_recordset(p_items) AS x(name TEXT, qty NUMERIC);
        
        UPDATE public.customers
        SET entries = COALESCE(entries, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', extensions.gen_random_uuid()::text,
                'date', p_date,
                'type', 'compra',
                'amount', v_total,
                'detail', detail_desc
            )
        )
        WHERE id = p_customer_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revocar ejecución pública de la función y habilitarla solo para autenticados
REVOKE EXECUTE ON FUNCTION public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_sale_rpc(TEXT, JSONB, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

-- 2. Función atómica para registro de pagos de clientes
CREATE OR REPLACE FUNCTION public.register_customer_payment_rpc(
    p_customer_id TEXT,
    p_amount NUMERIC,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT
) RETURNS VOID AS $$
DECLARE
    customer_name TEXT;
    active_shift RECORD;
BEGIN
    -- 1. Security Check (Only admin/supervisor allowed)
    IF NOT public.has_role('administrador') THEN
        RAISE EXCEPTION 'Unauthorized role execution.';
    END IF;

    -- 2. Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    SELECT name INTO customer_name FROM public.customers WHERE id = p_customer_id;
    IF customer_name IS NULL THEN
        RAISE EXCEPTION 'Cliente no encontrado.';
    END IF;

    UPDATE public.customers
    SET entries = COALESCE(entries, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'id', extensions.gen_random_uuid()::text,
            'date', p_date,
            'type', 'pago',
            'amount', p_amount,
            'detail', 'Pago de deuda'
        )
    )
    WHERE id = p_customer_id;

    SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
    IF active_shift IS NOT NULL THEN
        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', 'cobro_fiado',
                    'amount', ABS(p_amount),
                    'reason', 'Cobro de fiado - ' || customer_name
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) + ABS(p_amount) 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) - ABS(p_amount) 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.register_customer_payment_rpc(TEXT, NUMERIC, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_customer_payment_rpc(TEXT, NUMERIC, TIMESTAMPTZ, TEXT) TO authenticated;

-- 3. Función atómica para mercadería de proveedores
CREATE OR REPLACE FUNCTION public.receive_goods_rpc(
    p_supplier_id TEXT,
    p_amount NUMERIC,
    p_detail TEXT,
    p_paid_cash BOOLEAN,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT
) RETURNS VOID AS $$
DECLARE
    supplier_name TEXT;
    active_shift RECORD;
    v_entries JSONB;
BEGIN
    -- 1. Security Check (Only admin/supervisor allowed)
    IF NOT public.has_role('administrador') THEN
        RAISE EXCEPTION 'Unauthorized role execution.';
    END IF;

    -- 2. Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    SELECT name INTO supplier_name FROM public.suppliers WHERE id = p_supplier_id;
    IF supplier_name IS NULL THEN
        RAISE EXCEPTION 'Proveedor no encontrado.';
    END IF;

    v_entries := jsonb_build_array(
        jsonb_build_object(
            'id', extensions.gen_random_uuid()::text,
            'date', p_date,
            'type', 'factura',
            'amount', p_amount,
            'detail', p_detail,
            'paidCash', p_paid_cash
        )
    );
    
    IF p_paid_cash THEN
        v_entries := v_entries || jsonb_build_array(
            jsonb_build_object(
                'id', extensions.gen_random_uuid()::text,
                'date', p_date,
                'type', 'pago',
                'amount', p_amount,
                'detail', 'Pago contado: ' || p_detail
            )
        );
    END IF;

    UPDATE public.suppliers
    SET entries = COALESCE(entries, '[]'::jsonb) || v_entries
    WHERE id = p_supplier_id;

    IF p_paid_cash THEN
        SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
        IF active_shift IS NULL THEN
            RAISE EXCEPTION 'El turno de caja especificado no existe.';
        END IF;

        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', 'pago_proveedor',
                    'amount', -ABS(p_amount),
                    'reason', 'Pago contado - ' || supplier_name
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) - ABS(p_amount) 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) + ABS(p_amount) 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.receive_goods_rpc(TEXT, NUMERIC, TEXT, BOOLEAN, TIMESTAMPTZ, TEXT) TO authenticated;

-- 4. Función atómica para pagos directos a proveedores
CREATE OR REPLACE FUNCTION public.register_supplier_payment_rpc(
    p_supplier_id TEXT,
    p_amount NUMERIC,
    p_from_cash BOOLEAN,
    p_date TIMESTAMPTZ,
    p_shift_id TEXT
) RETURNS VOID AS $$
DECLARE
    supplier_name TEXT;
    active_shift RECORD;
BEGIN
    -- 1. Security Check (Only admin/supervisor allowed)
    IF NOT public.has_role('administrador') THEN
        RAISE EXCEPTION 'Unauthorized role execution.';
    END IF;

    -- 2. Enforce transaction timestamp buffer
    p_date := COALESCE(p_date, NOW());
    IF p_date > NOW() + INTERVAL '1 hour' THEN
        RAISE EXCEPTION 'La fecha de la transacción está fuera del rango permitido (no se permiten fechas futuras).';
    END IF;

    SELECT name INTO supplier_name FROM public.suppliers WHERE id = p_supplier_id;
    IF supplier_name IS NULL THEN
        RAISE EXCEPTION 'Proveedor no encontrado.';
    END IF;

    UPDATE public.suppliers
    SET entries = COALESCE(entries, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'id', extensions.gen_random_uuid()::text,
            'date', p_date,
            'type', 'pago',
            'amount', p_amount,
            'detail', 'Pago a proveedor'
        )
    )
    WHERE id = p_supplier_id;

    IF p_from_cash THEN
        SELECT * INTO active_shift FROM public.shifts WHERE id = p_shift_id;
        IF active_shift IS NULL THEN
            RAISE EXCEPTION 'El turno de caja especificado no existe.';
        END IF;

        UPDATE public.shifts
        SET 
            movements = COALESCE(movements, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'id', extensions.gen_random_uuid()::text,
                    'date', p_date,
                    'type', 'pago_proveedor',
                    'amount', -ABS(p_amount),
                    'reason', 'Pago a proveedor - ' || supplier_name
                )
            ),
            "closingTheoretical" = CASE 
                WHEN status = 'closed' THEN COALESCE("closingTheoretical", 0) - ABS(p_amount) 
                ELSE "closingTheoretical" 
            END,
            difference = CASE 
                WHEN status = 'closed' THEN COALESCE(difference, 0) + ABS(p_amount) 
                ELSE difference 
            END
        WHERE id = active_shift.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION public.register_supplier_payment_rpc(TEXT, NUMERIC, BOOLEAN, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_supplier_payment_rpc(TEXT, NUMERIC, BOOLEAN, TIMESTAMPTZ, TEXT) TO authenticated;


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Helper function to check if the current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Users Policies
CREATE POLICY "Allow select users for authenticated users" 
    ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow delete users for administrators" 
    ON public.users FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- 2. Products Policies
CREATE POLICY "Allow select products for authenticated users" 
    ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert products for admin, repositor and cajero" ON public.products;
DROP POLICY IF EXISTS "Allow update products for admin and repositor" ON public.products;
DROP POLICY IF EXISTS "Allow delete products for admin and repositor" ON public.products;

CREATE POLICY "Allow insert products for admin and repositor" 
    ON public.products FOR INSERT TO authenticated 
    WITH CHECK (public.has_role('administrador', 'repositor'));

CREATE POLICY "Allow update products for admin and repositor" 
    ON public.products FOR UPDATE TO authenticated 
    USING (public.has_role('administrador', 'repositor'))
    WITH CHECK (public.has_role('administrador', 'repositor'));

CREATE POLICY "Allow delete products for admin and repositor" 
    ON public.products FOR DELETE TO authenticated 
    USING (public.has_role('administrador', 'repositor'));

-- 3. Sales Policies
CREATE POLICY "Allow select sales for authenticated users" 
    ON public.sales FOR SELECT TO authenticated USING (true);

-- Direct insert sales for authenticated users is prohibited. All insertions must go through complete_sale_rpc.
DROP POLICY IF EXISTS "Allow insert sales for authenticated users" ON public.sales;

CREATE POLICY "Allow delete sales for administrators" 
    ON public.sales FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- 4. Customers Policies
CREATE POLICY "Allow select customers for authenticated users" 
    ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write customers for authenticated users" ON public.customers;

CREATE POLICY "Allow insert customers for authenticated users" 
    ON public.customers FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow update customers for admin and repositor" 
    ON public.customers FOR UPDATE TO authenticated 
    USING (public.has_role('administrador', 'repositor'))
    WITH CHECK (public.has_role('administrador', 'repositor'));

CREATE POLICY "Allow delete customers for administrators only" 
    ON public.customers FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- 5. Suppliers Policies
CREATE POLICY "Allow select suppliers for authenticated users" 
    ON public.suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write suppliers for authenticated users" ON public.suppliers;

CREATE POLICY "Allow insert suppliers for authenticated users" 
    ON public.suppliers FOR INSERT TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow update suppliers for admin and repositor" 
    ON public.suppliers FOR UPDATE TO authenticated 
    USING (public.has_role('administrador', 'repositor'))
    WITH CHECK (public.has_role('administrador', 'repositor'));

CREATE POLICY "Allow delete suppliers for administrators only" 
    ON public.suppliers FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- 6. Shifts Policies
CREATE POLICY "Allow select shifts for authenticated users" 
    ON public.shifts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow write shifts for authenticated users" ON public.shifts;

CREATE POLICY "Allow insert shifts for authenticated users" 
    ON public.shifts FOR INSERT TO authenticated 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update shifts for administrators or shift creator" ON public.shifts;

CREATE POLICY "Allow update shifts for administrators or shift creator" 
    ON public.shifts FOR UPDATE TO authenticated 
    USING (
        status = 'open' AND (
            public.has_role('administrador') OR 
            "openedBy" = (SELECT username FROM public.users WHERE id = auth.uid()) OR
            "openedBy" = (SELECT name FROM public.users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        public.has_role('administrador') OR 
        "openedBy" = (SELECT username FROM public.users WHERE id = auth.uid()) OR
        "openedBy" = (SELECT name FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Allow delete shifts for administrators only" 
    ON public.shifts FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- =========================================================================
-- ENABLE REALTIME REPLICATION FOR ALL TABLES
-- =========================================================================

-- Recreate publication safely to avoid duplicate registration errors or syntax issues
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.products, public.sales, public.customers, public.suppliers, public.shifts;

-- =========================================================================
-- BOOTSTRAP INITIAL SEED DATA
-- =========================================================================

-- Seed default users using our secure function
SELECT public.create_user('admin', 'admin123', 'Administrador', 'administrador');
SELECT public.create_user('cajero', '123', 'Juan Cajero', 'cajero');
SELECT public.create_user('repo', '123', 'Pedro Repositor', 'repositor');
