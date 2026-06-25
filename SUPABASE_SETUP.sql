-- ====================================================
-- DISBA POS - SUPABASE PRODUCTION SETUP SCRIPTS
-- ====================================================
-- Run these in Supabase SQL Editor in correct order
-- ====================================================

-- ✅ STEP 1: CREATE EXTENSIONS
-- ====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ✅ STEP 2: CREATE TABLES WITH SECURITY
-- ====================================================

-- 2.1 TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id VARCHAR(50) PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(50),
  owner_email VARCHAR(255),
  owner_phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  license_key VARCHAR(255),
  license_valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 USERS TABLE (HASHED PASSWORDS)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- ⚠️ ALWAYS HASHED with bcrypt
  pin_hash VARCHAR(255) NOT NULL,      -- ⚠️ ALWAYS HASHED with bcrypt
  role VARCHAR(50) NOT NULL,           -- admin, kasir, waiter, kitchen
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, username),
  UNIQUE(tenant_id, email)
);

-- 2.3 MENUS TABLE
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(15, 2) NOT NULL,
  cost_price DECIMAL(15, 2),
  description TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  receipt_no VARCHAR(100) NOT NULL,
  cashier_name VARCHAR(255),
  table_name VARCHAR(100),
  items JSONB NOT NULL,
  subtotal DECIMAL(15, 2),
  tax DECIMAL(15, 2) DEFAULT 0,
  service_charge DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  paid DECIMAL(15, 2) NOT NULL,
  change DECIMAL(15, 2) DEFAULT 0,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, receipt_no)
);

-- 2.5 INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  unit VARCHAR(50),
  current_stock DECIMAL(15, 3),
  min_stock DECIMAL(15, 3),
  cost_price DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.6 SHIFTS TABLE
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  cashier_name VARCHAR(255),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  start_cash DECIMAL(15, 2),
  end_cash DECIMAL(15, 2),
  expected_cash DECIMAL(15, 2),
  actual_cash DECIMAL(15, 2),
  total_sales DECIMAL(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open', -- open, closed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  table_id VARCHAR(100),
  table_name VARCHAR(100),
  items JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, preparing, ready, served, cancelled
  special_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 RECEIPT SETTINGS TABLE
CREATE TABLE IF NOT EXISTS receipt_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL UNIQUE REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  store_name VARCHAR(255),
  address TEXT,
  contact VARCHAR(50),
  footer_text TEXT,
  bridge_ip VARCHAR(50),
  cashier_printer_ip VARCHAR(50),
  office_printer_ip VARCHAR(50),
  kitchen_printer_ip VARCHAR(50),
  bar_printer_ip VARCHAR(50),
  runner_printer_ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ====================================================
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX idx_menus_category ON menus(category);
CREATE INDEX idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_inventory_tenant_id ON inventory(tenant_id);
CREATE INDEX idx_shifts_tenant_id ON shifts(tenant_id);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_table_name ON orders(table_name);

-- ✅ STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ====================================================

-- 4.1 Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

-- 4.2 Create RLS Policies for TENANTS
CREATE POLICY "Tenants are viewable by authenticated users" 
ON tenants FOR SELECT 
USING (true);

-- 4.3 Create RLS Policies for USERS (Tenant Isolation)
CREATE POLICY "Users can view users in their tenant"
ON users FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Users can update their own record"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4.4 Create RLS Policies for MENUS (Tenant Isolation)
CREATE POLICY "Users can view menus in their tenant"
ON menus FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Admins can manage menus in their tenant"
ON menus FOR ALL
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users 
    WHERE id = auth.uid() AND role = 'admin' LIMIT 1
  )
);

-- 4.5 Create RLS Policies for TRANSACTIONS
CREATE POLICY "Users can view transactions in their tenant"
ON transactions FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Users can insert transactions for their tenant"
ON transactions FOR INSERT
WITH CHECK (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

-- 4.6 Create RLS Policies for INVENTORY
CREATE POLICY "Users can view inventory in their tenant"
ON inventory FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Admins can manage inventory in their tenant"
ON inventory FOR ALL
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users 
    WHERE id = auth.uid() AND role = 'admin' LIMIT 1
  )
);

-- 4.7 Create RLS Policies for SHIFTS
CREATE POLICY "Users can view shifts in their tenant"
ON shifts FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

-- 4.8 Create RLS Policies for ORDERS
CREATE POLICY "Users can view orders in their tenant"
ON orders FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Users can create orders in their tenant"
ON orders FOR INSERT
WITH CHECK (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

-- 4.9 Create RLS Policies for RECEIPT_SETTINGS
CREATE POLICY "Users can view receipt settings in their tenant"
ON receipt_settings FOR SELECT
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1
  )
);

CREATE POLICY "Admins can manage receipt settings in their tenant"
ON receipt_settings FOR ALL
USING (
  auth.uid()::text IS NOT NULL
  AND tenant_id = (
    SELECT tenant_id FROM users 
    WHERE id = auth.uid() AND role = 'admin' LIMIT 1
  )
);

-- ✅ STEP 5: CREATE AUDIT LOGS TABLE
-- ====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(tenant_id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource VARCHAR(100),
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ✅ STEP 6: PRODUCTION DATA VALIDATION
-- ====================================================

-- 6.1 Check no plaintext passwords exist
SELECT COUNT(*) as plaintext_password_count 
FROM users 
WHERE password_hash NOT LIKE '$2a$%' AND password_hash NOT LIKE '$2b$%';
-- Result should be: 0

-- 6.2 Check RLS enabled on all tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;
-- Result should be: EMPTY (all tables have RLS)

-- 6.3 Check all critical indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ✅ STEP 7: TEST RLS POLICIES
-- ====================================================

-- 7.1 Test: User A cannot see User B's tenant data
-- (Run as different authenticated users)

-- 7.2 Test: Non-admin cannot modify menus
-- Expected: Should fail with policy violation

-- 7.3 Test: Cross-tenant query attempt blocked
-- Expected: Should return empty result

-- ✅ FINAL VERIFICATION CHECKLIST
-- ====================================================

/*
BEFORE GO-LIVE, VERIFY:

☐ All tables created successfully
☐ All indexes created
☐ RLS enabled on all tables
☐ All RLS policies created
☐ Test queries return correct tenant-filtered data
☐ Test that unauthorized access is blocked
☐ Test that cross-tenant data access returns nothing
☐ Backup database before first use
☐ Monitor performance (all queries should be fast)
☐ Set up monitoring/alerting for suspicious activity

SECURITY CHECKLIST:

☐ No plaintext passwords (all should be hashed)
☐ No plaintext PINs (all should be hashed)
☐ RLS policies blocking all cross-tenant access
☐ Audit logs recording all sensitive operations
☐ Rate limiting configured (see backend config)
☐ Input validation configured (see frontend config)
☐ API key not exposed (see vite.config.ts)
☐ Environment variables properly set
☐ Backups automated
☐ Disaster recovery plan documented

GO/NO-GO CRITERIA:

✅ = All items checked
❌ = Do NOT launch until fixed
*/

-- ====================================================
-- END OF SUPABASE SETUP SCRIPTS
-- ====================================================

-- ✅ STEP 8: AUTHENTICATION RPC FUNCTIONS
-- ====================================================

CREATE OR REPLACE FUNCTION verify_admin_password(p_username text, p_password text)
RETURNS TABLE (
    id uuid,
    tenant_id varchar,
    username varchar,
    role varchar,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.tenant_id, u.username, u.role, u.is_active
    FROM users u
    WHERE lower(u.username) = lower(p_username)
      AND u.role = 'admin'
      -- Note: If your column is named password_hash, change u.password to u.password_hash below
      AND u.password = crypt(p_password, u.password)
      AND u.is_active = true
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION verify_user_pin(p_tenant_id text, p_pin text)
RETURNS TABLE (
    id uuid,
    tenant_id varchar,
    username varchar,
    role varchar,
    is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.tenant_id, u.username, u.role, u.is_active
    FROM users u
    WHERE u.tenant_id = p_tenant_id
      -- Note: If your column is named pin_hash, change u.pin to u.pin_hash below
      AND u.pin = crypt(p_pin, u.pin)
      AND u.is_active = true
    LIMIT 1;
END;
$$;
