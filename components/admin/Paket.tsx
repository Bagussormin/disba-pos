import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Search, Calculator, TrendingUp, Info } from "lucide-react";

export default function Paket() {
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";

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
    // 1. AMBIL MENU MASTER + HPP (Ini Koneksinya!)
    // Sesuai gambar RESIP_SYNC Kapten, kita tarik data menu tunggal beserta HPP-nya.
    // Pastikan laci kolom 'hpp' di tabel 'menus' Supabase Kapten sudah terisi angka kalkulasinya.
    const { data: menus } = await supabase
      .from("menus")
      .select("id, name, price, hpp, category") // Tarik kolom HPP secara spesifik
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    if (menus) setNormalMenus(menus);

    // 2. Ambil Daftar Paket yang sudah ada
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false });
    
    // 3. Ambil isi dari masing-masing paket
    if (pkgs && pkgs.length > 0) {
      // Kita lakukan join ke tabel menus untuk mendapatkan HPP sinkronisasi terbaru
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

  // --- LOGIKA PERAKITAN PAKET ---
  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      // 🔥 DI SINI KONEKSINYA: Kita mengambil data menu.hpp dari database Menu Master
      // Angka Rp 3.024 tadi ditarik masuk ke sini.
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

  // --- LOGIKA KALKULATOR HPP & SARAN HARGA (Sinkron dengan Inventory) ---
  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Total modal HPP sekarang akurat hasil penjumlahan modal item tunggal
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  
  // Rumus: Margin Profit 40% (Seperti di RESIP_SYNC) atau Diskon 15% dari Harga Normal
  const targetProfitMargin = 1.4; // Target 40%
  const suggestedPrice = totalHPP > 0 
    ? Math.max(totalHPP * targetProfitMargin, totalNormalPrice * 0.85) 
    : totalNormalPrice * 0.85;

  const handleSavePackage = async (e: any) => {
    e.preventDefault();
    if (!packageName || !packagePrice || bundleItems.length === 0) {
      alert("Lengkapi data paket sebelum simpan!");
      return;
    }

    if (totalHPP > 0 && Number(packagePrice) < totalHPP) {
      if(!window.confirm("PERINGATAN: Harga jual paket di bawah Total Modal (HPP)! Outlet akan rugi. Tetap lanjutkan?")) {
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Simpan Paket ke tabel Menus
      // Kita juga menyimpan total HPP gabungan di sini agar sinkron di Menu Master
      const { data: newMenu, error: menuErr } = await supabase.from("menus").insert({
        tenant_id: tenantId,
        name: packageName,
        price: Number(packagePrice),
        hpp: totalHPP, // Simpan total HPP Gabungan
        category: "PAKET",
      }).select().single();

      if (menuErr) throw menuErr;

      // 2. Simpan isi paket ke package_items
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
      alert("Paket Berhasil Diterbitkan & Terhubung ke HPP!");
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER PREMIUM */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-white font-black italic">
        <div className="p-4 bg-purple-600/20 text-purple-400 rounded-2xl border border-purple-500/30">
          <Package size={32} />
        </div>
        <div>
          <h1 className="text-3xl tracking-tighter uppercase">PAKET BUNDLING SYNC</h1>
          <p className="text-[10px] text-purple-400 tracking-[0.4em] font-bold not-italic">HPP & INVENTORY INTEGRATED</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KIRI: PANEL RAKIT (Warna Font Hitam) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-2xl space-y-6">
          <div className="flex justify-between items-center text-gray-900 border-b pb-4">
             <h2 className="font-black mb-0 flex items-center gap-2 uppercase tracking-tighter"><Plus className="text-purple-600"/> Rakit Paket</h2>
             <span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-400 tracking-widest uppercase">Outlet: {tenantId}</span>
          </div>

          <form onSubmit={handleSavePackage} className="space-y-6">
            <input 
              type="text" 
              placeholder="NAMA PAKET (MISAL: RAMADAN HEMAT BER-4)" 
              value={packageName} 
              onChange={e => setPackageName(e.target.value)} 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 placeholder:text-gray-300 focus:border-purple-500 outline-none transition-all uppercase italic"
            />
            
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 tracking-widest block uppercase">1. Pilih Amunisi Dari Master :</label>
               <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-100">
                {normalMenus.map(menu => (
                  <button type="button" key={menu.id} onClick={() => addMenuToBundle(menu)} className="p-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-800 hover:border-purple-500 hover:bg-purple-50 transition-all flex justify-between items-center group shadow-sm">
                    <span className="truncate pr-group-hover:pr-0">{menu.name}</span>
                    <Plus size={14} className="text-purple-500 group-hover:scale-125 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* KOMPOSISI BUNDLING */}
            <div className="bg-[#1e1b4b] p-5 rounded-3xl space-y-3 shadow-inner relative overflow-hidden">
               <p className="text-[9px] font-black text-purple-400 tracking-widest text-center border-b border-white/5 pb-2 uppercase relative z-10">Struktur Bundling</p>
               {bundleItems.length === 0 ? (
                 <p className="text-[10px] text-gray-500 font-bold italic py-6 text-center relative z-10">Belum ada item terpilih...</p>
               ) : (
                 bundleItems.map(item => (
                   <div key={item.menu_id} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 relative z-10">
                      <div>
                        <p className="text-xs font-black text-white uppercase italic">{item.quantity}X {item.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 font-mono italic">HPP Unit: Rp {item.hpp.toLocaleString()}</p>
                      </div>
                      <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-400 hover:bg-red-400/20 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                   </div>
                 ))
               )}
            </div>

            {/* 🔥 KALKULATOR SMART HPP */}
            {bundleItems.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl space-y-4 text-emerald-950 animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-end border-b border-emerald-100 pb-4">
                   <div>
                      <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase mb-1">Total Modal Gabungan (HPP)</p>
                      <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">Rp {totalHPP.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Harga Normal</p>
                      <p className="text-sm font-black text-gray-400 line-through italic">Rp {totalNormalPrice.toLocaleString()}</p>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-2xl flex items-center justify-between border border-emerald-200">
                   <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <p className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Saran Harga Jual (Margin 40%) :</p>
                   </div>
                   <p className="text-lg font-black text-emerald-700 font-mono italic tracking-tight">Rp {Math.round(suggestedPrice).toLocaleString()}</p>
                </div>

                <div>
                   <label className="text-[10px] font-black text-emerald-800 tracking-widest mb-2 block uppercase ml-1">Tentukan Harga Jual Final :</label>
                   <input type="number" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} className="w-full p-4 bg-white border-2 border-emerald-400 rounded-2xl font-black text-gray-900 text-2xl focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-300 font-mono" placeholder="0" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 uppercase tracking-widest italic">
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Simpan & Publish Paket</>}
            </button>
          </form>
        </div>

        {/* KANAN: LIST PAKET AKTIF (Nuansa Gelap) */}
        <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem] h-[80vh] overflow-y-auto backdrop-blur-md">
           <h2 className="text-xl font-black text-white italic mb-6 border-b border-white/5 pb-4 uppercase">Paket Aktif ({packages.length})</h2>
           <div className="grid gap-4">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-2xl group border border-gray-100 text-gray-900">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-gray-900 uppercase italic tracking-tight">{pkg.name}</h3>
                      <p className="text-purple-600 font-black text-xl font-mono tracking-tighter mt-1 italic">Rp {Number(pkg.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                       <Info size={12} className="text-gray-400" />
                       <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase mb-0">Manifes Komposisi & Sinkronisasi HPP :</p>
                    </div>
                    {pkg.items?.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px] font-bold text-gray-700 mb-1 border-b border-gray-100 pb-1 last:border-0 last:pb-0 uppercase">
                        <span>{i.quantity}X {i.menus?.name}</span>
                        {/* Menampilkan total HPP dinamis hasil sync */}
                        <span className="text-gray-400 font-mono text-[9px] truncate ml-3">HPP SYNC: Rp {((i.menus?.hpp || 0) * i.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-3 pt-2 flex justify-between items-center bg-blue-50 p-2 rounded-lg text-blue-900 border border-blue-100">
                       <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Total HPP Bundle :</span>
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