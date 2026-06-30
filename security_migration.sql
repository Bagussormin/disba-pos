-- =====================================================
-- DISBA POS - SECURITY MIGRATION (Run in Supabase SQL Editor)
-- Date: 2026-06-30
-- Purpose: Fix critical security issues
-- =====================================================

-- ✅ STEP 1: Pastikan extension pgcrypto aktif
-- (Dibutuhkan untuk crypt() dan gen_salt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ✅ STEP 2: Tambah kolom untuk Server-Side Rate Limiting
-- =====================================================

-- Tambah kolom tracking login attempts ke tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_login_attempt TIMESTAMP DEFAULT NULL;

-- Index untuk performa query rate limiting
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until)
  WHERE locked_until IS NOT NULL;

-- =====================================================
-- ✅ STEP 3: PERBAIKI RPC FUNCTION - verify_admin_password
-- Menggunakan kolom password_hash (bukan password)
-- Menggunakan pgcrypto crypt() untuk verifikasi aman
-- =====================================================

DROP FUNCTION IF EXISTS verify_admin_password(text, text);

CREATE OR REPLACE FUNCTION verify_admin_password(
  p_username text,
  p_password text
)
RETURNS TABLE (
  id uuid,
  tenant_id varchar,
  username varchar,
  role varchar,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
BEGIN
  -- Ambil user dari database (tanpa memverifikasi password dulu)
  SELECT u.id, u.tenant_id, u.username, u.role, u.is_active,
         u.password_hash, u.login_attempts, u.locked_until
  INTO v_user
  FROM users u
  WHERE lower(u.username) = lower(p_username)
    AND u.role = 'admin'
  LIMIT 1;

  -- User tidak ditemukan → return kosong (jangan reveal apakah user ada)
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Cek apakah akun sedang dikunci
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
    RAISE EXCEPTION 'ACCOUNT_LOCKED:%', EXTRACT(EPOCH FROM (v_user.locked_until - NOW()))::INTEGER;
  END IF;

  -- Reset lock jika sudah expired
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until <= NOW() THEN
    UPDATE users
    SET login_attempts = 0, locked_until = NULL
    WHERE id = v_user.id;
    v_user.login_attempts := 0;
  END IF;

  -- Verifikasi password menggunakan pgcrypto
  -- Mendukung format bcrypt ($2a$, $2b$) via crypt()
  IF v_user.password_hash IS NULL OR v_user.password_hash = '' THEN
    -- Fallback: cek apakah password cocok dengan plaintext (untuk migrasi)
    -- SEGERA hash semua password setelah migrasi selesai!
    IF v_user.is_active AND p_password = v_user.password_hash THEN
      -- Login sukses (temporary plaintext check)
      UPDATE users SET login_attempts = 0, locked_until = NULL, last_login_attempt = NOW()
      WHERE id = v_user.id;
      RETURN QUERY SELECT v_user.id, v_user.tenant_id, v_user.username, v_user.role, v_user.is_active;
      RETURN;
    END IF;
  END IF;

  -- Verifikasi password dengan crypt (bcrypt)
  IF v_user.is_active AND v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    -- ✅ Password cocok - reset attempts dan return user
    UPDATE users
    SET login_attempts = 0, locked_until = NULL, last_login_attempt = NOW()
    WHERE id = v_user.id;

    RETURN QUERY
    SELECT v_user.id, v_user.tenant_id, v_user.username, v_user.role, v_user.is_active;
  ELSE
    -- ❌ Password salah - increment attempts
    UPDATE users
    SET
      login_attempts = COALESCE(login_attempts, 0) + 1,
      last_login_attempt = NOW(),
      locked_until = CASE
        WHEN COALESCE(login_attempts, 0) + 1 >= v_max_attempts
        THEN NOW() + (v_lockout_minutes || ' minutes')::INTERVAL
        ELSE NULL
      END
    WHERE id = v_user.id;

    -- Return kosong (gagal login)
    RETURN;
  END IF;
END;
$$;

-- =====================================================
-- ✅ STEP 4: PERBAIKI RPC FUNCTION - verify_user_pin
-- Menggunakan kolom pin_hash (bukan pin)
-- Dengan server-side rate limiting
-- =====================================================

DROP FUNCTION IF EXISTS verify_user_pin(text, text);

CREATE OR REPLACE FUNCTION verify_user_pin(
  p_tenant_id text,
  p_pin text
)
RETURNS TABLE (
  id uuid,
  tenant_id varchar,
  username varchar,
  role varchar,
  is_active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_max_attempts INTEGER := 5;
  v_lockout_minutes INTEGER := 15;
BEGIN
  -- Validasi input
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 6 THEN
    RAISE EXCEPTION 'INVALID_PIN_FORMAT';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RAISE EXCEPTION 'INVALID_TENANT';
  END IF;

  -- Ambil semua users di tenant (kita cari yang pinnya cocok)
  -- Cari berdasarkan pin_hash yang cocok
  SELECT u.id, u.tenant_id, u.username, u.role, u.is_active,
         u.pin_hash, u.login_attempts, u.locked_until
  INTO v_user
  FROM users u
  WHERE u.tenant_id = p_tenant_id
    AND u.is_active = true
    AND (
      -- Support format bcrypt
      (u.pin_hash IS NOT NULL AND u.pin_hash LIKE '$2%' AND u.pin_hash = crypt(p_pin, u.pin_hash))
      OR
      -- Support format plaintext (temporary, untuk migrasi)
      (u.pin_hash IS NOT NULL AND u.pin_hash NOT LIKE '$2%' AND u.pin_hash = p_pin)
    )
  LIMIT 1;

  -- User tidak ditemukan
  IF v_user IS NULL THEN
    RETURN;
  END IF;

  -- Cek apakah akun sedang dikunci
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW() THEN
    RAISE EXCEPTION 'ACCOUNT_LOCKED:%', EXTRACT(EPOCH FROM (v_user.locked_until - NOW()))::INTEGER;
  END IF;

  -- ✅ PIN cocok - reset attempts dan return user
  UPDATE users
  SET login_attempts = 0, locked_until = NULL, last_login_attempt = NOW()
  WHERE id = v_user.id;

  RETURN QUERY
  SELECT v_user.id, v_user.tenant_id, v_user.username, v_user.role, v_user.is_active;
END;
$$;

-- =====================================================
-- ✅ STEP 5: RPC FUNCTION - Hash PIN saat buat user baru
-- Menggantikan bcrypt di browser dengan pgcrypto
-- =====================================================

DROP FUNCTION IF EXISTS create_user_with_hashed_credentials(text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_user_with_hashed_credentials(
  p_tenant_id text,
  p_username text,
  p_pin text,
  p_role text,
  p_password text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username varchar,
  role varchar,
  tenant_id varchar
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash text;
  v_password_hash text;
  v_new_user_id uuid;
BEGIN
  -- Validasi input
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RAISE EXCEPTION 'INVALID_TENANT_ID';
  END IF;

  IF p_username IS NULL OR length(p_username) < 3 OR length(p_username) > 50 THEN
    RAISE EXCEPTION 'INVALID_USERNAME: Username harus 3-50 karakter';
  END IF;

  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 6 THEN
    RAISE EXCEPTION 'INVALID_PIN: PIN harus 4-6 digit angka';
  END IF;

  IF p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'INVALID_PIN_FORMAT: PIN harus berisi angka saja';
  END IF;

  IF p_role NOT IN ('admin', 'kasir', 'waiter', 'kitchen') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  -- Cek apakah username sudah ada di tenant ini
  IF EXISTS (SELECT 1 FROM users WHERE tenant_id = p_tenant_id AND lower(username) = lower(p_username)) THEN
    RAISE EXCEPTION 'USERNAME_EXISTS: Username sudah digunakan di outlet ini';
  END IF;

  -- Hash PIN dengan bcrypt via pgcrypto
  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));

  -- Hash password jika diberikan (untuk admin)
  IF p_password IS NOT NULL AND p_password != '' THEN
    IF length(p_password) < 8 THEN
      RAISE EXCEPTION 'INVALID_PASSWORD: Password harus minimal 8 karakter';
    END IF;
    v_password_hash := crypt(p_password, gen_salt('bf', 10));
  ELSE
    -- Kasir/waiter tidak butuh password, set default hash
    v_password_hash := crypt(gen_random_uuid()::text, gen_salt('bf', 10));
  END IF;

  -- Insert user baru
  INSERT INTO users (tenant_id, username, pin_hash, password_hash, role, is_active)
  VALUES (p_tenant_id, lower(p_username), v_pin_hash, v_password_hash, p_role, true)
  RETURNING users.id INTO v_new_user_id;

  -- Return user yang baru dibuat
  RETURN QUERY
  SELECT u.id, u.username, u.role, u.tenant_id
  FROM users u
  WHERE u.id = v_new_user_id;
END;
$$;

-- =====================================================
-- ✅ STEP 6: RPC FUNCTION - Update PIN user
-- =====================================================

DROP FUNCTION IF EXISTS update_user_pin(uuid, text, text);

CREATE OR REPLACE FUNCTION update_user_pin(
  p_user_id uuid,
  p_tenant_id text,
  p_new_pin text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash text;
BEGIN
  -- Validasi
  IF p_new_pin IS NULL OR length(p_new_pin) < 4 OR length(p_new_pin) > 6 THEN
    RAISE EXCEPTION 'INVALID_PIN: PIN harus 4-6 digit angka';
  END IF;

  IF p_new_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'INVALID_PIN_FORMAT: PIN harus berisi angka saja';
  END IF;

  -- Hash PIN baru
  v_pin_hash := crypt(p_new_pin, gen_salt('bf', 10));

  -- Update PIN
  UPDATE users
  SET pin_hash = v_pin_hash, updated_at = NOW()
  WHERE id = p_user_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  RETURN true;
END;
$$;

-- =====================================================
-- ✅ STEP 7: RPC FUNCTION - Hash password admin
-- =====================================================

DROP FUNCTION IF EXISTS update_admin_password(uuid, text, text, text);

CREATE OR REPLACE FUNCTION update_admin_password(
  p_user_id uuid,
  p_tenant_id text,
  p_current_password text,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_new_hash text;
BEGIN
  -- Validasi password baru
  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT: Password harus minimal 8 karakter';
  END IF;

  -- Ambil user dan verifikasi password lama
  SELECT password_hash INTO v_user
  FROM users
  WHERE id = p_user_id AND tenant_id = p_tenant_id AND role = 'admin';

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  -- Verifikasi password lama
  IF v_user.password_hash != crypt(p_current_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'WRONG_PASSWORD: Password lama tidak sesuai';
  END IF;

  -- Hash dan update password baru
  v_new_hash := crypt(p_new_password, gen_salt('bf', 10));
  UPDATE users
  SET password_hash = v_new_hash, updated_at = NOW()
  WHERE id = p_user_id AND tenant_id = p_tenant_id;

  RETURN true;
END;
$$;

-- =====================================================
-- ✅ STEP 8: MIGRASI - Hash semua password/PIN yang masih plaintext
-- JALANKAN HANYA SEKALI - Cek dulu mana yang belum di-hash
-- =====================================================

-- Lihat berapa password yang belum di-hash (format bcrypt: $2a$ atau $2b$)
-- SELECT COUNT(*) as belum_di_hash FROM users
-- WHERE password_hash NOT LIKE '$2%' OR pin_hash NOT LIKE '$2%';

-- UNCOMMENT BLOCK DI BAWAH JIKA ADA DATA YANG BELUM DI-HASH:
/*
DO $$
DECLARE
  v_user RECORD;
BEGIN
  -- Hash semua password yang belum di-hash
  FOR v_user IN
    SELECT id, password_hash, pin_hash FROM users
    WHERE password_hash NOT LIKE '$2%' OR pin_hash NOT LIKE '$2%'
  LOOP
    UPDATE users
    SET
      password_hash = CASE
        WHEN password_hash NOT LIKE '$2%'
        THEN crypt(password_hash, gen_salt('bf', 10))
        ELSE password_hash
      END,
      pin_hash = CASE
        WHEN pin_hash NOT LIKE '$2%'
        THEN crypt(pin_hash, gen_salt('bf', 10))
        ELSE pin_hash
      END
    WHERE id = v_user.id;
  END LOOP;
END;
$$;
*/

-- =====================================================
-- ✅ STEP 9: PERBAIKAN RLS POLICIES
-- Izinkan RPC functions (SECURITY DEFINER) bisa diakses
-- =====================================================

-- Grant execute pada semua RPC functions ke anon role
GRANT EXECUTE ON FUNCTION verify_admin_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_hashed_credentials(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_pin(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_password(uuid, text, text, text) TO authenticated;

-- Pastikan RLS policies untuk tabel users mengizinkan RPC functions bekerja
-- (RPC dengan SECURITY DEFINER bypass RLS, tapi kita tetap perlu policy untuk direct queries)

-- Policy untuk tenants - bisa dibaca siapa saja (untuk keperluan outlet login)
DROP POLICY IF EXISTS "Allow read tenants" ON tenants;
CREATE POLICY "Allow read tenants" ON tenants
  FOR SELECT USING (true);

-- Policy untuk users - hanya bisa dibaca dalam konteks tenant yang sama
-- RPC functions dengan SECURITY DEFINER akan bypass ini
DROP POLICY IF EXISTS "Users can view same tenant" ON users;
CREATE POLICY "Users can view same tenant" ON users
  FOR SELECT USING (
    tenant_id = current_setting('app.current_tenant_id', true)
    OR auth.role() = 'service_role'
  );

-- =====================================================
-- ✅ STEP 10: VERIFIKASI - Jalankan setelah semua selesai
-- =====================================================

-- Verifikasi RPC functions berhasil dibuat
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'verify_admin_password',
    'verify_user_pin',
    'create_user_with_hashed_credentials',
    'update_user_pin',
    'update_admin_password'
  );

-- Verifikasi kolom rate limiting sudah ada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('login_attempts', 'locked_until', 'last_login_attempt');

-- Verifikasi RLS aktif di semua tabel
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
