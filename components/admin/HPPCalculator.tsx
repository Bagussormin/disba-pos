import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Calculator, Trash2, Percent, ArrowRight, Save, PieChart, TrendingUp } from "lucide-react";

export default function HPPCalculator() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  
  const [overheadPct, setOverheadPct] = useState<number>(15);
  const [fluctuationPct, setFluctuationPct] = useState<number>(5);
  const [taxPct, setTaxPct] = useState<number>(5);
  const [markupPct, setMarkupPct] = useState<number>(50);
  
  const [menuName, setMenuName] = useState<string>("");
  // 🔥 TAMBAHAN BARU: State untuk Kategori agar menu tidak sembunyi
  const [category, setCategory] = useState<string>("COFFEE"); 
  const [isSaving, setIsSaving] = useState(false);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchInventory();
  }, [tenantId]);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("item_name", { ascending: true });
    
    if (data) setInventory(data);
  };

  const addItem = (invId: string) => {
    if (!invId) return;
    const item = inventory.find(i => i.id == invId);
    if (!item) return;

    let unitPrice = item.cost_price || 0;
    if (unitPrice > 1000) { 
      unitPrice = unitPrice / (item.current_stock || 1);
    }

    setSelectedItems([...selectedItems, { 
      id: item.id, 
      name: item.item_name || item.name, 
      qty: 1, 
      unit_price: Math.round(unitPrice) 
    }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateQty = (index: number, val: string) => {
    const newItems = [...selectedItems];
    newItems[index].qty = parseFloat(val) || 0;
    setSelectedItems(newItems);
  };

  const updateUnitPrice = (index: number, val: string) => {
    const newItems = [...selectedItems];
    newItems[index].unit_price = parseFloat(val) || 0;
    setSelectedItems(newItems);
  };

  const basicCost = selectedItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
  const overheadCost = basicCost * ((overheadPct || 0) / 100);
  const fluctuationCost = basicCost * ((fluctuationPct || 0) / 100);
  const taxCost = basicCost * ((taxPct || 0) / 100);
  const totalModalMenu = basicCost + overheadCost + fluctuationCost + taxCost;
  const keuntungan = totalModalMenu * ((markupPct || 0) / 100);
  const hargaJual = totalModalMenu + keuntungan;
  const proporsiModal = hargaJual > 0 ? (totalModalMenu / hargaJual) * 100 : 0;
  const proporsiUntung = hargaJual > 0 ? (keuntungan / hargaJual) * 100 : 0;

  const handleSaveToMenu = async () => {
    if (!menuName || !category || selectedItems.length === 0 || !tenantId) {
      return alert("Masukkan Kategori, Nama Menu, dan minimal 1 bahan baku!");
    }

    if (!confirm(`Simpan "${menuName.toUpperCase()}" ke Menu Master dengan harga jual Rp ${Math.round(hargaJual).toLocaleString('id-ID')}?`)) return;

    setIsSaving(true);
    try {
      const { data: newMenu, error: menuErr } = await supabase
        .from("menus")
        .insert([{
          tenant_id: tenantId,
          name: menuName.toUpperCase(),
          price: Math.round(hargaJual / 1000) * 1000, 
          category: category.toUpperCase(), // 🔥 MENGGUNAKAN KATEGORI YANG DIKETIK
          is_available: true
        }])
        .select().single();

      if (menuErr) throw menuErr;

      const recipeData = selectedItems.map(item => ({
        tenant_id: tenantId,
        menu_id: newMenu.id,
        inventory_id: item.id,
        qty_needed: item.qty 
      }));

      const { error: recipeErr } = await supabase.from("recipes").insert(recipeData);
      if (recipeErr) throw recipeErr;

      alert("🎉 Menu & Resep berhasil disimpan ke Database!");
      setMenuName("");
      setSelectedItems([]);
    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-[#020617] min-h-full text-white font-sans animate-in fade-in duration-500 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-600/20 text-emerald-500 rounded-2xl border border-emerald-500/30">
              <Calculator size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase">Enterprise <span className="text-emerald-500">Pricing</span></h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sistem Kalkulasi HPP & Margin Lengkap</p>
            </div>
          </div>
          
          {/* 🔥 PANEL INPUT NAMA MENU & KATEGORI (DIPERBARUI) */}
          <div className="flex flex-col md:flex-row items-center gap-2 bg-white/[0.02] p-2 rounded-2xl border border-white/10 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="KATEGORI (Cth: COFFEE)"
              className="bg-transparent border-b md:border-b-0 md:border-r border-white/10 outline-none text-xs font-black uppercase px-3 py-2 w-full md:w-36 placeholder:text-gray-600 focus:text-emerald-400 transition-colors"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="NAMA MENU BARU..."
              className="bg-transparent border-none outline-none text-xs font-black uppercase px-3 py-2 w-full md:w-48 placeholder:text-gray-600 focus:text-blue-400 transition-colors"
              value={menuName}
              onChange={e => setMenuName(e.target.value)}
            />
            <button 
              onClick={handleSaveToMenu}
              disabled={isSaving || selectedItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 w-full md:w-auto mt-2 md:mt-0"
            >
              {isSaving ? "Menyimpan..." : <><Save size={14}/> Publish</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
              <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <PieChart size={14}/> 1. Basic Cost (Bahan Baku)
              </h2>
              <div className="space-y-3 mb-6 relative z-10">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-white mb-2 ml-1">{item.name}</p>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <label className="text-[7px] font-bold text-gray-500 absolute -top-2 left-2 bg-[#0a0f1c] px-1 uppercase tracking-widest">Qty</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-500" value={item.qty === 0 ? "" : item.qty} onChange={(e) => updateQty(idx, e.target.value)} />
                        </div>
                        <div className="flex-1 relative">
                          <label className="text-[7px] font-bold text-gray-500 absolute -top-2 left-2 bg-[#0a0f1c] px-1 uppercase tracking-widest">Rp/Satuan</label>
                          <input type="number" className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-xs font-bold outline-none focus:border-blue-500" value={item.unit_price === 0 ? "" : item.unit_price} onChange={(e) => updateUnitPrice(idx, e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end w-20 border-l border-white/10 pl-2">
                      <p className="text-[8px] text-gray-500 mb-1 uppercase tracking-widest">Subtotal</p>
                      <p className="font-mono text-xs font-bold text-blue-400">{(item.qty * item.unit_price).toLocaleString('id-ID')}</p>
                      <button onClick={() => removeItem(idx)} className="mt-2 text-red-500 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <select 
                className="w-full bg-blue-600/5 border-2 border-dashed border-blue-500/30 p-3 rounded-xl text-[10px] font-black text-blue-400 outline-none focus:border-blue-500 transition-all uppercase appearance-none text-center cursor-pointer hover:bg-blue-600/10"
                onChange={(e) => { addItem(e.target.value); e.target.value = ""; }}
              >
                <option value="">+ KLIK TAMBAH BAHAN BAKU</option>
                {inventory.map(inv => <option key={inv.id} value={inv.id} className="bg-[#020617] text-white">{inv.item_name} (Stok: {inv.current_stock || 0})</option>)}
              </select>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
               <h2 className="text-[11px] font-black text-orange-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <TrendingUp size={14}/> 2. Komponen Over Cost (%)
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="relative">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Overhead Ops</label>
                  <Percent className="absolute right-3 top-7 text-gray-500" size={12} />
                  <input type="number" className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm font-black text-orange-400 outline-none focus:border-orange-500" value={overheadPct === 0 ? "" : overheadPct} onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="relative">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Risiko Pasar</label>
                  <Percent className="absolute right-3 top-7 text-gray-500" size={12} />
                  <input type="number" className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm font-black text-orange-400 outline-none focus:border-orange-500" value={fluctuationPct === 0 ? "" : fluctuationPct} onChange={(e) => setFluctuationPct(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="relative">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Pajak Usaha</label>
                  <Percent className="absolute right-3 top-7 text-gray-500" size={12} />
                  <input type="number" className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm font-black text-orange-400 outline-none focus:border-orange-500" value={taxPct === 0 ? "" : taxPct} onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-4">Rincian Total Modal</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-bold uppercase tracking-widest">Basic Cost</span>
                  <span className="font-mono font-bold">Rp {Math.round(basicCost).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-orange-400 font-bold uppercase tracking-widest">Overhead ({overheadPct}%)</span>
                  <span className="font-mono text-orange-400">+ Rp {Math.round(overheadCost).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-orange-400 font-bold uppercase tracking-widest">Kenaikan Pasar ({fluctuationPct}%)</span>
                  <span className="font-mono text-orange-400">+ Rp {Math.round(fluctuationCost).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-orange-400 font-bold uppercase tracking-widest">Pajak Usaha ({taxPct}%)</span>
                  <span className="font-mono text-orange-400">+ Rp {Math.round(taxCost).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/10">
                  <span className="text-xs text-white font-black uppercase tracking-widest">TOTAL MODAL MENU</span>
                  <span className="font-mono text-lg font-black text-red-400">Rp {Math.round(totalModalMenu).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                 <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Target Markup Keuntungan</h2>
                 <div className="relative">
                  <Percent className="absolute left-4 top-4 text-emerald-500" size={14} />
                  <input type="number" className="w-full bg-emerald-500/10 border border-emerald-500/20 pl-10 p-3 rounded-xl text-lg font-black outline-none focus:border-emerald-500 text-emerald-400 transition-all" value={markupPct === 0 ? "" : markupPct} onChange={(e) => setMarkupPct(parseFloat(e.target.value) || 0)} placeholder="50" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/40 to-black/60 border border-blue-500/30 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
              <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-5 border-b border-blue-500/30 pb-3">KESIMPULAN FINAL</h2>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-blue-600/20 p-3 rounded-xl border border-blue-500/30">
                  <div>
                    <p className="text-[9px] text-blue-300 font-black tracking-widest uppercase mb-1">Harga Jual</p>
                    <p className="text-xl font-black font-mono text-white">Rp {Math.round(hargaJual).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right mt-2 sm:mt-0">
                    <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Presentasi</p>
                    <p className="text-sm font-black text-blue-400">100.0%</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>
                    <p className="text-[9px] text-gray-400 font-black tracking-widest uppercase mb-1">Modal Menu</p>
                    <p className="text-lg font-black font-mono text-red-400">Rp {Math.round(totalModalMenu).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right mt-2 sm:mt-0">
                    <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Presentasi</p>
                    <p className="text-sm font-black text-red-400">{proporsiModal.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-emerald-900/20 p-3 rounded-xl border border-emerald-500/20">
                  <div>
                    <p className="text-[9px] text-emerald-600 font-black tracking-widest uppercase mb-1">Keuntungan</p>
                    <p className="text-lg font-black font-mono text-emerald-400">Rp {Math.round(keuntungan).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right mt-2 sm:mt-0">
                    <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Presentasi</p>
                    <p className="text-sm font-black text-emerald-400">{proporsiUntung.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}