import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Search, Calculator, TrendingUp } from "lucide-react";

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
    // 1. Ambil Menu Normal
    const { data: menus } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    if (menus) setNormalMenus(menus);

    // 2. Ambil Daftar Paket
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("id", { ascending: false });

    // 3. Ambil isi paket dengan join ke tabel menus untuk mendapatkan nama
    if (pkgs && pkgs.length > 0) {
      const { data: items } = await supabase
        .from("package_items")
        .select(`
          *,
          menus!package_items_menu_id_fkey (
            name
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

  const totalNormalPrice = bundleItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalHPP = bundleItems.reduce((acc, item) => acc + (item.hpp * item.quantity), 0);
  const suggestedPrice = totalHPP > 0 ? Math.max(totalHPP * 1.5, totalNormalPrice * 0.85) : totalNormalPrice * 0.85;

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
      alert("Paket Berhasil Diterbitkan!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus paket ini?")) {
      await supabase.from("menus").delete().eq("id", id);
      fetchData();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6 text-white font-black uppercase italic">
         PAKET BUNDLING EXPLORER
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORM KIRI (RAKIT) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl text-gray-900">
          <h2 className="font-black mb-4 flex items-center gap-2"><Plus /> RAKIT BARU</h2>
          <form onSubmit={handleSavePackage} className="space-y-4">
            <input type="text" placeholder="Nama Paket" value={packageName} onChange={e => setPackageName(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-gray-50" />
            
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border bg-gray-50 rounded-xl">
              {normalMenus.map(menu => (
                <button type="button" key={menu.id} onClick={() => addMenuToBundle(menu)} className="p-2 bg-white border rounded-lg text-[10px] font-bold hover:bg-purple-50 transition-all">
                  {menu.name} (+)
                </button>
              ))}
            </div>

            <div className="bg-purple-50 p-4 rounded-xl space-y-2">
              {bundleItems.map(item => (
                <div key={item.menu_id} className="flex justify-between text-xs font-bold">
                  <span>{item.quantity}x {item.name}</span>
                  <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>

            {bundleItems.length > 0 && (
              <div className="bg-emerald-50 p-4 rounded-xl">
                <p className="text-[10px] font-black text-emerald-800">SARAN HARGA: Rp {suggestedPrice.toLocaleString()}</p>
                <input type="number" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} className="w-full p-3 mt-2 border-2 border-emerald-300 rounded-xl font-black text-lg" placeholder="Harga Jual" />
              </div>
            )}

            <button type="submit" className="w-full py-4 bg-purple-600 text-white font-black rounded-xl">
              {loading ? <Loader2 className="animate-spin mx-auto"/> : "SIMPAN & PUBLISH"}
            </button>
          </form>
        </div>

        {/* DAFTAR KANAN */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xl h-[80vh] overflow-y-auto">
          <h2 className="font-black mb-4 text-gray-900 uppercase">Paket Aktif ({packages.length})</h2>
          <div className="space-y-4 text-gray-900">
            {packages.map(pkg => (
              <div key={pkg.id} className="p-4 border rounded-2xl bg-gray-50 border-purple-100 relative">
                <button onClick={() => handleDelete(pkg.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                <h3 className="font-black text-purple-700 uppercase">{pkg.name}</h3>
                <p className="font-black text-sm mb-3">RP {Number(pkg.price).toLocaleString()}</p>
                
                <div className="p-3 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-[9px] font-black text-gray-400 mb-2">ISI PAKET:</p>
                  {pkg.items?.map((i: any, idx: number) => (
                    <p key={idx} className="text-[11px] font-bold text-gray-700">
                      <span className="text-purple-600"> {i.quantity}x</span> {i.menus?.name || 'Menu'}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}