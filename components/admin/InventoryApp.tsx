import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTenant } from "../../hooks/useTenant";
import { supabase } from "../../lib/supabase";
import {
  Plus, Package, AlertTriangle, Trash2, X, Cog,
  ArrowUpCircle, Activity, Search, Pencil, SlidersHorizontal
} from "lucide-react";

/* ───────────────────────────── TYPES ───────────────────────────── */

interface InventoryItem {
  id: string;
  item_name: string;
  unit: string;
  current_stock: number;
  min_stock: number | null;
  cost_price: number | null; // harga modal PER SATUAN
  is_retail: boolean;
  tenant_id: string;
}

interface MenuItem {
  id: number;
  name: string;
  category: string | null;
  tenant_id: string;
}

interface Recipe {
  id: string;
  menu_id: number;
  inventory_id: string;
  usage_quantity: number;
  tenant_id: string;
  inventory?: { item_name: string; unit: string } | null;
}

type SubMenu = "DETAIL PRODUK" | "STOK" | "PERGERAKAN";
type ModalType = "RECIPE" | "STOCK_IN" | "ADJUST_STOCK" | "ADD_MATERIAL" | "EDIT_ITEM" | null;

interface ItemForm {
  name: string;
  is_retail: boolean;
  unit: string;
  stock: string;
  min: string;
  price: string;
}

/* ──────────────────────────── CONSTANTS ──────────────────────────── */

const SUB_MENUS: SubMenu[] = ["DETAIL PRODUK", "STOK", "PERGERAKAN"];
const UNITS = ["GRAM", "KG", "ML", "LITER", "PCS", "BOTTLE", "CAN", "PACK", "BOX"];
const MAX_RESTOCK_RETRY = 3;

const EMPTY_FORM: ItemForm = {
  name: "",
  is_retail: false,
  unit: "GRAM",
  stock: "0",
  min: "5",
  price: "0",
};

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-white outline-none focus:border-blue-500";
const selectCls =
  "w-full bg-[#0b1120] border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-white outline-none focus:border-blue-500";
const labelCls = "text-[8px] font-bold text-gray-500 tracking-widest uppercase ml-1";

/* ───────────────────────────── HELPERS ───────────────────────────── */

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000; // hindari 0.1 + 0.2 = 0.30000000000000004
const rupiah = (n: number | null | undefined) => `Rp ${(n ?? 0).toLocaleString("id-ID")}`;
const minOf = (i: InventoryItem) => i.min_stock ?? 0;
const isLow = (i: InventoryItem) => Number(i.current_stock) <= minOf(i);
const parseNum = (s: string) => {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const stockPercent = (i: InventoryItem) => {
  const target = Math.max(minOf(i) * 2, 1);
  return Math.min(Math.max((Number(i.current_stock) / target) * 100, 0), 100);
};

/* ───────────────────────────── COMPONENT ───────────────────────────── */

export default function InventoryApp() {
  const { tenantId } = useTenant();

  const [activeSubMenu, setActiveSubMenu] = useState<SubMenu>("DETAIL PRODUK");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true); // hanya untuk load awal
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [recipeUsage, setRecipeUsage] = useState("");
  const [selectedInvId, setSelectedInvId] = useState("");
  const [stockAmount, setStockAmount] = useState("");
  const [stockPrice, setStockPrice] = useState(""); // opsional: harga beli per satuan saat restock
  const [adjustValue, setAdjustValue] = useState(""); // stok yang BENAR (untuk koreksi)

  const requestId = useRef(0);

  /* ─────────────── DATA LOADING ─────────────── */

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    const myId = ++requestId.current;

    try {
      const [menusRes, invRes, recRes] = await Promise.all([
        supabase.from("menus").select("id, name, category, tenant_id").eq("tenant_id", tenantId).order("category"),
        supabase.from("inventory").select("*").eq("tenant_id", tenantId).order("item_name"),
        supabase.from("recipes").select("*, inventory:inventory_id (item_name, unit)").eq("tenant_id", tenantId),
      ]);

      if (myId !== requestId.current) return; // ada request yang lebih baru, abaikan hasil ini

      const errors: string[] = [];
      if (menusRes.error) errors.push(`menus: ${menusRes.error.message}`);
      if (invRes.error) errors.push(`inventory: ${invRes.error.message}`);
      if (recRes.error) errors.push(`recipes: ${recRes.error.message}`);
      setLoadError(errors.length ? errors.join(" | ") : null);

      if (!menusRes.error) setMenuList((menusRes.data ?? []) as MenuItem[]);
      if (!invRes.error) setItems((invRes.data ?? []) as InventoryItem[]); // semua barang ditampilkan, tanpa dedupe nama
      if (!recRes.error) setRecipes((recRes.data ?? []) as unknown as Recipe[]);
    } catch (err) {
      console.error(err);
      if (myId === requestId.current) setLoadError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      if (myId === requestId.current) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    loadData();
  }, [tenantId, loadData]);

  /* ─────────────── MODAL CONTROL ─────────────── */

  const closeModal = () => {
    setModalType(null);
    setSelectedMenu(null);
    setSelectedItem(null);
    setForm(EMPTY_FORM);
    setRecipeUsage("");
    setSelectedInvId("");
    setStockAmount("");
    setStockPrice("");
    setAdjustValue("");
  };

  const openAddMaterial = () => {
    closeModal();
    setModalType("ADD_MATERIAL");
  };

  const openEditItem = (item: InventoryItem) => {
    closeModal();
    setSelectedItem(item);
    setForm({
      name: item.item_name,
      is_retail: item.is_retail,
      unit: item.unit,
      stock: String(item.current_stock),
      min: String(item.min_stock ?? 0),
      price: String(item.cost_price ?? 0),
    });
    setModalType("EDIT_ITEM");
  };

  const openStockIn = (item: InventoryItem) => {
    closeModal();
    setSelectedItem(item);
    setModalType("STOCK_IN");
  };

  const openAdjust = (item: InventoryItem) => {
    closeModal();
    setSelectedItem(item);
    setAdjustValue(String(round3(Number(item.current_stock))));
    setModalType("ADJUST_STOCK");
  };

  const openRecipe = (menu: MenuItem) => {
    closeModal();
    setSelectedMenu(menu);
    setModalType("RECIPE");
  };

  const setRetail = (is_retail: boolean) => {
    setForm((f) => {
      let unit = f.unit;
      if (modalType === "ADD_MATERIAL") {
        if (is_retail && unit === "GRAM") unit = "BOTTLE";
        if (!is_retail && unit === "BOTTLE") unit = "GRAM";
      }
      return { ...f, is_retail, unit };
    });
  };

  /* ─────────────── ITEM FORM VALIDATION ─────────────── */

  interface ItemPayload {
    item_name: string;
    unit: string;
    current_stock: number;
    min_stock: number;
    cost_price: number;
    is_retail: boolean;
  }

  // hasil validasi: string = pesan error, ItemPayload = data valid
  type ParsedForm = string | ItemPayload;

  const parseForm = (isEdit: boolean): ParsedForm => {
    const name = form.name.trim().toUpperCase();
    if (!name) return "Nama barang wajib diisi.";
    if (!form.unit) return "Satuan wajib dipilih.";

    const stock = isEdit ? 0 : parseNum(form.stock || "0");
    const min = parseNum(form.min || "0");
    const price = parseNum(form.price || "0");
    if ([stock, min, price].some((n) => Number.isNaN(n) || n < 0)) {
      return "Stok awal, min stok, dan harga modal harus berupa angka 0 atau lebih.";
    }

    const others = items.filter((i) => i.id !== selectedItem?.id);
    if (others.some((i) => i.item_name.toUpperCase() === name)) {
      return `Barang "${name}" sudah ada. Gunakan RESTOCK untuk menambah stoknya.`;
    }

    return {
      item_name: name,
      unit: form.unit.toUpperCase(),
      current_stock: round3(stock),
      min_stock: min,
      cost_price: round2(price),
      is_retail: form.is_retail,
    };
  };

  /* ─────────────── ACTIONS ─────────────── */

  const handleAddMaterial = async () => {
    if (saving) return;
    if (!tenantId) return alert("Tenant tidak ditemukan. Silakan login ulang.");

    const parsed = parseForm(false);
    if (typeof parsed === "string") return alert(parsed);

    setSaving(true);
    try {
      const d = parsed;
      const { error } = await supabase.from("inventory").insert([
        {
          item_name: d.item_name,
          unit: d.unit,
          current_stock: d.current_stock,
          min_stock: d.min_stock,
          cost_price: d.cost_price,
          is_retail: d.is_retail,
          tenant_id: tenantId,
        },
      ]);
      if (error) {
        alert("Gagal menambahkan material: " + error.message);
        return;
      }
      closeModal();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = async () => {
    if (saving) return;
    if (!tenantId || !selectedItem) return;

    const parsed = parseForm(true);
    if (typeof parsed === "string") return alert(parsed);

    // stok tidak diubah dari sini (pakai RESTOCK / KOREKSI) supaya tidak menimpa stok dari transaksi lain
    const d = parsed;
    const patch = {
      item_name: d.item_name,
      unit: d.unit,
      min_stock: d.min_stock,
      cost_price: d.cost_price,
      is_retail: d.is_retail,
    };

    setSaving(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update(patch)
        .eq("id", selectedItem.id)
        .eq("tenant_id", tenantId);
      if (error) {
        alert("Gagal menyimpan perubahan: " + error.message);
        return;
      }
      closeModal();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  /**
   * Restock aman dari "lost update":
   * stok dibaca ulang dari database, lalu di-update hanya jika nilainya belum berubah
   * (compare-and-swap). Kalau berubah di tengah jalan (mis. ada penjualan), diulang otomatis.
   */
  const handleStockIn = async () => {
    if (saving || !tenantId) return;
    if (!selectedItem) return alert("PILIH BARANG TERLEBIH DAHULU!");

    const amount = parseNum(stockAmount);
    if (Number.isNaN(amount) || amount <= 0) return alert("Jumlah restock harus lebih dari 0.");

    const newPrice = stockPrice.trim() === "" ? null : parseNum(stockPrice);
    if (newPrice !== null && (Number.isNaN(newPrice) || newPrice < 0)) {
      return alert("Harga beli harus berupa angka 0 atau lebih.");
    }

    setSaving(true);
    try {
      for (let attempt = 0; attempt < MAX_RESTOCK_RETRY; attempt++) {
        const { data: fresh, error: readError } = await supabase
          .from("inventory")
          .select("current_stock, cost_price")
          .eq("id", selectedItem.id)
          .eq("tenant_id", tenantId)
          .single();

        if (readError || !fresh) {
          alert("GAGAL MEMBACA STOK TERBARU: " + (readError?.message ?? "barang tidak ditemukan"));
          return;
        }

        const oldStock = Number(fresh.current_stock) || 0;
        const oldCost = Number(fresh.cost_price) || 0;

        const patch: { current_stock: number; cost_price?: number } = {
          current_stock: round3(oldStock + amount),
        };
        if (newPrice !== null) {
          // rata-rata tertimbang: HPP tidak langsung "ditimpa" harga beli terbaru
          patch.cost_price =
            oldStock > 0 ? round2((oldStock * oldCost + amount * newPrice) / (oldStock + amount)) : round2(newPrice);
        }

        const { data: updated, error } = await supabase
          .from("inventory")
          .update(patch)
          .eq("id", selectedItem.id)
          .eq("tenant_id", tenantId)
          .eq("current_stock", fresh.current_stock)
          .select("id");

        if (error) {
          alert("GAGAL UPDATE STOK: " + error.message);
          return;
        }
        if (updated && updated.length > 0) {
          closeModal();
          await loadData();
          return;
        }
        // 0 baris ter-update = stok berubah saat diproses → ulangi
      }

      alert("Stok berubah terus saat diproses. Silakan coba lagi.");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  /**
   * Koreksi stok (stock opname): menimpa stok dengan jumlah yang BENAR.
   * Dipakai kalau salah input restock atau stok fisik tidak sama dengan catatan.
   */
  const handleAdjustStock = async () => {
    if (saving || !tenantId) return;
    if (!selectedItem) return alert("PILIH BARANG TERLEBIH DAHULU!");

    const target = parseNum(adjustValue);
    if (Number.isNaN(target) || target < 0) return alert("Stok yang benar harus berupa angka 0 atau lebih.");

    setSaving(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({ current_stock: round3(target) })
        .eq("id", selectedItem.id)
        .eq("tenant_id", tenantId);

      if (error) {
        alert("GAGAL KOREKSI STOK: " + error.message);
        return;
      }
      closeModal();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const saveRecipe = async () => {
    if (saving || !tenantId) return;
    if (!selectedMenu) return alert("Menu tidak valid. Tutup lalu buka ulang konfigurasi resep.");
    if (!selectedInvId) return alert("Pilih bahan terlebih dahulu.");

    const qty = parseNum(recipeUsage);
    if (Number.isNaN(qty) || qty <= 0) return alert("Jumlah pemakaian harus lebih dari 0.");

    if (recipes.some((r) => r.menu_id === selectedMenu.id && r.inventory_id === selectedInvId)) {
      return alert("Bahan ini sudah ada di resep menu tersebut. Hapus dulu baris lamanya jika ingin mengubah jumlah.");
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("recipes").insert([
        {
          menu_id: selectedMenu.id,
          inventory_id: selectedInvId,
          usage_quantity: round3(qty),
          tenant_id: tenantId,
        },
      ]);
      if (error) {
        alert("Gagal menyimpan resep: " + error.message);
        return;
      }
      closeModal();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const deleteRecipe = async (recipe: Recipe) => {
    if (!tenantId) return;
    const name = recipe.inventory?.item_name ?? "bahan ini";
    if (!confirm(`Hapus "${name}" dari resep?`)) return;

    const { error } = await supabase.from("recipes").delete().eq("id", recipe.id).eq("tenant_id", tenantId);
    if (error) {
      alert("Gagal menghapus baris resep: " + error.message);
      return;
    }
    await loadData();
  };

  const deleteInventory = async (id: string) => {
    if (!tenantId) return alert("Tenant tidak ditemukan. Silakan login ulang.");

    const item = items.find((entry) => entry.id === id);
    if (!item) return alert("Barang tidak ditemukan. Muat ulang halaman lalu coba lagi.");

    // Cek pemakaian di resep (tabel yang memang dikelola aplikasi ini)
    const { count, error: countError } = await supabase
      .from("recipes")
      .select("*", { count: "exact", head: true })
      .eq("inventory_id", id)
      .eq("tenant_id", tenantId);

    if (countError) {
      alert("Barang belum dihapus karena pemakaian di resep tidak dapat diverifikasi.\n\n" + countError.message);
      return;
    }
    if ((count ?? 0) > 0) {
      alert(
        `Barang "${item.item_name}" masih dipakai di ${count} baris resep. ` +
          `Hapus dulu dari resep (tab DETAIL PRODUK), lalu coba lagi.`
      );
      return;
    }

    if (!confirm(`Yakin ingin menghapus barang "${item.item_name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    const { error } = await supabase.from("inventory").delete().eq("id", id).eq("tenant_id", tenantId);

    if (error) {
      console.error("Gagal menghapus inventory:", error.message);
      // 23503 = foreign key violation: barang masih dipakai tabel lain (riwayat transaksi, dll.)
      if (error.code === "23503") {
        alert(`Barang "${item.item_name}" tidak bisa dihapus karena masih punya riwayat/keterkaitan data lain.`);
      } else {
        alert("Barang gagal dihapus: " + error.message);
      }
      return;
    }

    await loadData();
  };

  const submitModal = () => {
    switch (modalType) {
      case "ADD_MATERIAL":
        return handleAddMaterial();
      case "EDIT_ITEM":
        return handleEditItem();
      case "STOCK_IN":
        return handleStockIn();
      case "ADJUST_STOCK":
        return handleAdjustStock();
      case "RECIPE":
        return saveRecipe();
      default:
        return;
    }
  };

  /* ─────────────── DERIVED DATA ─────────────── */

  const q = searchTerm.trim().toLowerCase();
  const filteredItems = items.filter((i) => i.item_name.toLowerCase().includes(q));

  const groupedMenu = menuList.reduce((acc: Record<string, MenuItem[]>, menu) => {
    const cat = menu.category || "OTHERS";
    (acc[cat] ??= []).push(menu);
    return acc;
  }, {});

  const lowStockCount = items.filter(isLow).length;
  const menusWithRecipe = new Set(recipes.map((r) => r.menu_id)).size;

  const recipeCandidates = selectedMenu
    ? items.filter((i) => !recipes.some((r) => r.menu_id === selectedMenu.id && r.inventory_id === i.id))
    : items;
  const selectedRecipeInv = items.find((i) => i.id === selectedInvId);

  // data terbaru dari barang yang sedang di-restock / dikoreksi
  const liveItem = items.find((i) => i.id === selectedItem?.id) ?? selectedItem;
  const liveStock = liveItem ? round3(Number(liveItem.current_stock)) : 0;
  const restockAmount = parseNum(stockAmount);
  const adjustTarget = parseNum(adjustValue);

  const unitOptions = UNITS.includes(form.unit) ? UNITS : [form.unit, ...UNITS];

  /* ─────────────── RENDER ─────────────── */

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#020617] min-h-screen text-slate-200 font-sans tracking-tight">
      {/* HEADER SYSTEM */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white">CENTRAL_INVENTORY_V1</h1>
          <p className="text-[10px] text-slate-500 font-mono">
            SYSTEM_STATUS:{" "}
            {loadError ? (
              <span className="text-red-500">ERROR</span>
            ) : (
              <span className="text-emerald-500">OPERATIONAL</span>
            )}
          </p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {SUB_MENUS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubMenu(tab)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                activeSubMenu === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono rounded-2xl p-4 flex items-center justify-between gap-4">
          <span className="break-all">Gagal memuat sebagian data — {loadError}</span>
          <button onClick={loadData} className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white font-black">
            RETRY
          </button>
        </div>
      )}

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Resource</p>
          <p className="text-xl font-mono font-bold text-white">{items.length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Low Stock Alert</p>
          <p className="text-xl font-mono font-bold text-red-500">{lowStockCount}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Menu Ber-resep</p>
          <p className="text-xl font-mono font-bold text-blue-500">{menusWithRecipe}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-end">
          <button
            onClick={openAddMaterial}
            disabled={!tenantId}
            className="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 border border-blue-500/30"
          >
            <Plus size={14} /> NEW_ITEM
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-mono animate-pulse uppercase">Synchronizing_Data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* VIEW: DETAIL PRODUK */}
          {activeSubMenu === "DETAIL PRODUK" && (
            <div className="grid gap-10">
              {Object.keys(groupedMenu).length === 0 && (
                <p className="text-[10px] font-mono text-slate-600 italic">Belum ada menu.</p>
              )}
              {Object.keys(groupedMenu).map((category) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[11px] font-black text-blue-500 tracking-[0.3em] uppercase">{category}</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {groupedMenu[category].map((menu) => {
                      const menuRecipes = recipes.filter((r) => r.menu_id === menu.id);
                      return (
                        <div
                          key={menu.id}
                          className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-[11px] font-black text-white italic group-hover:text-blue-400 transition-colors">
                              {menu.name}
                            </h3>
                          </div>
                          <div className="space-y-2 mb-6 min-h-[50px]">
                            {menuRecipes.length > 0 ? (
                              menuRecipes.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex justify-between items-center gap-2 text-[9px] font-mono border-b border-white/5 pb-1"
                                >
                                  <span className="text-slate-500 truncate">{r.inventory?.item_name ?? "(bahan dihapus)"}</span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span className="text-blue-500">
                                      -{r.usage_quantity} {r.inventory?.unit ?? ""}
                                    </span>
                                    <button
                                      onClick={() => deleteRecipe(r)}
                                      title="Hapus dari resep"
                                      className="text-slate-600 hover:text-red-500 transition-colors"
                                    >
                                      <X size={11} />
                                    </button>
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[8px] text-slate-700 italic">No recipe linked.</p>
                            )}
                          </div>
                          <button
                            onClick={() => openRecipe(menu)}
                            className="w-full py-2 bg-white/5 hover:bg-blue-600 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
                          >
                            <Cog size={12} /> Config_Recipe
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: STOK */}
          {activeSubMenu === "STOK" && (
            <div className="space-y-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input
                  type="text"
                  placeholder="SEARCH_INVENTORY..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[11px] font-mono text-white outline-none focus:border-blue-600 transition-all"
                />
              </div>

              {filteredItems.length === 0 && (
                <p className="text-[10px] font-mono text-slate-600 italic">Tidak ada barang yang cocok.</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredItems.map((item) => {
                  const low = isLow(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-[2rem] border transition-all flex flex-col items-center text-center relative ${
                        low ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.03] border-white/10"
                      }`}
                    >
                      <div className="absolute top-3 right-3 text-[7px] text-blue-400 font-mono font-bold bg-blue-500/10 px-1 rounded">
                        {rupiah(item.cost_price)}
                      </div>

                      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center mb-4 mt-2">
                        <Package className={low ? "text-red-500" : "text-blue-500"} size={20} />
                      </div>
                      <span className="text-[7px] font-black text-slate-500 italic mb-1 tracking-widest">{item.unit}</span>
                      <h3 className="text-[10px] font-black text-white uppercase mb-4 h-8 flex items-center leading-tight">
                        {item.item_name}
                      </h3>
                      <div className="flex items-center gap-2 mb-6">
                        <p className="text-3xl font-mono font-black text-white">{round3(Number(item.current_stock))}</p>
                        {low && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                      </div>
                      <button
                        onClick={() => openStockIn(item)}
                        className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <ArrowUpCircle size={12} /> RESTOCK
                      </button>
                      <button
                        onClick={() => openAdjust(item)}
                        className="w-full mt-2 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
                      >
                        <SlidersHorizontal size={12} /> KOREKSI
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: PERGERAKAN (daftar & kelola barang) */}
          {activeSubMenu === "PERGERAKAN" && (
            <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-x-auto shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-5">Resource_Detail</th>
                    <th className="px-8 py-5">Volume</th>
                    <th className="px-8 py-5">Cost Price / Unit</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-6 text-[10px] font-mono text-slate-600 italic">
                        Belum ada barang.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-4">
                        <p className="text-[12px] font-black text-white italic tracking-tighter">{item.item_name}</p>
                        <div className="flex gap-2 mt-1">
                          <span
                            className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${
                              item.is_retail
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {item.is_retail ? "RETAIL_SALE" : "F&B_RAW"}
                          </span>
                          <span className="text-[7px] text-slate-600 font-mono">UNIT: {item.unit}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-lg font-bold">{round3(Number(item.current_stock))}</span>
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isLow(item) ? "bg-red-500" : "bg-blue-600"}`}
                              style={{ width: `${stockPercent(item)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                        <span className="font-mono text-[10px] text-blue-400">{rupiah(item.cost_price)}</span>
                      </td>
                      <td className="px-8 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openAdjust(item)}
                          title="Koreksi stok"
                          className="p-2 text-slate-600 hover:text-amber-400 transition-colors"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        <button
                          onClick={() => openEditItem(item)}
                          title="Edit barang"
                          className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteInventory(item.id)}
                          title="Hapus barang"
                          className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL SYSTEM */}
      {modalType && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-white/10 w-full max-w-[340px] max-h-[90vh] overflow-y-auto p-8 rounded-[2.5rem] space-y-6 shadow-3xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 uppercase">
              <h2 className="text-[13px] font-black italic text-blue-500 tracking-tighter flex items-center gap-2">
                <Activity size={14} /> {modalType.replace(/_/g, " ")}
              </h2>
              <button onClick={closeModal} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* FORM ADD / EDIT MATERIAL */}
              {(modalType === "ADD_MATERIAL" || modalType === "EDIT_ITEM") && (
                <>
                  <div>
                    <label className={labelCls}>Nama Barang</label>
                    <input
                      type="text"
                      placeholder="MISAL: BIJI KOPI / JACK DANIELS"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                    />
                  </div>

                  {/* TOGGLE TIPE BARANG */}
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                    <button
                      type="button"
                      onClick={() => setRetail(false)}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${
                        !form.is_retail ? "bg-emerald-600 text-white" : "text-gray-500"
                      }`}
                    >
                      F&B RAW MATERIAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setRetail(true)}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black transition-all ${
                        form.is_retail ? "bg-blue-600 text-white" : "text-gray-500"
                      }`}
                    >
                      BOTTLE / RETAIL
                    </button>
                  </div>

                  <div className={modalType === "ADD_MATERIAL" ? "grid grid-cols-2 gap-3" : ""}>
                    <div>
                      <label className={labelCls}>Satuan</label>
                      <select
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                        className={selectCls}
                      >
                        {unitOptions.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    {modalType === "ADD_MATERIAL" && (
                      <div>
                        <label className={labelCls}>Stok Awal</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Misal: 1000"
                          value={form.stock}
                          onChange={(e) => setForm({ ...form, stock: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Min Stok</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Misal: 5"
                        value={form.min}
                        onChange={(e) => setForm({ ...form, min: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Harga Modal / Satuan (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Misal: 150"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {modalType === "EDIT_ITEM" && (
                    <p className="text-[8px] font-mono text-slate-600 italic">
                      Untuk mengubah jumlah stok, gunakan tombol KOREKSI (atau RESTOCK untuk barang masuk).
                    </p>
                  )}
                </>
              )}

              {/* FORM RESTOCK */}
              {modalType === "STOCK_IN" && (
                <div className="space-y-4 text-center">
                  <p className="text-[10px] font-black text-slate-500 italic">
                    RESTOCKING: {selectedItem?.item_name} ({selectedItem?.unit})
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="00"
                    autoFocus
                    value={stockAmount}
                    onChange={(e) => setStockAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-mono font-black text-blue-500 text-center outline-none"
                  />
                  {liveItem && !Number.isNaN(restockAmount) && restockAmount > 0 && (
                    <p className="text-[10px] font-mono text-slate-500">
                      Stok {liveStock} → <span className="text-emerald-400 font-bold">{round3(liveStock + restockAmount)}</span>{" "}
                      {liveItem.unit}
                    </p>
                  )}
                  <div className="text-left">
                    <label className={labelCls}>Harga Beli / Satuan (Rp) — opsional</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Kosongkan jika harga tidak berubah"
                      value={stockPrice}
                      onChange={(e) => setStockPrice(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* FORM KOREKSI STOK */}
              {modalType === "ADJUST_STOCK" && (
                <div className="space-y-4 text-center">
                  <p className="text-[10px] font-black text-slate-500 italic">
                    KOREKSI STOK: {liveItem?.item_name} ({liveItem?.unit})
                  </p>
                  <p className="text-[10px] font-mono text-slate-500">
                    Stok tercatat saat ini: <span className="text-white font-bold">{liveStock}</span>
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="00"
                    autoFocus
                    value={adjustValue}
                    onChange={(e) => setAdjustValue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-mono font-black text-amber-500 text-center outline-none"
                  />
                  {!Number.isNaN(adjustTarget) && adjustTarget >= 0 && (
                    <p className="text-[10px] font-mono text-slate-500">
                      Selisih:{" "}
                      <span className={adjustTarget - liveStock < 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                        {adjustTarget - liveStock > 0 ? "+" : ""}
                        {round3(adjustTarget - liveStock)}
                      </span>
                    </p>
                  )}
                  <p className="text-[8px] font-mono text-slate-600 italic">
                    Isi dengan jumlah stok yang BENAR. Stok akan diganti dengan angka ini (bukan ditambah).
                  </p>
                </div>
              )}

              {/* FORM RESEP */}
              {modalType === "RECIPE" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase italic">MENU_TARGET: {selectedMenu?.name}</p>
                  <select value={selectedInvId} onChange={(e) => setSelectedInvId(e.target.value)} className={selectCls}>
                    <option value="">-- SELECT_RESOURCE --</option>
                    {recipeCandidates.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.item_name} ({i.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`USAGE_QTY${selectedRecipeInv ? ` (${selectedRecipeInv.unit})` : ""}`}
                    value={recipeUsage}
                    onChange={(e) => setRecipeUsage(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              <button
                onClick={submitModal}
                disabled={saving}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-[11px] text-white tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all uppercase mt-2"
              >
                {saving ? "Menyimpan..." : "Confirm_Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
