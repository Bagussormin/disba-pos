import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Plus, Package, AlertTriangle, Trash2, X, Cog, 
  ArrowUpCircle, Activity, LayoutGrid, List, Search 
} from "lucide-react";

export default function InventoryApp() {
  const [activeSubMenu, setActiveSubMenu] = useState("DETAIL PRODUK");
  const [items, setItems] = useState<any[]>([]); 
  const [menuList, setMenuList] = useState<any[]>([]); 
  const [recipes, setRecipes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [modalType, setModalType] = useState<"RECIPE" | "STOCK_IN" | "ADD_MATERIAL" | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // 🔥 UPGRADE: Menambahkan `stock` (stok awal) dan `price` (harga modal) ke state
  const [newMaterial, setNewMaterial] = useState({ name: "", unit: "GRAM", stock: "0", min: "10", price: "0" });
  
  const [recipeUsage, setRecipeUsage] = useState("");
  const [selectedInvId, setSelectedInvId] = useState("");
  const [stockAmount, setStockAmount] = useState("");

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => { 
    if (tenantId) loadData(); 
  }, [activeSubMenu, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: menus } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("category");
      const { data: inv } = await supabase.from("inventory").select("*").eq("tenant_id", tenantId).order("item_name");
      const { data: rec } = await supabase.from("recipes").select(`*, inventory:inventory_id (item_name, unit)`).eq("tenant_id", tenantId);
      
      if (menus) setMenuList(menus);
      if (inv) {
        const uniqueItems = inv.reduce((acc: any[], current) => {
          const x = acc.find(item => item.item_name === current.item_name);
          return !x ? acc.concat([current]) : acc;
        }, []);
        setItems(uniqueItems);
      }
      if (rec) setRecipes(rec);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name || !newMaterial.unit || !tenantId) return alert("LENGKAPI DATA NAMA DAN SATUAN!");
    
    // 🔥 UPGRADE: Memasukkan current_stock dan cost_price ke database saat membuat material baru
    const { error } = await supabase.from("inventory").insert([{ 
      item_name: newMaterial.name.toUpperCase(), 
      unit: newMaterial.unit.toUpperCase(), 
      current_stock: parseFloat(newMaterial.stock) || 0,
      min_stock: parseFloat(newMaterial.min) || 10,
      cost_price: parseFloat(newMaterial.price) || 0, // Harga modal dimasukkan ke database
      tenant_id: tenantId
    }]);
    
    if (!error) { 
      setModalType(null); 
      // Reset form
      setNewMaterial({ name: "", unit: "GRAM", stock: "0", min: "10", price: "0" });
      loadData(); 
    } else {
      alert("Gagal menambahkan material: " + error.message);
    }
  };

  const handleStockIn = async () => {
    if (!tenantId) return;
    const amount = parseFloat(stockAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const { error } = await supabase.from("inventory")
      .update({ current_stock: (selectedItem.current_stock || 0) + amount })
      .eq("id", selectedItem.id)
      .eq("tenant_id", tenantId);
      
    if (!error) { setModalType(null); setStockAmount(""); loadData(); }
  };

  const saveRecipe = async () => {
    if (!selectedInvId || !recipeUsage || !tenantId) return;
    
    const { error } = await supabase.from("recipes").insert([{ 
      menu_id: selectedMenu.id, 
      inventory_id: selectedInvId, 
      usage_quantity: parseFloat(recipeUsage),
      tenant_id: tenantId
    }]);
    
    if (!error) { setModalType(null); setRecipeUsage(""); loadData(); }
  };
  
  const deleteInventory = async (id: string) => {
    if(!tenantId) return;
    if(confirm("Hapus resource ini?")) {
      await supabase.from("inventory").delete().eq("id", id).eq("tenant_id", tenantId);
      loadData();
    }
  }

  const filteredItems = items.filter(i => i.item_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const groupedMenu = menuList.reduce((acc: any, menu: any) => {
    const cat = menu.category || "OTHERS";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(menu);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#020617] min-h-screen text-slate-200 font-sans tracking-tight">
      
      {/* HEADER SYSTEM */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter text-white">CENTRAL_INVENTORY_V1</h1>
          <p className="text-[10px] text-slate-500 font-mono">SYSTEM_STATUS: <span className="text-emerald-500">OPERATIONAL</span> | <span className="text-blue-500">{tenantId}</span></p>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {["DETAIL PRODUK", "STOK", "PERGERAKAN"].map((tab) => (
            <button key={tab} onClick={() => setActiveSubMenu(tab)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                activeSubMenu === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-white"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Resource</p>
          <p className="text-xl font-mono font-bold text-white">{items.length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Low Stock Alert</p>
          <p className="text-xl font-mono font-bold text-red-500">{items.filter(i => i.current_stock <= (i.min_stock || 10)).length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Recipes</p>
          <p className="text-xl font-mono font-bold text-blue-500">{recipes.length}</p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-end">
           <button onClick={() => setModalType("ADD_MATERIAL")} disabled={!tenantId} className="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 disabled:opacity-50 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-2 border border-blue-500/30">
             <Plus size={14}/> NEW_ITEM
           </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-mono animate-pulse uppercase">Synchronizing_Neural_Network...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* VIEW: DETAIL PRODUK */}
          {activeSubMenu === "DETAIL PRODUK" && (
            <div className="grid gap-10">
              {Object.keys(groupedMenu).map((category) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-[11px] font-black text-blue-500 tracking-[0.3em] uppercase">{category}</h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {groupedMenu[category].map((menu: any) => {
                      const menuRecipes = recipes.filter(r => r.menu_id === menu.id);
                      return (
                        <div key={menu.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-[11px] font-black text-white italic group-hover:text-blue-400 transition-colors">{menu.name}</h3>
                          </div>
                          <div className="space-y-2 mb-6 min-h-[50px]">
                            {menuRecipes.length > 0 ? menuRecipes.map((r, idx) => (
                              <div key={idx} className="flex justify-between text-[9px] font-mono border-b border-white/5 pb-1">
                                <span className="text-slate-500 truncate">{r.inventory?.item_name}</span>
                                <span className="text-blue-500">-{r.usage_quantity}</span>
                              </div>
                            )) : <p className="text-[8px] text-slate-700 italic">No recipe linked.</p>}
                          </div>
                          <button onClick={() => { setSelectedMenu(menu); setModalType("RECIPE"); }}
                            className="w-full py-2 bg-white/5 hover:bg-blue-600 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2">
                            <Cog size={12}/> Config_Recipe
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16}/>
                <input 
                  type="text" placeholder="SEARCH_INVENTORY..." 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-[11px] font-mono outline-none focus:border-blue-600 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`p-5 rounded-[2rem] border transition-all flex flex-col items-center text-center relative ${
                      item.current_stock <= (item.min_stock || 10) ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/10'
                  }`}>
                    {/* Tampilan Harga Modal di pojok kanan atas */}
                    <div className="absolute top-3 right-3 text-[7px] text-blue-400 font-mono font-bold bg-blue-500/10 px-1 rounded">
                      Rp {item.cost_price || 0}
                    </div>

                    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center mb-4 mt-2">
                      <Package className={item.current_stock <= (item.min_stock || 10) ? 'text-red-500' : 'text-blue-500'} size={20}/>
                    </div>
                    <span className="text-[7px] font-black text-slate-500 italic mb-1 tracking-widest">{item.unit}</span>
                    <h3 className="text-[10px] font-black text-white uppercase mb-4 h-8 flex items-center leading-tight">
                      {item.item_name}
                    </h3>
                    <div className="flex items-center gap-2 mb-6">
                      <p className="text-3xl font-mono font-black text-white">{item.current_stock}</p>
                      {item.current_stock <= (item.min_stock || 10) && <AlertTriangle size={14} className="text-red-500 animate-pulse"/>}
                    </div>
                    <button onClick={() => { setSelectedItem(item); setModalType("STOCK_IN"); }}
                      className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2">
                      <ArrowUpCircle size={12}/> RESTOCK
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: PERGERAKAN */}
          {activeSubMenu === "PERGERAKAN" && (
            <div className="bg-white/5 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-8 py-5">Resource_Detail</th>
                    <th className="px-8 py-5">Volume</th>
                    <th className="px-8 py-5">Cost Price</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-4">
                        <p className="text-[12px] font-black text-white italic tracking-tighter">{item.item_name}</p>
                        <p className="text-[8px] text-slate-600 font-mono">UNIT: {item.unit} | ID: {item.id}</p>
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-lg font-bold">{item.current_stock}</span>
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${item.current_stock <= (item.min_stock || 10) ? 'bg-red-500' : 'bg-blue-600'}`} 
                              style={{ width: `${Math.min((item.current_stock/100)*100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4">
                         <span className="font-mono text-[10px] text-blue-400">Rp {(item.cost_price || 0).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <button onClick={() => deleteInventory(item.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
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
          <div className="bg-[#0b1120] border border-white/10 w-full max-w-[340px] p-8 rounded-[2.5rem] space-y-6 shadow-3xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center border-b border-white/5 pb-4 uppercase">
                <h2 className="text-[13px] font-black italic text-blue-500 tracking-tighter flex items-center gap-2">
                  <Activity size={14}/> {modalType.replace('_', ' ')}
                </h2>
                <button onClick={() => setModalType(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              {/* 🔥 FORM ADD MATERIAL YANG SUDAH DI-UPGRADE */}
              {modalType === "ADD_MATERIAL" && (
                <>
                  <div>
                    <label className="text-[8px] font-bold text-gray-500 tracking-widest uppercase ml-1">Nama Barang</label>
                    <input type="text" placeholder="Misal: Biji Kopi / Susu" onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-white outline-none focus:border-blue-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-bold text-gray-500 tracking-widest uppercase ml-1">Satuan</label>
                      <input type="text" placeholder="GRAM / ML" onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-gray-500 tracking-widest uppercase ml-1">Stok Awal</label>
                      <input type="number" placeholder="Misal: 1000" onChange={(e) => setNewMaterial({...newMaterial, stock: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-bold text-gray-500 tracking-widest uppercase ml-1">Total Harga Beli (Rp)</label>
                    <input type="number" placeholder="Misal: 150000" onChange={(e) => setNewMaterial({...newMaterial, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono outline-none focus:border-blue-500" />
                  </div>
                </>
              )}

              {modalType === "STOCK_IN" && (
                <div className="space-y-4 text-center">
                  <p className="text-[10px] font-black text-slate-500 italic">RESTOCKING: {selectedItem?.item_name}</p>
                  <input type="number" placeholder="00" autoFocus onChange={(e) => setStockAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-4xl font-mono font-black text-blue-500 text-center outline-none" />
                </div>
              )}

              {modalType === "RECIPE" && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase italic">MENU_TARGET: {selectedMenu?.name}</p>
                  <select onChange={(e) => setSelectedInvId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-white outline-none bg-[#0b1120]">
                    <option value="">-- SELECT_RESOURCE --</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.item_name} ({i.unit})</option>)}
                  </select>
                  <input type="number" step="0.01" placeholder="USAGE_QTY (e.g. 1)" onChange={(e) => setRecipeUsage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[11px] font-mono" />
                </div>
              )}

              <button onClick={modalType === "ADD_MATERIAL" ? handleAddMaterial : modalType === "STOCK_IN" ? handleStockIn : saveRecipe}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-[11px] text-white tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all uppercase mt-2">
                Confirm_Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}