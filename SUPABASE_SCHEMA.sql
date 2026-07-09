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
    "minStock" NUMERIC DEFAULT 0
);

-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

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
    "soldBy" TEXT
);

-- Enable RLS for sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Allow insert products for admin, repositor and cajero" 
    ON public.products FOR INSERT TO authenticated 
    WITH CHECK (public.has_role('administrador', 'repositor', 'cajero'));

CREATE POLICY "Allow update products for admin and repositor" 
    ON public.products FOR UPDATE TO authenticated 
    USING (public.has_role('administrador', 'repositor', 'cajero'))
    WITH CHECK (public.has_role('administrador', 'repositor', 'cajero'));

CREATE POLICY "Allow delete products for admin and repositor" 
    ON public.products FOR DELETE TO authenticated 
    USING (public.has_role('administrador', 'repositor'));

-- 3. Sales Policies
CREATE POLICY "Allow select sales for authenticated users" 
    ON public.sales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert sales for authenticated users" 
    ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow delete sales for administrators" 
    ON public.sales FOR DELETE TO authenticated 
    USING (public.has_role('administrador'));

-- 4. Customers Policies
CREATE POLICY "Allow select customers for authenticated users" 
    ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write customers for authenticated users" 
    ON public.customers FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- 5. Suppliers Policies
CREATE POLICY "Allow select suppliers for authenticated users" 
    ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write suppliers for authenticated users" 
    ON public.suppliers FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);

-- 6. Shifts Policies
CREATE POLICY "Allow select shifts for authenticated users" 
    ON public.shifts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write shifts for authenticated users" 
    ON public.shifts FOR ALL TO authenticated 
    USING (true) WITH CHECK (true);


-- =========================================================================
-- BOOTSTRAP INITIAL SEED DATA
-- =========================================================================

-- Seed default users using our secure function
SELECT public.create_user('admin', 'admin123', 'Administrador', 'administrador');
SELECT public.create_user('cajero', '123', 'Juan Cajero', 'cajero');
SELECT public.create_user('repo', '123', 'Pedro Repositor', 'repositor');
