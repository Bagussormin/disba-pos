import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Search, Calculator, TrendingUp } from "lucide-react";

export default function Paket() {
  const tenantId = localStorage.getItem("tenant_id") || "DISBA_OUTLET_001";

  // State Data
  const [normalMenus, setNormalMenus] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  
  // State Form Paket Baru
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [bundleItems, setBundleItems] = useState<{ menu_id: number; name: string; quantity: number; price: number; hpp: number }[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Ambil Menu Normal
    const { data: menus } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    if (menus) setNormalMenus(menus);

    // 2. Ambil Daftar Paket (🔥 FIX BUG 1: Hapus created_at, ganti dengan id)
    const { data: pkgs, error: pkgsErr } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false }); 
    
    if (pkgsErr) console.error("Error fetching packages:", pkgsErr);

    // 3. Ambil isi dari masing-masing paket
    if (pkgs) {
      const { data: items } = await supabase.from("package_items").select("*, menus(name)").eq("tenant_id", tenantId);
      
      const packagesWithItems = pkgs.map(p => ({
        ...p,
        items: items?.filter(i => i.package_id === p.id) || []
      }));
      setPackages(packagesWithItems);
    }
  };

  // --- LOGIKA PERAKITAN PAKET ---
  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setBundleItems([...bundleItems, { 
        menu_id: menu.id, 
        name: menu.name, 
        quantity: 1, 
        price: menu.price || 0,
        hpp: menu.hpp || 0 
      }]);
    }
  };

  const removeMenuFromBundle = (menuId: number) => {
    setBundleItems(bundleItems.filter(item => item.menu_id !== menuId));
  };

  // --- LOGIKA KALKULATOR HPP & SARAN HARGA ---
  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  
  const marginPrice = totalHPP > 0 ? totalHPP * 1.5 : 0; 
  const discountPrice = totalNormalPrice * 0.85; 
  const suggestedPrice = totalHPP > 0 ? Math.max(marginPrice, discountPrice) : discountPrice;

  const handleSavePackage = async (e: any) => {
    e.preventDefault();
    if (!packageName || !packagePrice || bundleItems.length === 0) {
      alert("Nama, Harga, dan Isi Paket wajib diisi!");
      return;
    }

    if (Number(packagePrice) < totalHPP) {
      if(!window.confirm("PERINGATAN: Harga jual paket ini di bawah Total Modal (HPP)! Anda akan rugi. Tetap lanjutkan?")) {
        return;
      }
    }

    setLoading(true);
    try {
      // 🔥 FIX BUG 3: Sekarang HPP ikut disetorkan ke tabel Menu Master!
      const { data: newMenu, error: menuErr } = await supabase.from("menus").insert({
        tenant_id: tenantId,
        name: packageName,
        price: Number(packagePrice),
        hpp: totalHPP, // <--- INI KUNCI AGAR MENU MASTER TIDAK NOL
        category: "PAKET",
      }).select().single();

      if (menuErr) throw menuErr;

      const insertItems = bundleItems.map(item => ({
        tenant_id: tenantId,
        package_id: newMenu.id,
        menu_id: item.menu_id,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase.from("package_items").insert(insertItems);
      if (itemsErr) throw itemsErr;

      setPackageName("");
      setPackagePrice("");
      setBundleItems([]);
      fetchData(); // Sekarang daftar paket langsung muncul di kanan!
      alert("Paket Bundling Berhasil Dibuat!");
    } catch (err: any) {
      alert("Gagal menyimpan paket: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus paket ini?")) return;
    await supabase.from("menus").delete().eq("id", id).eq("tenant_id", tenantId);
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-4 bg-purple-500/20 text-purple-400 rounded-2xl border border-purple-500/30"><Package size={32} /></div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Manajemen Paket</h1>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Buat Bundling & Promo Otomatis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KIRI: FORM BUILDER PAKET BARU */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl">
          <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-purple-600"/> RAKIT PAKET BARU</h2>
          
          <form onSubmit={handleSavePackage} className="space-y-5">
            <div>
              <label className="text-xs font-black text-gray-600 uppercase tracking-widest mb-2 block">Nama Paket Promo</label>
              <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-400" placeholder="Contoh: Paket Buka Puasa Berdua" required />
            </div>

            <div className="pt-2">
              <label className="text-xs font-black text-purple-700 uppercase tracking-widest mb-3 block">1. Pilih Isi Paket:</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 bg-gray-50 rounded-xl">
                {normalMenus.map(menu => (
                  <button type="button" key={menu.id} onClick={() => addMenuToBundle(menu)} className="text-left bg-white border border-gray-200 p-2 rounded-lg text-xs font-bold text-gray-800 hover:border-purple-500 hover:text-purple-700 shadow-sm transition-all flex justify-between items-center">
                    <span className="truncate pr-2">{menu.name}</span>
                    <Plus size={14} className="text-purple-500 flex-shrink-0"/>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl min-h-[100px]">
              <label className="text-[10px] font-black text-purple-800 uppercase tracking-widest mb-3 block">2. Komposisi Bundling:</label>
              {bundleItems.length === 0 ? (
                <p className="text-xs text-purple-400 font-bold italic text-center py-4">Belum ada menu yang dipilih</p>
              ) : (
                <div className="space-y-2">
                  {bundleItems.map(item => (
                    <div key={item.menu_id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-purple-100 shadow-sm text-xs font-bold">
                      <span className="text-purple-700 font-black text-sm">{item.quantity}x <span className="text-gray-800 text-xs">{item.name}</span></span>
                      <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {bundleItems.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator size={16} className="text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Analisis Harga & Modal (HPP)</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>Total Harga Satuan (Normal):</span>
                    <span className="line-through">Rp {totalNormalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-red-600 border-b border-emerald-200/50 pb-2">
                    <span>Total Modal Bahan (HPP):</span>
                    <span>Rp {totalHPP.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-emerald-700 pt-1">
                    <span className="flex items-center gap-1"><TrendingUp size={14}/> Saran Harga Jual:</span>
                    <span>Rp {suggestedPrice.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2 block">3. Tentukan Harga Jual Akhir</label>
                  <input type="number" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} className="w-full bg-white border-2 border-emerald-300 text-gray-900 rounded-xl px-4 py-3 text-lg font-black font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-300" placeholder="0" required />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_10px_20px_rgba(147,51,234,0.3)] active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> SIMPAN PAKET & PUBLISH</>}
            </button>
          </form>
        </div>

        {/* KANAN: DAFTAR PAKET AKTIF */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col h-[80vh]">
          <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2"><Package className="text-blue-500"/> PAKET AKTIF ({packages.length})</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search size={48} className="mb-4 opacity-20"/>
                <p className="text-sm font-bold uppercase tracking-widest">Belum ada paket bundling</p>
              </div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-lg hover:border-purple-300 transition-all bg-gray-50 group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-gray-900 text-sm uppercase">{pkg.name}</h3>
                      <p className="text-purple-600 font-mono font-black text-sm">Rp {Number(pkg.price).toLocaleString('id-ID')}</p>
                    </div>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-400 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                  </div>
                  
                  {/* Tampilkan Isi Paket */}
                  <div className="bg-white p-3 rounded-xl border border-dashed border-gray-300">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Isi Paket:</p>
                    <div className="space-y-1">
                      {pkg.items.map((i: any, idx: number) => (
                        <p key={idx} className="text-[11px] font-bold text-gray-700">
                          <span className="text-purple-600 font-black">{i.quantity}x</span> {i.menus?.name || 'Menu Terhapus'}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}