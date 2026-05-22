-- =================================================================================
-- DISBA POS - PREMIUM FEATURES MIGRATION
-- Jalankan file ini di SQL Editor Supabase Dashboard Anda
-- Fitur Baru: CRM Pelanggan, Modifier Menu, KDS, Retail Inventory, Stock Transfer
-- =================================================================================

-- Pastikan ekstensi UUID tersedia
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------------
-- 1. TABEL PELANGGAN (CRM)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tier TEXT DEFAULT 'BRONZE', -- Fitur Membership: BRONZE, GOLD, PLATINUM
    phone TEXT,
    email TEXT,
    points NUMERIC DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT customers_tenant_phone_unique UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant access only" ON public.customers;
CREATE POLICY "Tenant access only" ON public.customers USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------------
-- 2. TABEL GRUP MODIFIER (e.g., "Level Pedas", "Pilihan Topping")
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modifier_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    is_multiple BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_tenant ON public.modifier_groups(tenant_id);
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant access only" ON public.modifier_groups;
CREATE POLICY "Tenant access only" ON public.modifier_groups USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------------
-- 3. TABEL OPSI MODIFIER (e.g., "Pedas Sekali +0", "Extra Keju +5000")
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modifier_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON public.modifier_options(group_id);
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant access only" ON public.modifier_options;
CREATE POLICY "Tenant access only" ON public.modifier_options USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------------
-- 4. TABEL LINK: MENU <-> MODIFIER GROUPS (Many-to-Many)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_modifier_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    menu_id BIGINT NOT NULL, -- references menus.id
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    CONSTRAINT menu_modifier_unique UNIQUE (menu_id, modifier_group_id)
);
ALTER TABLE public.menu_modifier_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant access only" ON public.menu_modifier_groups;
CREATE POLICY "Tenant access only" ON public.menu_modifier_groups USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------------
-- 5. KOLOM BARU DI TABEL YANG SUDAH ADA
-- ---------------------------------------------------------------------------------

-- Tambah customer_id di orders (untuk CRM linkage)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS split_group_id UUID;

-- Tambah customer_id di transactions (untuk CRM linkage)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Tambah modifier_data di order_items (JSON snapshot modifier yang dipilih)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS modifiers JSONB DEFAULT '[]';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS price_with_modifiers NUMERIC;

-- ---------------------------------------------------------------------------------
-- 6. KOLOM FISKAL DINAMIS DI receipt_settings
-- (Menggantikan hardcoded TAX_RATE & SERVICE_RATE di frontend)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.receipt_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0.10;
ALTER TABLE public.receipt_settings ADD COLUMN IF NOT EXISTS service_charge NUMERIC DEFAULT 0.05;
ALTER TABLE public.receipt_settings ADD COLUMN IF NOT EXISTS use_tax BOOLEAN DEFAULT true;
ALTER TABLE public.receipt_settings ADD COLUMN IF NOT EXISTS use_service_charge BOOLEAN DEFAULT true;
ALTER TABLE public.receipt_settings ADD COLUMN IF NOT EXISTS loyalty_point_rate NUMERIC DEFAULT 1000;
-- Contoh: loyalty_point_rate = 1000 artinya setiap Rp1000 belanja = 1 poin

-- ---------------------------------------------------------------------------------
-- 7. KOLOM KDS (Kitchen Display System) DI order_items
-- ---------------------------------------------------------------------------------
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS kds_status TEXT DEFAULT 'pending' 
    CHECK (kds_status IN ('pending', 'preparing', 'ready', 'served'));
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS kds_updated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------------
-- 7a. FITUR RETAIL & BOTTLE STORE (Inventory Enhancement)
-- ---------------------------------------------------------------------------------
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sku_code TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS is_retail BOOLEAN DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku_code, tenant_id);

-- ---------------------------------------------------------------------------------
-- 7b. TABEL TRANSFER STOK (Multi-Outlet Support)
-- ---------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    inventory_id UUID REFERENCES public.inventory(id),
    from_outlet TEXT,
    to_outlet TEXT,
    quantity NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------------
-- 8. UPDATE FUNGSI RPC - Kurangi Stok dengan Modifier Support
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reduce_stock_by_recipe(
  p_menu_id BIGINT,
  p_qty_sold NUMERIC,
  p_tenant_id TEXT,
  p_sales_order_id TEXT
)
RETURNS VOID AS $$
DECLARE
  recipe_record RECORD;
  has_recipe BOOLEAN;
  total_usage NUMERIC;
BEGIN
  -- 1. Cek apakah menu ini punya resep
  SELECT EXISTS (SELECT 1 FROM recipes WHERE menu_id = p_menu_id AND tenant_id = p_tenant_id) INTO has_recipe;

  IF has_recipe THEN
    -- Alur Cafe: Potong berdasarkan resep (Bahan Baku)
  FOR recipe_record IN 
    SELECT inventory_id, qty_needed
    FROM recipes 
    WHERE menu_id = p_menu_id 
      AND tenant_id = p_tenant_id
  LOOP
    total_usage := p_qty_sold * recipe_record.qty_needed;
    UPDATE inventory
    SET current_stock = current_stock - total_usage
    WHERE id = recipe_record.inventory_id 
      AND tenant_id = p_tenant_id;
  END LOOP;
  ELSE
    -- Alur Bottle Store: Potong langsung dari inventory yang namanya sama dengan menu
    -- Atau idealnya tambahkan kolom inventory_link_id di tabel menus
    UPDATE inventory i
    SET current_stock = i.current_stock - p_qty_sold
    FROM menus m
    WHERE m.id = p_menu_id 
      AND UPPER(m.name) = UPPER(i.item_name) 
      AND i.tenant_id = p_tenant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- 9. FUNGSI RPC - Update Poin Pelanggan (dipanggil saat transaksi selesai)
-- ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_customer_points(
  p_customer_id UUID,
  p_tenant_id TEXT,
  p_amount_spent NUMERIC,
  p_point_rate NUMERIC DEFAULT 1000
)
RETURNS VOID AS $$
DECLARE
  points_earned NUMERIC;
BEGIN
  points_earned := FLOOR(p_amount_spent / p_point_rate);
  
  UPDATE public.customers
  SET 
    points = points + points_earned,
    total_spent = total_spent + p_amount_spent,
    visit_count = visit_count + 1,
    last_visit = now()
  WHERE id = p_customer_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------------
-- SELESAI! Refresh schema Supabase Anda setelah menjalankan ini.
-- ---------------------------------------------------------------------------------
