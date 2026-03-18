import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Calculator, TrendingUp, Info } from "lucide-react";

export default function Paket() {
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";

  // --- STATE DATA ---
  const [normalMenus, setNormalMenus] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [bundleItems, setBundleItems] = useState<{ menu_id: number; name: string; quantity: number; price: number; hpp: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Ambil Menu Master (Ambil Kolom HPP yang sudah dihitung di MenuMaster/HPP Calculator)
    const { data: menus } = await supabase
      .from("menus")
      .select("id, name, price, hpp, category")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    if (menus) setNormalMenus(menus);

    // 2. Ambil Daftar Paket Aktif (Urutkan Berdasarkan ID agar stabil)
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false });

    // 3. Ambil Isi Paket dengan Join ke Tabel Menus untuk Nama & HPP
    if (pkgs && pkgs.length > 0) {
      const { data: items } = await supabase
        .from("package_items")
        .select(`
          *,
          menus!package_items_menu_id_fkey (
            name,
            hpp,
            price
          )
        `)
        .eq("tenant_id", tenantId);

      const packagesWithItems = pkgs.map(p => ({
        ...p,
        items: items?.filter(i => i.package_id === p.id) || []
      }));
      setPackages(packagesWithItems);
    } else {
      setPackages([]);
    }
  };

  // --- LOGIKA PERAKITAN ---
  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      // Menarik HPP dari Master Menu (Contoh: Rp 3.024 dari RESIP_SYNC)
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

  // --- KALKULASI PINTAR (Sync dengan HPP & Inventory) ---
  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  
  // Saran: Margin 40% (Target Resep) atau Diskon 15% dari Normal
  const suggestedPrice = totalHPP > 0 
    ? Math.max(totalHPP * 1.4, totalNormalPrice * 0.85) 
    : totalNormalPrice * 0.85;

  const handleSavePackage = async (e: any) => {
    e.preventDefault();
    if (!packageName || !packagePrice || bundleItems.length === 0) {
      alert("Lengkapi data paket sebelum simpan!");
      return;
    }
    setLoading(true);

    try {
      // Simpan ke tabel menus sebagai kategori PAKET
      const { data: newMenu, error: menuErr } = await supabase.from("menus").insert({
        tenant_id: tenantId,
        name: packageName,
        price: Number(packagePrice),
        hpp: totalHPP, // Simpan total HPP Gabungan
        category: "PAKET",
      }).select().single();

      if (menuErr) throw menuErr;

      // Simpan detail isi paket ke package_items
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
      fetchData();
      alert("Paket Bundling Berhasil Diterbitkan!");
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus paket ini?")) return;
    try {
      const { error } = await supabase.from("menus").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Error menghapus: " + err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30"><Package size={32} /></div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic">PAKET BUNDLING SYNC</h1>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mt-1 italic">HPP & Inventory Integrated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL RAKIT (KIRI) */}
        <div className="bg-white p-6 rounded-3xl shadow-2xl border border-gray-200">
          <h2 className="text-xl font-black text-gray-900 mb-6 italic flex items-center gap-2"><Plus className="text-blue-600"/> RAKIT BARU</h2>
          
          <form onSubmit={handleSavePackage} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 tracking-widest mb-2 block uppercase">Nama Promo Paket</label>
              <input type="text" value={packageName} onChange={e => setPackageName(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300" placeholder="CONTOH: PAKET HEMAT RAMADAN" required />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase">1. Pilih Menu Dari Master :</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-100">
                {normalMenus.map(menu => (
                  <button type="button" key={menu.id} onClick={() => addMenuToBundle(menu)} className="p-3 bg-white border border-gray-200 rounded-xl text-[11px] font-black text-gray-800 hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center group shadow-sm">
                    <span className="truncate">{menu.name}</span>
                    <Plus size={14} className="text-blue-500 group-hover:scale-125 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* STRUKTUR BUNDLING */}
            <div className="bg-[#0f172a] p-5 rounded-2xl space-y-3 shadow-inner">
               <p className="text-[10px] font-black text-blue-400 tracking-widest border-b border-white/5 pb-2 uppercase text-center">Isi Bundling Saat Ini</p>
               {bundleItems.length === 0 ? (
                 <p className="text-[11px] text-gray-500 font-bold italic py-4 text-center">Silakan pilih menu di atas...</p>
               ) : (
                 bundleItems.map(item => (
                   <div key={item.menu_id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{item.quantity}X {item.name}</span>
                        <span className="text-[9px] font-bold text-gray-500 font-mono italic">HPP: Rp {item.hpp.toLocaleString()}</span>
                      </div>
                      <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-400 hover:bg-red-400/20 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                   </div>
                 ))
               )}
            </div>

            {/* ANALISA HARGA */}
            {bundleItems.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-2xl animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-end mb-4">
                   <div>
                      <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase">Total Modal (HPP)</p>
                      <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">Rp {totalHPP.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Harga Normal</p>
                      <p className="text-sm font-black text-gray-400 line-through">Rp {totalNormalPrice.toLocaleString()}</p>
                   </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-emerald-200 mb-4 shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <p className="text-[10px] font-black text-gray-800 uppercase">Saran Jual:</p>
                   </div>
                   <p className="text-lg font-black text-emerald-700 font-mono tracking-tighter">Rp {Math.round(suggestedPrice).toLocaleString()}</p>
                </div>

                <label className="text-[10px] font-black text-emerald-800 tracking-widest mb-2 block uppercase">Input Harga Final :</label>
                <input type="number" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} className="w-full p-4 bg-white border-2 border-emerald-400 rounded-2xl font-black text-gray-900 text-xl focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-300 font-mono" placeholder="MASUKKAN HARGA" />
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 italic">
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> SIMPAN & TERBITKAN PAKET</>}
            </button>
          </form>
        </div>

        {/* PREVIEW DAFTAR PAKET (KANAN) */}
        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl h-[80vh] overflow-y-auto backdrop-blur-md">
           <h2 className="text-xl font-black text-white italic mb-6 border-b border-white/5 pb-4 uppercase">Paket Aktif ({packages.length})</h2>
           <div className="grid gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl p-5 shadow-xl border border-gray-100 group relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-gray-900 uppercase italic leading-none text-sm">{pkg.name}</h3>
                      <p className="text-blue-600 font-black text-lg mt-1 font-mono tracking-tighter">Rp {Number(pkg.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-3">Manifes Isi Bundling :</p>
                    {pkg.items?.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px] font-bold text-gray-800 mb-1 border-b border-gray-100 pb-1 last:border-0">
                        <span>{i.quantity}X {i.menus?.name}</span>
                        <span className="text-gray-400 font-mono text-[9px]">HPP: {((i.menus?.hpp || 0) * i.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 flex justify-between items-center bg-blue-50 p-2 rounded-lg">
                       <span className="text-[9px] font-black text-blue-700 uppercase">Total HPP Gabungan :</span>
                       <span className="text-xs font-black text-blue-700 font-mono">Rp {pkg.hpp?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}