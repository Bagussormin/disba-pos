import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Calculator, TrendingUp, Info, AlertCircle } from "lucide-react";

export default function Paket() {
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";

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
    // 1. Tarik Menu Master (Paksa ambil kolom hpp/HPP)
    const { data: menus, error } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });

    if (menus) {
      console.log("DEBUG_HPP_CHECK:", menus); // Cek di Console F12 browser
      setNormalMenus(menus);
    }

    // 2. Tarik Daftar Paket
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false });

    if (pkgs && pkgs.length > 0) {
      // 3. Tarik Isi Paket & Join ke Master Menu untuk ambil HPP & Nama
      const { data: items } = await supabase
        .from("package_items")
        .select(`
          *,
          menus!package_items_menu_id_fkey (
            name,
            hpp,
            HPP,
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

  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    // Kita handle variasi nama kolom hpp (huruf kecil) atau HPP (huruf besar)
    const hppValue = menu.hpp || menu.HPP || 0;

    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setBundleItems([...bundleItems, { 
        menu_id: menu.id, 
        name: menu.name, 
        quantity: 1, 
        price: menu.price || 0,
        hpp: hppValue
      }]);
    }
  };

  const removeMenuFromBundle = (menuId: number) => {
    setBundleItems(bundleItems.filter(item => item.menu_id !== menuId));
  };

  // --- LOGIKA KALKULATOR ---
  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  
  // Standar: Diskon 15% dari Harga Normal, tapi pastikan untung (Margin 40% dari HPP)
  const marginTarget = 1.4; // Sesuai Target 40% di RESIP_SYNC
  const suggestedPrice = totalHPP > 0 
    ? Math.max(totalHPP * marginTarget, totalNormalPrice * 0.85) 
    : totalNormalPrice * 0.85;

  const handleSavePackage = async (e: any) => {
    e.preventDefault();
    if (!packageName || !packagePrice || bundleItems.length === 0) return;
    setLoading(true);

    try {
      const { data: newMenu, error: menuErr } = await supabase.from("menus").insert({
        tenant_id: tenantId,
        name: packageName,
        price: Number(packagePrice),
        hpp: totalHPP,
        category: "PAKET",
      }).select().single();

      if (menuErr) throw menuErr;

      const insertItems = bundleItems.map(item => ({
        tenant_id: tenantId,
        package_id: newMenu.id,
        menu_id: item.menu_id,
        quantity: item.quantity
      }));

      await supabase.from("package_items").insert(insertItems);

      setPackageName("");
      setPackagePrice("");
      setBundleItems([]);
      fetchData();
      alert("🔥 PAKET BERHASIL DITERBITKAN!");
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Hapus paket ini selamanya?")) return;
    await supabase.from("menus").delete().eq("id", id).eq("tenant_id", tenantId);
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER PREMIUM */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-white font-black italic">
        <div className="p-4 bg-purple-600/20 text-purple-400 rounded-2xl border border-purple-500/30">
          <Package size={32} />
        </div>
        <div>
          <h1 className="text-3xl tracking-tighter uppercase">Paket Bundling System</h1>
          <p className="text-[10px] text-purple-400 tracking-[0.4em] font-bold not-italic">INTEGRATED HPP & MASTER INVENTORY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* KIRI: BUILDER */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-2xl space-y-6">
          <div className="flex justify-between items-center text-gray-900 border-b pb-4">
             <h2 className="font-black italic flex items-center gap-2 uppercase tracking-tighter"><Plus className="text-purple-600"/> Rakit Promo</h2>
             <span className="text-[9px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-400 uppercase tracking-widest">{tenantId}</span>
          </div>

          <form onSubmit={handleSavePackage} className="space-y-6">
            <input 
              type="text" 
              placeholder="NAMA PAKET (MISAL: PAKET KENYANG)" 
              value={packageName} 
              onChange={e => setPackageName(e.target.value)} 
              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-gray-900 placeholder:text-gray-300 focus:border-purple-500 outline-none transition-all uppercase italic"
            />
            
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 tracking-widest ml-2 uppercase">1. Pilih Amunisi Dari Master :</label>
               <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-100">
                {normalMenus.map(menu => (
                  <button 
                    type="button" 
                    key={menu.id} 
                    onClick={() => addMenuToBundle(menu)} 
                    className="p-3 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-800 hover:border-purple-500 hover:bg-purple-50 transition-all flex justify-between items-center group shadow-sm"
                  >
                    <span className="truncate pr-2">{menu.name}</span>
                    <Plus size={14} className="text-purple-500 group-hover:rotate-90 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* KERANJANG RAKITAN */}
            <div className="bg-[#1e1b4b] p-5 rounded-3xl space-y-3 shadow-inner">
               <p className="text-[9px] font-black text-purple-400 tracking-widest text-center border-b border-white/5 pb-2 uppercase">Komposisi Bundling</p>
               {bundleItems.length === 0 ? (
                 <p className="text-[10px] text-gray-500 font-bold italic py-6 text-center">Keranjang masih kosong...</p>
               ) : (
                 bundleItems.map(item => (
                   <div key={item.menu_id} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                      <div>
                        <p className="text-xs font-black text-white uppercase italic">{item.quantity}X {item.name}</p>
                        <p className="text-[9px] font-bold text-gray-500 font-mono">HPP UNIT: Rp {item.hpp.toLocaleString()}</p>
                      </div>
                      <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-400 hover:bg-red-400/20 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                   </div>
                 ))
               )}
            </div>

            {/* KALKULATOR PINTAR */}
            {bundleItems.length > 0 && (
              <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-end border-b border-emerald-100 pb-4">
                   <div>
                      <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase mb-1">Total Modal (HPP)</p>
                      <p className="text-2xl font-black text-emerald-600 font-mono">Rp {totalHPP.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Harga Normal</p>
                      <p className="text-sm font-black text-gray-400 line-through italic">Rp {totalNormalPrice.toLocaleString()}</p>
                   </div>
                </div>

                <div className="bg-white p-4 rounded-2xl flex items-center justify-between border border-emerald-200">
                   <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <p className="text-[10px] font-black text-gray-800">SARAN HARGA JUAL :</p>
                   </div>
                   <p className="text-lg font-black text-emerald-700 font-mono italic">Rp {Math.round(suggestedPrice).toLocaleString()}</p>
                </div>

                <div>
                   <label className="text-[10px] font-black text-emerald-800 tracking-widest mb-2 block ml-1 uppercase">Harga Jual Paket Final :</label>
                   <input 
                     type="number" 
                     value={packagePrice} 
                     onChange={e => setPackagePrice(e.target.value)} 
                     className="w-full p-4 bg-white border-2 border-emerald-400 rounded-2xl font-black text-gray-900 text-2xl font-mono focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder:text-gray-300" 
                     placeholder="0" 
                   />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 uppercase tracking-widest italic">
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={22}/> Simpan & Publish Paket</>}
            </button>
          </form>
        </div>

        {/* KANAN: LIST */}
        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 h-[80vh] overflow-y-auto">
           <h2 className="text-xl font-black text-white italic mb-6 border-b border-white/5 pb-4 uppercase flex items-center gap-2">
              <TrendingUp className="text-purple-500" size={20}/> Paket Aktif ({packages.length})
           </h2>
           <div className="grid gap-5">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-3xl p-6 shadow-2xl group border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-gray-900 uppercase italic text-sm tracking-tighter">{pkg.name}</h3>
                      <p className="text-purple-600 font-black text-xl font-mono tracking-tighter mt-1 italic">Rp {Number(pkg.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"><Trash2 size={20}/></button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200 space-y-3">
                    <p className="text-[9px] font-black text-gray-400 tracking-widest uppercase italic">Struktur Menu & Modal Bahan :</p>
                    {pkg.items?.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[11px] font-bold text-gray-800 border-b border-gray-100 pb-2 last:border-0 uppercase">
                        <span>{i.quantity}X {i.menus?.name}</span>
                        <span className="text-gray-400 font-mono text-[9px]">HPP: {((i.menus?.hpp || i.menus?.HPP || 0) * i.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-3 flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                       <div className="flex items-center gap-2">
                          <Calculator size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black text-emerald-800 uppercase italic">Total HPP Bundle :</span>
                       </div>
                       <span className="text-sm font-black text-emerald-700 font-mono">Rp {pkg.hpp?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {packages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                   <AlertCircle size={48} className="opacity-20 mb-4" />
                   <p className="font-black uppercase tracking-widest text-xs opacity-30">Belum Ada Paket Terdaftar</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}