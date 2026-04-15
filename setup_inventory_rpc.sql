-- =========================================================================================
-- FILE SQL INI HARUS DI-JALANKAN (RUN) DI MENU "SQL EDITOR" PADA DASHBOARD SUPABASE ANDA
-- Tujuannya adalah untuk menciptakan mesin otomatis (Stored Procedure) 
-- yang akan memotong stok bahan baku berdasar resep ketika Kasir menekan "BAYAR".
-- =========================================================================================

CREATE OR REPLACE FUNCTION reduce_stock_by_recipe(
  p_menu_id BIGINT,      -- ID menu masakan/minuman yang terjual
  p_qty_sold NUMERIC,    -- Berapa porsi/jumlah menu tersebut terjual
  p_tenant_id TEXT,      -- ID Outlet (kunci keamanan multi-cabang)
  p_sales_order_id TEXT  -- Nomor Receipt/Faktur Kasir (Jika sewaktu-waktu ingin dicatatkan ke riwayat/log)
)
RETURNS VOID AS $$
DECLARE
  recipe_record RECORD;
  total_usage NUMERIC;
BEGIN
  -- 1. Mulai looping: Cek tabel 'recipes' (Resep), temukan apa saja bahan baku pembuat menu ini
  FOR recipe_record IN 
    SELECT inventory_id, usage_quantity 
    FROM recipes 
    WHERE menu_id = p_menu_id 
      AND tenant_id = p_tenant_id
  LOOP
    -- 2. Kalkulasi jumlah bahan yang terpakai = (jumlah porsi masakan) dikali (takaran resep)
    total_usage := p_qty_sold * recipe_record.usage_quantity;

    -- 3. Eksekusi pengotongan: Kurangi current_stock yang ada di tabel 'inventory'
    UPDATE inventory
    SET current_stock = current_stock - total_usage
    WHERE id = recipe_record.inventory_id 
      AND tenant_id = p_tenant_id;
      
    -- *Catatan: Jika kedepannya Anda mempunyai tabel 'inventory_history' (Riwayat Stok Masuk/Keluar), 
    -- Anda bisa menambahkan kueri INSERT otomatis di baris ini untuk mencatat log pengeluarannya.

  END LOOP;
END;
$$ LANGUAGE plpgsql;
