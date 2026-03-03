import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RecipeManagement() {
  const [menus, setMenus] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  
  // State Input Paket
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState(0);
  const [bundleItems, setBundleItems] = useState<{id: string, qty: number}[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: m } = await supabase.from("menus").select("*").order("name");
    const { data: inv } = await supabase.from("inventory").select("*").order("name");
    setMenus(m || []);
    setInventory(inv || []);
    fetchRecipes();
  };

  const fetchRecipes = async () => {
    const { data } = await supabase.from("recipes").select("*").order('id', { ascending: false });
    setRecipes(data || []);
  };

  // Helper Cari Nama
  const getName = (id: any, type: 'menu' | 'inventory') => {
    if (type === 'menu') {
      const target = menus.find(m => m.id == id);
      return target ? (target.name || target.item_name) : `ID: ${id}`;
    } else {
      const target = inventory.find(i => i.id == id);
      return target ? (target.name || target.item_name) : `ID: ${id}`;
    }
  };

  // Helper Cari Harga Menu
  const getPrice = (id: any) => {
    const target = menus.find(m => m.id == id);
    return target?.price || 0;
  };

  // Bundle Logic
  const addBundleRow = () => setBundleItems([...bundleItems, { id: "", qty: 1 }]);
  const removeBundleRow = (index: number) => setBundleItems(bundleItems.filter((_, i) => i !== index));
  const updateBundleItem = (index: number, field: string, value: any) => {
    const newItems = [...bundleItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBundleItems(newItems);
  };

  const savePackage = async () => {
    if (!packageName || packagePrice <= 0 || bundleItems.length < 1) {
      return alert("Lengkapi nama, harga, dan minimal 1 isi komponen!");
    }
    setLoading(true);

    // 1. Masukkan ke tabel menus dulu
    const { data: newMenu, error: menuErr } = await supabase
      .from("menus")
      .insert([{ name: packageName, price: packagePrice, is_package: true }])
      .select().single();

    if (menuErr) {
      alert("Gagal buat menu: " + menuErr.message);
      setLoading(false);
      return;
    }

    // 2. Mapping isinya ke recipes
    const mappings = bundleItems.map(item => ({
      menu_id: newMenu.id,
      sub_menu_id: Number(item.id),
      qty_needed: item.qty
    }));

    const { error: recipeErr } = await supabase.from("recipes").insert(mappings);

    if (!recipeErr) {
      alert("BOOM! PAKET BERHASIL DIBUAT! 🚀");
      setPackageName("");
      setPackagePrice(0);
      setBundleItems([]);
      fetchData();
    } else {
      alert("Gagal simpan resep: " + recipeErr.message);
    }
    setLoading(false);
  };

  const deleteRecipe = async (id: number) => {
    await supabase.from("recipes").delete().eq("id", id);
    fetchRecipes();
  };

  return (
    <div className="p-6 bg-[#020617] min-h-screen text-white uppercase font-sans">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-black italic mb-8 tracking-tighter">
          BUNDLE <span className="text-blue-500">CREATOR</span>
        </h2>

        {/* INPUT FORM BOX */}
        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] mb-12 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-500 ml-2">NAMA PAKET / MENU BARU</label>
              <input 
                className="bg-white/5 border border-white/10 p-4 rounded-2xl text-[12px] font-black outline-none focus:border-blue-500 transition-all"
                placeholder="MISAL: PAKET AYAM KOMPLIT"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-500 ml-2">HARGA JUAL (RP)</label>
              <input 
                type="number"
                className="bg-white/5 border border-white/10 p-4 rounded-2xl text-[12px] font-black outline-none focus:border-blue-500 text-green-400"
                placeholder="0"
                value={packagePrice || ""}
                onChange={(e) => setPackagePrice(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <label className="text-[10px] font-black text-blue-500 ml-2">ISI KOMPONEN PAKET</label>
            {bundleItems.map((item, index) => (
              <div key={index} className="flex gap-4 items-center animate-in fade-in slide-in-from-left-2">
                <select 
                  className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] font-black outline-none focus:border-blue-500"
                  value={item.id}
                  onChange={(e) => updateBundleItem(index, 'id', e.target.value)}
                >
                  <option value="">-- PILIH ISI --</option>
                  {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input 
                  type="number"
                  className="w-20 bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] font-black outline-none text-center"
                  value={item.qty}
                  onChange={(e) => updateBundleItem(index, 'qty', Number(e.target.value))}
                />
                <button 
                  onClick={() => removeBundleRow(index)}
                  className="bg-red-500/10 text-red-500 p-4 rounded-2xl font-black text-[10px] hover:bg-red-500 hover:text-white transition-all"
                >
                  X
                </button>
              </div>
            ))}
            <button 
              onClick={addBundleRow}
              className="w-full border-2 border-dashed border-white/10 p-4 rounded-2xl text-[10px] font-black text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-all"
            >
              + TAMBAH ISI PAKET
            </button>
          </div>

          <button 
            onClick={savePackage}
            disabled={loading}
            className="w-full bg-blue-600 p-5 rounded-[1.5rem] font-black text-[12px] shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            {loading ? "PROCESSING..." : "SIMPAN & PUBLISH PAKET"}
          </button>
        </div>

        {/* GROUPED TABLE DENGAN HARGA */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[9px] font-black text-gray-500 italic uppercase border-b border-white/5">
              <tr>
                <th className="p-7 w-1/3">INFO PAKET & HARGA</th>
                <th className="p-7">KOMPONEN ISI</th>
                <th className="p-7 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="text-[11px] font-bold italic">
              {Array.from(new Set(recipes.map(r => r.menu_id))).map(menuId => {
                const packageItems = recipes.filter(r => r.menu_id === menuId);
                const menuName = getName(menuId, 'menu');
                const price = getPrice(menuId);

                return (
                  <tr key={menuId} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-all">
                    <td className="p-7 align-top">
                      <div className="text-blue-400 text-base font-black tracking-tighter uppercase leading-tight">
                        {menuName}
                      </div>
                      <div className="text-green-500 text-[13px] font-black mt-1">
                        RP {price.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[7px] text-gray-600 mt-2 tracking-widest font-black opacity-50">
                        PID: {menuId}
                      </div>
                    </td>
                    <td className="p-7">
                      <div className="flex flex-col gap-3">
                        {packageItems.map((item) => (
                          <div key={item.id} className="flex flex-col border-l-2 border-blue-500/20 pl-3">
                            <span className="text-[10px] text-gray-200">
                               {item.sub_menu_id ? getName(item.sub_menu_id, 'menu') : getName(item.inventory_id, 'inventory')}
                            </span>
                            <span className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">
                               QTY: {item.qty_needed}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-7 text-right align-top">
                      <button 
                        onClick={() => {
                          if(confirm(`Hapus seluruh isi paket ${menuName}?`)) {
                            packageItems.forEach(item => deleteRecipe(item.id));
                          }
                        }}
                        className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all font-black text-[9px]"
                      >
                        DELETE GROUP
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}