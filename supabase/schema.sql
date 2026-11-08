-- ==============================================================================
-- POS System - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New query
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  "categoryId" TEXT,
  "purchasePrice" NUMERIC NOT NULL DEFAULT 0,
  "sellingPrice" NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  "minStock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products("categoryId");
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "contactPerson" TEXT,
  email TEXT,
  phone TEXT,
  address TEXT
);

-- 6. Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'CASHIER',
  active BOOLEAN NOT NULL DEFAULT true,
  "hiredAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "customerId" TEXT,
  "cashierId" TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  "paymentMethod" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders("customerId");
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders("createdAt" DESC);

-- 8. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  "supplierId" TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases("supplierId");
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases("createdAt" DESC);

-- 9. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  "productId" TEXT,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  note TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements("productId");
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements("createdAt" DESC);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development and app API access
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for products" ON products;
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for customers" ON customers;
CREATE POLICY "Allow all for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for suppliers" ON suppliers;
CREATE POLICY "Allow all for suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for employees" ON employees;
CREATE POLICY "Allow all for employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for orders" ON orders;
CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for purchases" ON purchases;
CREATE POLICY "Allow all for purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for stock_movements" ON stock_movements;
CREATE POLICY "Allow all for stock_movements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Supabase Storage Bucket for Product Images
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('pos-images', 'pos-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view pos-images" ON storage.objects;
CREATE POLICY "Public can view pos-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'pos-images');

DROP POLICY IF EXISTS "Anyone can upload pos-images" ON storage.objects;
CREATE POLICY "Anyone can upload pos-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pos-images');

DROP POLICY IF EXISTS "Anyone can update pos-images" ON storage.objects;
CREATE POLICY "Anyone can update pos-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pos-images');

DROP POLICY IF EXISTS "Anyone can delete pos-images" ON storage.objects;
CREATE POLICY "Anyone can delete pos-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'pos-images');
