import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Calculator, Trash2, DollarSign, Percent, ArrowRight, Save } from "lucide-react";

export default function HPPCalculator() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ id: string; qty: number; unit_price: number; name: string }[]>([]);
  
  // State Perhitungan
  const [marginPercent, setMarginPercent] = useState<number>(50); // Default target untung 50%
  const [overheadCost, setOverheadCost] = useState<number>(0); 
  const [menuName, setMenuName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Kunci Master Multi-Tenant
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchInventory();
  }, [tenantId]);

  const fetchInventory = async () => {
    // 🔥 Hanya ambil bahan baku milik outlet yang sedang login
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

    // Mengambil cost_price (modal dasar satuan)
    const unitPrice = item.cost_price || item.price || 0; 

    setSelectedItems([...selectedItems, { 
      id: item.id, 
      name: item.item_name || item.name, 
      qty: 1, 
      unit_price: unitPrice 
    }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateQty = (index: number, newQty: number) => {
    const newItems = [...selectedItems];
    newItems[index].qty = newQty;
    setSelectedItems(newItems);
  };

  const updateUnitPrice = (index: number, newPrice: number) => {
    const newItems = [...selectedItems];
    newItems[index].unit_price = newPrice;
    setSelectedItems(newItems);
  };

  // --- LOGIKA PERHITUNGAN HPP ---
  const totalRawMaterialCost = selectedItems.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
  const totalHPP = totalRawMaterialCost + overheadCost;
  
  // Rumus Harga Jual = HPP / (1 - Margin%)
  const marginDecimal = marginPercent / 100;
  const suggestedPrice = marginDecimal >= 1 ? totalHPP * 2 : totalHPP / (1 - marginDecimal); 
  const potentialProfit = suggestedPrice - totalHPP;

  const handleSaveToMenu = async () => {
    if (!menuName || selectedItems.length === 0 || !tenantId) {
      return alert("Masukkan Nama Menu dan minimal 1 bahan baku!");
    }

    if (!confirm(`Simpan "${menuName.toUpperCase()}" ke Menu Master dengan harga jual Rp ${Math.round(suggestedPrice).toLocaleString('id-ID')}?`)) return;

    setIsSaving(true);
    try {
      // 1. Simpan ke tabel menus
      const { data: newMenu, error: menuErr } = await supabase
        .from("menus")
        .insert([{
          tenant_id: tenantId,
          name: menuName.toUpperCase(),
          price: Math.round(suggestedPrice / 1000) * 1000, // Pembulatan ke ribuan terdekat
          category: "NEW MENU",
          is_available: true
        }])
        .select().single();

      if (menuErr) throw menuErr;

      // 2. Simpan resepnya ke tabel recipes (untuk memotong stok otomatis nanti)
      const recipeData = selectedItems.map(item => ({
        tenant_id: tenantId,
        menu_id: newMenu.id,
        inventory_id: Number(item.id),
        qty_needed: item.qty
      }));

      const { error: recipeErr } = await supabase.from("recipes").insert(recipeData);
      if (recipeErr) throw recipeErr;

      alert("🎉 Menu & Resep berhasil disimpan ke Database!");
      setMenuName("");
      setSelectedItems([]);
      setOverheadCost(0);
    } catch (error: any) {
      alert("Gagal menyimpan: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 bg-[#020617] min-h-full text-white font-sans animate-in fade-in duration-500 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-600/20 text-emerald-500 rounded-2xl border border-emerald-500/30">
              <Calculator size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase">Cost <span className="text-emerald-500">Calculator</span></h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Simulasi Harga Pokok Penjualan (HPP)</p>
            </div>
          </div>
          
          {/* Input Nama Menu untuk Disimpan */}
          <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-2xl border border-white/10 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="NAMA MENU BARU..."
              className="bg-transparent border-none outline-none text-xs font-black uppercase px-3 w-full md:w-48 placeholder:text-gray-600"
              value={menuName}
              onChange={e => setMenuName(e.target.value)}
            />
            <button 
              onClick={handleSaveToMenu}
              disabled={isSaving || selectedItems.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-3 rounded-xl font-black text-[9px] uppercase flex items-center gap-2 transition-all active:scale-95"
            >
              {isSaving ? "Menyimpan..." : <><Save size={14}/> Publish</>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI: INPUT BAHAN BAKU */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">1. Komponen Resep (Bahan Baku)</h2>
              
              <div className="space-y-4 mb-6 relative z-10">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center bg-black/40 p-4 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                    <div className="flex-1 w-full">
                      <p className="text-xs font-black uppercase text-blue-400 mb-3 ml-1">{item.name}</p>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <label className="text-[8px] font-bold text-gray-500 absolute -top-2 left-3 bg-[#0a0f1c] px-1 uppercase tracking-widest">Takaran (Qty)</label>
                          <input 
                            type="number" 
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                            value={item.qty}
                            onChange={(e) => updateQty(idx, Number(e.target.value))}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <label className="text-[8px] font-bold text-gray-500 absolute -top-2 left-3 bg-[#0a0f1c] px-1 uppercase tracking-widest">Modal Satuan (Rp)</label>
                          <input 
                            type="number" 
                            className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                            value={item.unit_price}
                            onChange={(e) => updateUnitPrice(idx, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-28 pl-2 sm:border-l border-white/10">
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] text-gray-500 mb-1 uppercase tracking-widest">Subtotal</p>
                        <p className="font-mono text-sm font-bold text-white">{(item.qty * item.unit_price).toLocaleString('id-ID')}</p>
                      </div>
                      <button onClick={() => removeItem(idx)} className="mt-2 p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tambah Bahan */}
              <select 
                className="w-full bg-blue-600/5 border-2 border-dashed border-blue-500/30 p-4 rounded-2xl text-xs font-black text-blue-400 outline-none focus:border-blue-500 transition-all uppercase appearance-none text-center cursor-pointer hover:bg-blue-600/10"
                onChange={(e) => {
                  addItem(e.target.value);
                  e.target.value = ""; 
                }}
              >
                <option value="">+ KLIK UNTUK TAMBAH BAHAN DARI INVENTORY</option>
                {inventory.map(inv => (
                  <option key={inv.id} value={inv.id} className="bg-[#020617] text-white">
                    {inv.item_name || inv.name} (Stok: {inv.stock} | Rp {inv.cost_price || 0})
                  </option>
                ))}
              </select>
            </div>
            
            {/* INPUT OVERHEAD */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1 w-full text-center sm:text-left">
                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">2. Biaya Overhead (Opsional)</h2>
                <p className="text-[9px] text-gray-500 leading-relaxed">Masukkan estimasi biaya <i>packaging</i>, listrik, atau tenaga kerja per 1 porsi menu ini.</p>
              </div>
              <div className="relative w-full sm:w-1/3">
                <DollarSign className="absolute left-4 top-4 text-gray-500" size={16} />
                <input 
                  type="number"
                  className="w-full bg-black/50 border border-white/10 pl-12 p-4 rounded-2xl text-sm font-black outline-none focus:border-orange-500 text-orange-400 transition-all"
                  value={overheadCost || ""}
                  onChange={(e) => setOverheadCost(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: HASIL KALKULATOR */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-emerald-900/40 to-[#020617] border border-emerald-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>
              
              <h2 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 border-b border-emerald-500/20 pb-4">Ringkasan HPP</h2>
              
              <div className="space-y-5 mb-8 border-b border-white/10 pb-8">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bahan Baku</span>
                  <span className="font-mono text-sm">Rp {totalRawMaterialCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Overhead</span>
                  <span className="font-mono text-sm text-orange-400">+ Rp {overheadCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/5">
                  <span className="text-xs text-white font-black uppercase tracking-widest">TOTAL MODAL</span>
                  <span className="font-mono text-xl font-black text-red-400">Rp {totalHPP.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">3. Target Margin Kotor</h2>
              <div className="relative mb-8">
                <Percent className="absolute left-4 top-4 text-gray-500" size={16} />
                <input 
                  type="number"
                  className="w-full bg-black/50 border border-white/10 pl-12 p-4 rounded-2xl text-sm font-black outline-none focus:border-blue-500 text-blue-400 transition-all"
                  value={marginPercent || ""}
                  onChange={(e) => setMarginPercent(Number(e.target.value))}
                  placeholder="50"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3">HARGA JUAL IDEAL</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-gray-400 font-black italic">Rp</span>
                  <p className="text-5xl font-black italic text-white tracking-tighter">
                    {Math.round(suggestedPrice).toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="inline-flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                  <ArrowRight size={14} className="text-emerald-500" />
                  <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Potensi Untung:</span>
                  <span className="text-[11px] text-emerald-400 font-black font-mono">+Rp {Math.round(potentialProfit).toLocaleString('id-ID')}</span>
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}