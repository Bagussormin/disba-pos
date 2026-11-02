-- DISBA POS product import for tenant BINSARMA_WINE.
-- Source: STOK-DAN-MENU-BINSARMA_WINE.sql (187 product rows).
-- Review before execution. This script does not change schema, RLS, or policies.
-- Existing duplicate/ambiguous names or incompatible schema abort the transaction.

BEGIN;

LOCK TABLE public.inventory, public.menus IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE binsarma_product_import (
  csv_row integer PRIMARY KEY,
  category text NOT NULL,
  item_name text NOT NULL,
  unit text NOT NULL,
  sale_price numeric(15, 2) NOT NULL,
  opening_stock numeric(15, 3) NOT NULL
) ON COMMIT DROP;

INSERT INTO binsarma_product_import
  (csv_row, category, item_name, unit, sale_price, opening_stock)
VALUES
  (1, 'SOJU', 'SEVEN DAYS STRAWBERRY', 'BOTOL', 80000, 20),
  (2, 'SOJU', 'SEVEN DAYS APPLE', 'BOTOL', 80000, 20),
  (3, 'SOJU', 'SEVEN DAYS MANGGA', 'BOTOL', 80000, 20),
  (4, 'SOJU', 'SEVEN DAYS BLACKCURRANT', 'BOTOL', 80000, 20),
  (5, 'SOJU', 'SEVEN DAYS LECY', 'BOTOL', 80000, 20),
  (6, 'SOJU', 'SEVEN DAYS ANGGUR', 'BOTOL', 80000, 20),
  (7, 'SOJU', 'SEVEN DAYS LEMON', 'BOTOL', 80000, 20),
  (8, 'SOJU', 'SEVEN DAYS ORIGINAL', 'BOTOL', 80000, 20),
  (9, 'WINE', 'ATLAS STRAWBERRY', 'BOTOL', 80000, 24),
  (10, 'WINE', 'ATLAS RAMBUTAN', 'BOTOL', 90000, 24),
  (11, 'WINE', 'ATLAS ANGGUR LECY', 'BOTOL', 90000, 24),
  (12, 'WINE', 'ATLAS ANGGUR ROSE PINK', 'BOTOL', 90000, 24),
  (13, 'WINE', 'ATLAS ANGGUR PEACH', 'BOTOL', 90000, 24),
  (14, 'WINE', 'KAWA KAWA BLACK CURRANT', 'BOTOL', 90000, 12),
  (15, 'WINE', 'KAWA KAWA ANGGUR HIJAU', 'BOTOL', 85000, 24),
  (16, 'WINE', 'KAWA KAWA ANGGUR MERAH', 'BOTOL', 90000, 36),
  (17, 'WINE', 'KUDA MAS ANGGUR HIJAU', 'BOTOL', 85000, 24),
  (18, 'WINE', 'KUDA MAS BLACK CURRANT', 'BOTOL', 85000, 24),
  (19, 'WINE', 'KUDA MAS GINSENG 620 ML', 'BOTOL', 75000, 24),
  (20, 'WINE', 'KUDA MAS GINSENG 275 ML', 'BOTOL', 40000, 24),
  (21, 'WINE', 'BIMA KENCANA GINSENG', 'BOTOL', 75000, 12),
  (22, 'WINE', 'ARJUNA KENCANA BLACKCURRANT', 'BOTOL', 75000, 12),
  (23, 'WINE', 'AK ANGGUR MERAH 650 ML', 'BOTOL', 75000, 24),
  (24, 'WINE', 'ORANG TUA ANGGUR PUTIH', 'BOTOL', 75000, 24),
  (25, 'WINE', 'ORANG TUA ANGGUR MERAH 620 ML', 'BOTOL', 75000, 36),
  (26, 'WINE', 'ORANG TUA ANGGUR MERAH 275 ML', 'BOTOL', 40000, 24),
  (27, 'WINE', 'API BLACKCURRANT', 'BOTOL', 90000, 24),
  (28, 'WINE', 'API ANGGUR HIJAU BLANC', 'BOTOL', 90000, 24),
  (29, 'WINE', 'API ANGGUR HIJAU KEDIRI', 'BOTOL', 75000, 24),
  (30, 'WINE', 'ANGGUR VIGOUR 600 ML', 'BOTOL', 65000, 12),
  (31, 'WINE', 'ANGGUR VIGOUR 275 ML', 'BOTOL', 35000, 24),
  (32, 'WINE', 'FRONTERA SWEET RED WINE 750 ML', 'BOTOL', 335000, 3),
  (33, 'WINE', 'SABABAY MOSCATO DE BALI 750 ML', 'BOTOL', 365000, 3),
  (34, 'WINE', 'LOUIS FELIPE EDWORSE MERLOT 750 ML', 'BOTOL', 330000, 3),
  (35, 'WINE', 'LOUIS FELIPE EDWORSE SAUVIGNE BLACK 750 ML', 'BOTOL', 330000, 3),
  (36, 'WINE', 'LOUIS FELIPE CABERNET 750 ML', 'BOTOL', 330000, 3),
  (37, 'WINE', 'JACOB CREEK CLASSIC MERLOT 750 ML', 'BOTOL', 415000, 3),
  (38, 'WINE', 'SANTA HELENA GRANDFINO TINTO RED WINE 750 ML', 'BOTOL', 310000, 3),
  (39, 'WINE', 'COCKBURN 750 ML', 'BOTOL', 680000, 3),
  (40, 'WINE', 'JACOB CREEK CABERNET SAUVIGNON 750 ML', 'BOTOL', 415000, 3),
  (41, 'WINE', 'JACOB CREEK CLASSIC CARDONAY 750 ML', 'BOTOL', 415000, 3),
  (42, 'WINE', 'JACOB CREEK CHERRY RED ', 'BOTOL', 470000, 3),
  (43, 'WINE', 'JACOB CREEK MOSCATO', 'BOTOL', 470000, 3),
  (44, 'WINE', 'SWEET LAB MOSCATO 750 ML', 'BOTOL', 425000, 3),
  (45, 'WINE', 'VINA ROYAL SYRAH 750 ML', 'BOTOL', 550000, 3),
  (46, 'WINE', 'AO MILD ORANG TUA 620 ML', 'BOTOL', 75000, 7),
  (47, 'WINE', 'COLOMBUS ANGGUR MERAH 250 ML', 'BOTOL', 45000, 24),
  (48, 'WINE', 'KAMPUT 620 ML', 'BOTOL', 75000, 24),
  (49, 'WINE', 'KAMPUT 275 ML', 'BOTOL', 40000, 24),
  (50, 'WINE', 'ORANG TUA GOLD 620 ML', 'BOTOL', 90000, 12),
  (51, 'WINE', 'CARLF JOSEF 750 ML', 'BOTOL', 385000, 3),
  (52, 'BEER', 'GUINNESS STOUT 620 ML', 'BOTOL', 53000, 24),
  (53, 'BEER', 'GUINNESS STOUT 500 ML', 'KALENG', 43000, 24),
  (54, 'BEER', 'GUINNESS STOUT 325 ML', 'KALENG', 32000, 24),
  (55, 'BEER', 'PROST CLASSIC 620 ML', 'BOTOL', 40000, 24),
  (56, 'BEER', 'SINGARAJA 620 ML', 'BOTOL', 35000, 24),
  (57, 'BEER', 'ANKER 620 ML', 'BOTOL', 40000, 24),
  (58, 'BEER', 'BINTANG PILSENER 620 ML', 'BOTOL', 40000, 36),
  (59, 'BEER', 'CARLSBERG 640 ML', 'BOTOL', 53000, 24),
  (60, 'BEER', 'HEINEKKEN 640 ML', 'BOTOL', 53000, 24),
  (61, 'BEER', 'BINTANG ANGGUR MERAH 620 ML', 'BOTOL', 45000, 24),
  (62, 'BEER', 'CARLSBERG 500 ML', 'KALENG', 42000, 24),
  (63, 'BEER', 'ANKER 500 ML', 'KALENG', 35000, 24),
  (64, 'BEER', 'BINTANG PILSENER 320 ML', 'KALENG', 25000, 24),
  (65, 'BEER', 'BINTANG PILSENER 250 ML', 'KALENG', 20000, 24),
  (66, 'BEER', 'HEINEKKEN 320 ML', 'KALENG', 32000, 24),
  (67, 'BEER', 'CARLSBERG 320 ML', 'KALENG', 32000, 24),
  (68, 'BEER', 'SINGARAJA APIDIN 320 ML', 'KALENG', 22000, 8),
  (69, 'BEER', 'SINGARAJA APIDIN 330 ML', 'BOTOL', 26000, 24),
  (70, 'BEER', 'RAJAWALI PROST 320 ML', 'KALENG', 23000, 22),
  (71, 'BEER', 'AMERAJA 320 ML', 'KALENG', 22000, 24),
  (72, 'BEER', 'SINGARAJA 330 ML', 'BOTOL', 25000, 24),
  (73, 'BEER', 'PROST PILSENER 300 ML', 'BOTOL', 26000, 24),
  (74, 'BEER', 'BINTANG CRYSTAL 330 ML', 'BOTOL', 26000, 24),
  (75, 'BEER', 'CLOUD SEVEN MOJITO', 'KALENG', 28000, 12),
  (76, 'BEER', 'CLOUD SEVEN SMASHING GRAPE', 'KALENG', 28000, 12),
  (77, 'BEER', 'CLOUD SEVEN PEACH DELIGHT', 'KALENG', 28000, 12),
  (78, 'BEER', 'CLOUD SEVEN BALI POMELO', 'KALENG', 28000, 12),
  (79, 'BEER', 'HEINEKKEN 500 ML', 'KALENG', 43000, 24),
  (80, 'BEER', 'HEINEKKEN 330 ML', 'BOTOL', 33000, 24),
  (81, 'BEER', 'BINTANG REDLER 330 ML', 'BOTOL', 26000, 24),
  (82, 'BEER', 'BINTANG PILSENER 330 ML', 'BOTOL', 26000, 24),
  (83, 'BEER', 'GUINNESS 320 ML', 'KALENG', 32000, 24),
  (84, 'VODKA', 'NEWPORT PASSION BLUE', 'BOTOL', 90000, 24),
  (85, 'VODKA', 'NEWPORT VODKAMIX', 'BOTOL', 85000, 24),
  (86, 'VODKA', 'NEWPORT VODKA MIX RED', 'BOTOL', 85000, 24),
  (87, 'VODKA', 'STANLEY ADAMS', 'BOTOL', 85000, 12),
  (88, 'VODKA', 'TOPI MIRING 250 ML', 'BOTOL', 45000, 24),
  (89, 'VODKA', 'TOPI MIRING 1000ML', 'BOTOL', 110000, 12),
  (90, 'VODKA', 'ICE LAND BLUE LAGOON BOTOL', 'BOTOL', 26000, 12),
  (91, 'VODKA', 'ICE LAND KAMIKAZE BOTOL', 'BOTOL', 26000, 12),
  (92, 'VODKA', 'ICE LAND ESPRESSO MARTINI BOTOL', 'BOTOL', 26000, 12),
  (93, 'VODKA', 'ICE LAND LONG ISLAND BOTOL', 'BOTOL', 26000, 12),
  (94, 'VODKA', 'MIX MAX EXOTIC BLUE', 'BOTOL', 26000, 12),
  (95, 'VODKA', 'MIX MAX ANGGUR MERAH', 'BOTOL', 26000, 9),
  (96, 'VODKA', 'SMIRNOFF ICE PINK LEMON', 'BOTOL', 26000, 14),
  (97, 'VODKA', 'SMIRNNOFF ICE SPARKLING TEA', 'BOTOL', 26000, 12),
  (98, 'VODKA', 'SMIRNOFF ICE VODKA MIXED', 'BOTOL', 26000, 18),
  (99, 'VODKA', 'SMIRNOFF ICE GREEN APPLE', 'BOTOL', 26000, 6),
  (100, 'VODKA', 'SMIRNOFF ICE RASPBERRY', 'BOTOL', 26000, 6),
  (101, 'VODKA', 'TOPI KOBOY VODKA', 'BOTOL', 120000, 11),
  (102, 'VODKA', 'FRIENDSHIP VODKA COFFEE', 'BOTOL', 85000, 12),
  (103, 'VODKA', 'FRIENDSHIP VODKA BLACKTEA', 'BOTOL', 90000, 12),
  (104, 'VODKA', 'ICE LAND LYCHEE MARTINI KALENG', 'KALENG', 28000, 12),
  (105, 'VODKA', 'ICE LAND LONG ISLAND KALENG', 'KALENG', 28000, 12),
  (106, 'VODKA', 'ICE LAND VODKA ORIGINAL 700 ML', 'BOTOL', 230000, 3),
  (107, 'VODKA', 'ICE LAND VODKA ORANGE 700 ML ', 'BOTOL', 230000, 3),
  (108, 'VODKA', 'ICE LAND VODKA CITRUS 700 ML', 'BOTOL', 230000, 3),
  (109, 'VODKA', 'ICE LAND VODKA BLACK TEA 700 ML', 'BOTOL', 230000, 3),
  (110, 'VODKA', 'SMIRNOFF RED VODKA 700 ML', 'BOTOL', 330000, 6),
  (111, 'VODKA', 'SMIRNOFF RED VODKA 200 ML', 'BOTOL', 110000, 6),
  (112, 'VODKA', 'SKY VODKA 750 ML', 'BOTOL', 400000, 3),
  (113, 'VODKA', 'ICE LAND LYCHEE 350 ML', 'BOTOL', 125000, 3),
  (114, 'VODKA', 'ICE LAND ORIGINAL 350 ML', 'BOTOL', 125000, 3),
  (115, 'VODKA', 'ICE LAND ORANGE 350 ML', 'BOTOL', 125000, 3),
  (116, 'VODKA', 'ICE LAND BLACK TEA 350 ML', 'BOTOL', 125000, 3),
  (117, 'VODKA', 'ICE LAND CITRUS 350 ML', 'BOTOL', 125000, 3),
  (118, 'VODKA', 'ICE LAND ORIGINAL 250 ML', 'BOTOL', 105000, 3),
  (119, 'VODKA', 'ICE LAND ORANGE 250 ML', 'BOTOL', 105000, 3),
  (120, 'VODKA', 'ICE LAND CITRUS 250 ML', 'BOTOL', 105000, 3),
  (121, 'VODKA', 'ICE LAND LYCHEE 250 ML', 'BOTOL', 105000, 3),
  (122, 'VODKA', 'ICE LAND BLACK TEA 250 ML', 'BOTOL', 105000, 3),
  (123, 'VODKA', 'GILBEYS VODKA 350 ML', 'BOTOL', 170000, 3),
  (124, 'VODKA', 'GILBEYS VODKA 700 ML', 'BOTOL', 315000, 3),
  (125, 'VODKA', 'VIBE VODKA PREMIUM 700 ML', 'BOTOL', 390000, 3),
  (126, 'WHISKEY', 'SEA HORSE 250 ML', 'BOTOL', 90000, 24),
  (127, 'WHISKEY', 'SEA HORSE 600 ML', 'BOTOL', 45000, 24),
  (128, 'WHISKEY', 'ASOKA WHISKEY 250ML', 'BOTOL', 45000, 24),
  (129, 'WHISKEY', 'BELLS WHISKEY 700 ML', 'BOTOL', 400000, 3),
  (130, 'WHISKEY', 'GREEN ROYAL WHISKEY 350 ML', 'BOTOL', 200000, 3),
  (131, 'WHISKEY', 'WHISKEY DRUM BLACK 700 ML', 'BOTOL', 215000, 6),
  (132, 'WHISKEY', 'WHISKEY DRUM BLACK 350 ML', 'BOTOL', 115000, 12),
  (133, 'WHISKEY', 'MONKEYS HOLDER WHISKEY 700 ML', 'BOTOL', 785000, 3),
  (134, 'WHISKEY', 'SINGLETON 12 NEXTAR 700 ML', 'BOTOL', 840000, 3),
  (135, 'WHISKEY', 'BATAVIA WHISKEY 700 ML', 'BOTOL', 410000, 3),
  (136, 'WHISKEY', 'BATAVIA WHISKEY 350 ML', 'BOTOL', 230000, 3),
  (137, 'WHISKEY', 'JHONY WALKER DOUBLE BLACK 1000 ML', 'BOTOL', 1050000, 3),
  (138, 'WHISKEY', 'JHONY WALKER BLACK LABEL 1000 ML', 'BOTOL', 860000, 3),
  (139, 'WHISKEY', 'JHONY WALKER BLACK LABEL 750 ML', 'BOTOL', 720000, 3),
  (140, 'WHISKEY', 'JHONY WALKER RED LABEL 1000 ML', 'BOTOL', 610000, 3),
  (141, 'WHISKEY', 'JHONY WALKER RED LABEL 750 ML', 'BOTOL', 485000, 3),
  (142, 'WHISKEY', 'JACK DANIELS OLD 7 1000 ML', 'BOTOL', 800000, 3),
  (143, 'WHISKEY', 'JACK DANIELS OLD 7 700 ML', 'BOTOL', 665000, 3),
  (144, 'WHISKEY', 'CHIVAS REGAL 12 YO 1000 ML', 'BOTOL', 895000, 3),
  (145, 'WHISKEY', 'CHIVAS REGAL 12 YO 700 ML', 'BOTOL', 750000, 3),
  (146, 'WHISKEY', 'GLENFIDDICH 12 YO ', 'BOTOL', 1150000, 3),
  (147, 'WHISKEY', 'JAMESON WHISKEY 700 ML', 'BOTOL', 575000, 3),
  (148, 'WHISKEY', 'JIM BEAM APPLE 750 ML', 'BOTOL', 520000, 3),
  (149, 'WHISKEY', 'JIM BEAM HONEY 750 ML', 'BOTOL', 580000, 3),
  (150, 'WHISKEY', 'JIM BEAM BOR BOUND 750 ML', 'BOTOL', 580000, 3),
  (151, 'WHISKEY', 'GILBEYS WHISKEY 350 ML', 'BOTOL', 170000, 3),
  (152, 'WHISKEY', 'GILBEYS WHISKEY 700 ML', 'BOTOL', 315000, 3),
  (153, 'WHISKEY', 'BATAVIA BLACK WHISKEY 700 ML', 'BOTOL', 480000, 3),
  (154, 'WHISKEY', 'BLACK ROYAL 750 ML', 'BOTOL', 800000, 2),
  (155, 'WHISKEY', 'RED ROYAL 750 ML', 'BOTOL', 580000, 1),
  (156, 'WHISKEY', 'BLEND WHISKEY 700 ML', 'BOTOL', 315000, 3),
  (157, 'WHISKEY', 'JHONY WALKER GOLD LABEL 750 ML', 'BOTOL', 1100000, 3),
  (158, 'SPIRIT', 'VIBE EXOTIC LYCHEE 700 ML', 'BOTOL', 380000, 6),
  (159, 'SPIRIT', 'VIBE BLACKTEA 700 ML', 'BOTOL', 380000, 6),
  (160, 'SPIRIT', 'VIBE ORIGINAL 700 ML ', 'BOTOL', 380000, 3),
  (161, 'SPIRIT', 'COINTREAU 1000 ML', 'BOTOL', 760000, 3),
  (162, 'SPIRIT', 'COINTREAU 700 ML', 'BOTOL', 590000, 3),
  (163, 'SPIRIT', 'JAGGERMEILTER 700 ML', 'BOTOL', 530000, 3),
  (164, 'SPIRIT', 'VIBE BLACK TEA 350 ML', 'BOTOL', 195000, 3),
  (165, 'SPIRIT', 'VIBE EXOTIC LYCHEE 350 ML', 'BOTOL', 195000, 3),
  (166, 'SPIRIT', 'VIBE PEACH 350 ML', 'BOTOL', 195000, 3),
  (167, 'SPIRIT', 'VIBE PREMIUM PEACH 700 ML', 'BOTOL', 380000, 3),
  (168, 'RUM', 'CAPTAIN MORGAN GOLD RUM 750 ML', 'BOTOL', 400000, 6),
  (169, 'RUM', 'CAPTAIN MORGAN GOLD RUM 200 ML', 'BOTOL', 115000, 6),
  (170, 'RUM', 'BACARDAI SPICED RUM 700 ML ', 'BOTOL', 385000, 6),
  (171, 'RUM', 'SACCHARUM SPICED RUM 700 ML', 'BOTOL', 395000, 3),
  (172, 'RUM', 'SANTANA WHITE RUM 750 ML', 'BOTOL', 335000, 3),
  (173, 'RUM', 'SANTANA SPICED RUM 750 ML', 'BOTOL', 335000, 3),
  (174, 'RUM', 'SANTANA SPICED RUM 180 ML', 'BOTOL', 115000, 3),
  (175, 'RUM', 'SANTANA WHITE RUM 180 ML', 'BOTOL', 115000, 2),
  (176, 'RUM', 'BACARDI WHITE RUM 700 ML', 'BOTOL', 385000, 3),
  (177, 'GIN', 'H GIN 750 ML', 'BOTOL', 440000, 3),
  (178, 'GIN', 'TOPI KOBOY GIN', 'BOTOL', 120000, 12),
  (179, 'GIN', 'GILBEYS GIN 350 ML', 'BOTOL', 170000, 3),
  (180, 'GIN', 'GILBEYS GIN 700 ML', 'BOTOL', 315000, 3),
  (181, 'COGNAC', 'MANSION HORSE BRANDY 700 ML', 'BOTOL', 255000, 6),
  (182, 'COGNAC', 'MANSION HORSE BRANDY 350 ML', 'BOTOL', 120000, 12),
  (183, 'COGNAC', 'MARTELL VSOP 700 ML', 'BOTOL', 1250000, 2),
  (184, 'TEQUILA', 'TEQUILA RANCHITOS 700 ML', 'BOTOL', 535000, 3),
  (185, 'TEQUILA', 'JOSE CUERVO GOLD REPOSADO 750ML', 'BOTOL', 575000, 3),
  (186, 'TEQUILA', 'SIERRA TEQUILA 700 ML', 'BOTOL', 475000, 1),
  (187, 'DINE IN', 'DINE IN', 'BOTOL', 30000, 1);

DO $import$
DECLARE
  v_required_missing text;
  v_inventory_columns text := 'tenant_id, item_name, unit, current_stock';
  v_inventory_values text := '$1, s.item_name, s.unit, s.opening_stock';
  v_inventory_set text := 'item_name = s.item_name, unit = s.unit, current_stock = s.opening_stock';
  v_menu_columns text := 'tenant_id, name, category, price, inventory_id';
  v_menu_values text := '$1, s.item_name, s.category, s.sale_price, i.id';
  v_menu_set text := 'name = s.item_name, category = s.category, price = s.sale_price, inventory_id = i.id';
  v_updated_at_inventory boolean;
  v_updated_at_menus boolean;
  v_inventory_inserted integer := 0;
  v_inventory_updated integer := 0;
  v_menus_inserted integer := 0;
  v_menus_updated integer := 0;
BEGIN
  IF (SELECT count(*) FROM binsarma_product_import) <> 187 THEN
    RAISE EXCEPTION 'Import dibatalkan: jumlah baris sumber bukan 187.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants WHERE tenant_id = 'BINSARMA_WINE'
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: tenant BINSARMA_WINE tidak ditemukan.';
  END IF;

  SELECT string_agg(required.column_name, ', ')
  INTO v_required_missing
  FROM (
    VALUES
      ('inventory', 'id', 'uuid'),
      ('inventory', 'tenant_id', NULL),
      ('inventory', 'item_name', NULL),
      ('inventory', 'unit', NULL),
      ('inventory', 'current_stock', NULL),
      ('menus', 'id', NULL),
      ('menus', 'tenant_id', NULL),
      ('menus', 'name', NULL),
      ('menus', 'category', NULL),
      ('menus', 'price', NULL),
      ('menus', 'inventory_id', 'uuid')
  ) AS required(table_name, column_name, expected_udt)
  LEFT JOIN information_schema.columns AS actual
    ON actual.table_schema = 'public'
   AND actual.table_name = required.table_name
   AND actual.column_name = required.column_name
  WHERE actual.column_name IS NULL
     OR (required.expected_udt IS NOT NULL AND actual.udt_name <> required.expected_udt);

  IF v_required_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Import dibatalkan: kolom wajib tidak ada atau tipenya tidak sesuai pada public.inventory/public.menus: %.',
      v_required_missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menus'
      AND column_name = 'id'
      AND udt_name IN ('int2', 'int4', 'int8')
      AND (is_identity = 'YES' OR column_default IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: public.menus.id harus integer dengan identity/default agar ID menu baru dibuat otomatis.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory'
      AND column_name = 'id'
      AND udt_name = 'uuid'
      AND column_default IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: public.inventory.id harus UUID dengan default generator.';
  END IF;

  SELECT string_agg(format('%I.%I', c.table_name, c.column_name), ', ')
  INTO v_required_missing
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name IN ('inventory', 'menus')
    AND c.is_nullable = 'NO'
    AND c.column_default IS NULL
    AND c.is_identity = 'NO'
    AND NOT (
      (c.table_name = 'inventory' AND c.column_name IN ('id', 'tenant_id', 'item_name', 'unit', 'current_stock'))
      OR
      (c.table_name = 'menus' AND c.column_name IN ('id', 'tenant_id', 'name', 'category', 'price', 'inventory_id'))
    );

  IF v_required_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Import dibatalkan: ada kolom NOT NULL tanpa default yang tidak diisi oleh script (%). Sesuaikan nilai sesuai skema live.',
      v_required_missing;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM binsarma_product_import
    GROUP BY regexp_replace(lower(btrim(item_name)), '\s+', ' ', 'g')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: CSV memiliki nama produk duplikat setelah normalisasi.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory i
    JOIN binsarma_product_import s
      ON regexp_replace(lower(btrim(i.item_name)), '\s+', ' ', 'g')
       = regexp_replace(lower(btrim(s.item_name)), '\s+', ' ', 'g')
    WHERE i.tenant_id = 'BINSARMA_WINE'
    GROUP BY regexp_replace(lower(btrim(i.item_name)), '\s+', ' ', 'g')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: inventory BINSARMA_WINE memiliki nama produk cocok yang duplikat/ambigu.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menus m
    JOIN binsarma_product_import s
      ON regexp_replace(lower(btrim(m.name)), '\s+', ' ', 'g')
       = regexp_replace(lower(btrim(s.item_name)), '\s+', ' ', 'g')
    WHERE m.tenant_id = 'BINSARMA_WINE'
    GROUP BY regexp_replace(lower(btrim(m.name)), '\s+', ' ', 'g')
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: menus BINSARMA_WINE memiliki nama produk cocok yang duplikat/ambigu.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.menus AS m
    JOIN binsarma_product_import AS s
       ON regexp_replace(lower(btrim(m.name)), '\s+', ' ', 'g')
        = regexp_replace(lower(btrim(s.item_name)), '\s+', ' ', 'g')
    JOIN public.inventory AS i
       ON i.tenant_id = 'BINSARMA_WINE'
     AND regexp_replace(lower(btrim(i.item_name)), '\s+', ' ', 'g')
        = regexp_replace(lower(btrim(s.item_name)), '\s+', ' ', 'g')
    WHERE m.tenant_id = 'BINSARMA_WINE'
       AND m.inventory_id IS NOT NULL
       AND m.inventory_id <> i.id
  ) THEN
    RAISE EXCEPTION 'Import dibatalkan: menu yang sudah ada terhubung ke inventory lain. Periksa pemetaan sebelum melanjutkan.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
       AND table_name = 'inventory'
       AND column_name = 'stock_quantity'
  ) THEN
    v_inventory_columns := v_inventory_columns || ', stock_quantity';
    v_inventory_values := v_inventory_values || ', s.opening_stock';
    v_inventory_set := v_inventory_set || ', stock_quantity = s.opening_stock';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
       AND table_name = 'menus'
       AND column_name = 'selling_price'
  ) THEN
    v_menu_columns := v_menu_columns || ', selling_price';
    v_menu_values := v_menu_values || ', s.sale_price';
    v_menu_set := v_menu_set || ', selling_price = s.sale_price';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'updated_at'
  ) INTO v_updated_at_inventory;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menus' AND column_name = 'updated_at'
  ) INTO v_updated_at_menus;

  IF v_updated_at_inventory THEN
    v_inventory_set := v_inventory_set || ', updated_at = now()';
  END IF;
  IF v_updated_at_menus THEN
    v_menu_set := v_menu_set || ', updated_at = now()';
  END IF;

  EXECUTE format(
    'UPDATE public.inventory AS i SET %s FROM binsarma_product_import AS s
     WHERE i.tenant_id = $1
        AND regexp_replace(lower(btrim(i.item_name)), ''\s+'', '' '', ''g'')
          = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')',
    v_inventory_set
  ) USING 'BINSARMA_WINE';
  GET DIAGNOSTICS v_inventory_updated = ROW_COUNT;

  EXECUTE format(
    'INSERT INTO public.inventory (%s)
     SELECT %s FROM binsarma_product_import AS s
     WHERE NOT EXISTS (
        SELECT 1 FROM public.inventory AS i
        WHERE i.tenant_id = $1
          AND regexp_replace(lower(btrim(i.item_name)), ''\s+'', '' '', ''g'')
            = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')
     )',
    v_inventory_columns,
    v_inventory_values
  ) USING 'BINSARMA_WINE';
  GET DIAGNOSTICS v_inventory_inserted = ROW_COUNT;

  EXECUTE format(
    'UPDATE public.menus AS m SET %s
     FROM binsarma_product_import AS s
     JOIN public.inventory AS i
        ON i.tenant_id = $1
       AND regexp_replace(lower(btrim(i.item_name)), ''\s+'', '' '', ''g'')
         = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')
     WHERE m.tenant_id = $1
        AND regexp_replace(lower(btrim(m.name)), ''\s+'', '' '', ''g'')
          = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')',
    v_menu_set
  ) USING 'BINSARMA_WINE';
  GET DIAGNOSTICS v_menus_updated = ROW_COUNT;

  EXECUTE format(
    'INSERT INTO public.menus (%s)
     SELECT %s
     FROM binsarma_product_import AS s
     JOIN public.inventory AS i
        ON i.tenant_id = $1
       AND regexp_replace(lower(btrim(i.item_name)), ''\s+'', '' '', ''g'')
         = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')
     WHERE NOT EXISTS (
        SELECT 1 FROM public.menus AS m
        WHERE m.tenant_id = $1
          AND regexp_replace(lower(btrim(m.name)), ''\s+'', '' '', ''g'')
            = regexp_replace(lower(btrim(s.item_name)), ''\s+'', '' '', ''g'')
     )',
    v_menu_columns,
    v_menu_values
  ) USING 'BINSARMA_WINE';
  GET DIAGNOSTICS v_menus_inserted = ROW_COUNT;

  RAISE NOTICE 'BINSARMA_WINE import complete: % CSV rows; inventory inserted %, updated %; menus inserted %, updated %.',
    (SELECT count(*) FROM binsarma_product_import),
    v_inventory_inserted,
    v_inventory_updated,
    v_menus_inserted,
    v_menus_updated;
END
$import$;

COMMIT;
