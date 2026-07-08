-- SQL Script to set up Supabase tables for Kiosko POS
-- Copy and run this script in your Supabase SQL Editor.

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies (adjust as needed for production)
CREATE POLICY "Allow public read access" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.products FOR DELETE USING (true);


-- 2. Create Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
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

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.sales FOR DELETE USING (true);


-- 3. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    phone TEXT,
    entries JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.customers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.customers FOR DELETE USING (true);


-- 4. Create Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    entries JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.suppliers FOR DELETE USING (true);


-- 5. Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
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

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.shifts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.shifts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.shifts FOR DELETE USING (true);


-- 6. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cajero', 'administrador', 'repositor')),
    name TEXT NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.users FOR DELETE USING (true);

-- Insert default seed users
INSERT INTO public.users (id, username, password, role, name)
VALUES 
  ('u-admin', 'admin', 'admin123', 'administrador', 'Administrador'),
  ('u-cajero', 'cajero', '123', 'cajero', 'Juan Cajero'),
  ('u-repositor', 'repo', '123', 'repositor', 'Pedro Repositor')
ON CONFLICT (username) DO NOTHING;

