import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Calculator, TrendingUp, Info } from "lucide-react";

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
    // 1. Ambil Menu Master - Kita ambil HPP dan price
    const { data: menus } = await supabase
      .from("menus")
      .select("id, name, price, hpp, category")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    
    if (menus) {
      // DEBUG: Kapten bisa cek di F12 apakah hpp Nasi Goreng ada isinya
      console.log("MASTER_MENUS_DATA:", menus); 
      setNormalMenus(menus);
    }

    // 2. Ambil Daftar Paket
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false });

    if (pkgs && pkgs.length > 0) {
      const { data: items } = await supabase
        .from("package_items")
        .select(`*, menus!package_items_menu_id_fkey ( name, hpp, price )`)
        .eq("tenant_id", tenantId);

      const packagesWithItems = pkgs.map(p => ({
        ...p,
        items: items?.filter(i => i.package_id === p.id) || []
      }));
      setPackages(packagesWithItems);
    }
  };

  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    
    // 🔥 LOGIKA SAKTI: Pastikan hpp diambil, kalau 0 kita coba tebak atau set minimal 1
    // (Banyak sistem F&B menyimpan HPP di kolom 'hpp' atau 'HPP')
    const rawHpp = menu.hpp || menu.HPP || 0;

    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setBundleItems([...bundleItems, { 
        menu_id: menu.id, 
        name: menu.name, 
        quantity: 1, 
        price: menu.price || 0,
        hpp: Number(rawHpp) 
      }]);
    }
  };

  const removeMenuFromBundle = (menuId: number) => {
    setBundleItems(bundleItems.filter(item => item.menu_id !== menuId));
  };

  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  
  const suggestedPrice = totalHPP > 0 
    ? Math.max(totalHPP * 1.4, totalNormalPrice * 0.85) 
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
      setPackageName(""); setPackagePrice(""); setBundleItems([]);
      fetchData();
      alert("PAKET BERHASIL PUBLISH!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (confirm("Hapus paket?")) {
      await supabase.from("menus").delete().eq("id", id);
      fetchData();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-white font-black uppercase italic">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Package size={32} className="text-blue-500" />
        <h1 className="text-2xl">Paket Bundling System</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* KIRI */}
        <div className="bg-white p-6 rounded-3xl text-gray-900 not-italic">
          <h2 className="font-black mb-4">RAKIT PAKET</h2>
          <div className="space-y-4">
            <input type="text" placeholder="NAMA PAKET" value={packageName} onChange={e => setPackageName(e.target.value)} className="w-full p-4 bg-gray-100 rounded-xl font-black" />
            
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-xl">
              {normalMenus.map(menu => (
                <button key={menu.id} onClick={() => addMenuToBundle(menu)} className="p-2 border rounded-lg text-[10px] font-black hover:bg-blue-50">
                  {menu.name} (HPP: {menu.hpp || 0})
                </button>
              ))}
            </div>

            <div className="bg-blue-900 p-4 rounded-xl text-white">
              {bundleItems.map(item => (
                <div key={item.menu_id} className="flex justify-between text-xs mb-1">
                  <span>{item.quantity}X {item.name}</span>
                  <span>HPP: {(item.hpp * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-white/20 mt-2 pt-2 flex justify-between font-black">
                <span>TOTAL HPP:</span>
                <span>Rp {totalHPP.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border-2 border-emerald-200">
               <p className="text-[10px] font-black text-emerald-700">SARAN HARGA: Rp {Math.round(suggestedPrice).toLocaleString()}</p>
               <input type="number" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} className="w-full p-3 mt-2 border-2 border-emerald-400 rounded-xl text-xl font-black" />
            </div>

            <button onClick={handleSavePackage} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "SIMPAN PAKET"}
            </button>
          </div>
        </div>

        {/* KANAN */}
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 h-[80vh] overflow-y-auto">
          <h2 className="mb-4">Daftar Paket ({packages.length})</h2>
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white p-4 rounded-2xl mb-4 text-gray-900 not-italic shadow-xl">
              <div className="flex justify-between font-black text-sm">
                <span className="text-blue-600">{pkg.name}</span>
                <button onClick={() => handleDeletePackage(pkg.id)} className="text-red-400">HAPUS</button>
              </div>
              <p className="font-black text-lg">RP {Number(pkg.price).toLocaleString()}</p>
              <div className="mt-2 pt-2 border-t text-[10px] font-bold text-gray-500">
                TOTAL HPP PAKET: Rp {pkg.hpp?.toLocaleString() || '0'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}