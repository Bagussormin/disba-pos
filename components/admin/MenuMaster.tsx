 import React, { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

import {

  Plus, Trash2, Edit2, Image as ImageIcon, X, Loader2,

  Tag, ChefHat, Save, Calculator, DollarSign, TrendingUp, RefreshCcw

} from "lucide-react";


// --- KONFIGURASI FINANSIAL DINAMIS ---

const OVERHEAD_OPS = 0.15;  

const MARKET_INC = 0.05;    

const TAX_RATE = 0.05;      


interface MenuItem {

  id: number | null;

  name: string;

  price: number | string;

  category: string;

  image_url: string;

  tenant_id?: string;

}


interface Category {

  id: number;

  name: string;

  tenant_id?: string;

}


interface RecipeItem {

  inventory_id: string;

  name: string;

  qty_needed: number;

  unit_price: number;

  stock: number;

}


export default function MenuMaster() {

  const [menus, setMenus] = useState<MenuItem[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [inventory, setInventory] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

 

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);


  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;


  const [formData, setFormData] = useState<MenuItem>({

    id: null, name: "", price: "", category: "", image_url: ""

  });


  const [imageFile, setImageFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");


  const [selectedMenuForRecipe, setSelectedMenuForRecipe] = useState<MenuItem | null>(null);

  const [currentRecipeItems, setCurrentRecipeItems] = useState<RecipeItem[]>([]);

  const [targetProfit, setTargetProfit] = useState(40);

  const [manualPrice, setManualPrice] = useState<number>(0);

  const [loadingRecipe, setLoadingRecipe] = useState(false);

  const [savingRecipe, setSavingRecipe] = useState(false);


  useEffect(() => {

    if (tenantId) {

      fetchMenus();

      fetchCategories();

      fetchInventory();

    }

  }, [tenantId]);


  const fetchMenus = async () => {

    setLoading(true);

    const { data } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("category", { ascending: true });

    if (data) setMenus(data);

    setLoading(false);

  };


  const fetchCategories = async () => {

    const { data } = await supabase.from("categories").select("*").eq("tenant_id", tenantId).order("name", { ascending: true });

    if (data) setCategories(data);

  };


  const fetchInventory = async () => {

    const { data } = await supabase.from("inventory").select("*").eq("tenant_id", tenantId).order("item_name", { ascending: true });

    if (data) setInventory(data);

  };


  const handleAddCategory = async () => {

    if (!newCatName || !tenantId) return;

    await supabase.from("categories").insert([{ name: newCatName.toUpperCase(), tenant_id: tenantId }]);

    setNewCatName(""); fetchCategories();

  };


  const deleteCategory = async (id: number) => {

    if (confirm("Hapus kategori ini?")) {

      await supabase.from("categories").delete().eq("id", id).eq("tenant_id", tenantId);

      fetchCategories();

    }

  };


  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setLoading(true);

    let finalImageUrl = formData.image_url;

    if (imageFile) {

      const fileExt = imageFile.name.split('.').pop();

      const fileName = `${tenantId}_${Date.now()}.${fileExt}`;

      await supabase.storage.from('menu-items').upload(fileName, imageFile);

      const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);

      finalImageUrl = data.publicUrl;

    }

    const payload = { name: formData.name.toUpperCase(), price: Number(formData.price), category: formData.category.toUpperCase(), image_url: finalImageUrl, tenant_id: tenantId };

    if (formData.id) await supabase.from("menus").update(payload).eq("id", formData.id).eq("tenant_id", tenantId);

    else await supabase.from("menus").insert([payload]);

    closeModal(); fetchMenus(); setLoading(false);

  };


  const closeModal = () => {

    setIsModalOpen(false); setFormData({ id: null, name: "", price: "", category: "", image_url: "" });

    setImageFile(null); setPreviewUrl(null);

  };


  // --- LOGIKA HITUNG HPP FINAL ---

  const basicCost = currentRecipeItems.reduce((sum, item) => sum + (item.qty_needed * item.unit_price), 0);

  const overCostAmount = basicCost * (OVERHEAD_OPS + MARKET_INC);

  const hppBeforeTax = basicCost + overCostAmount;

  const businessTaxAmount = hppBeforeTax * TAX_RATE;

  const hppFinal = hppBeforeTax + businessTaxAmount;


  const openRecipeManager = async (menu: MenuItem) => {

    setSelectedMenuForRecipe(menu); setLoadingRecipe(true); setIsRecipeModalOpen(true);

    const { data } = await supabase.from("recipes").select("*, inventory(id, item_name, cost_price, current_stock)").eq("menu_id", menu.id).eq("tenant_id", tenantId);

    if (data) {

      const formatted = data.map((r: any) => {

        let up = r.inventory?.cost_price || 0;

        if (up > 1000) up = up / (r.inventory?.current_stock || 1);

        return { inventory_id: r.inventory_id, name: r.inventory?.item_name || "??", qty_needed: r.qty_needed, unit_price: up, stock: r.inventory?.current_stock || 0 };

      });

      setCurrentRecipeItems(formatted);

      setManualPrice(Number(menu.price));

    }

    setLoadingRecipe(false);

  };


  // --- HANDLER HARGA MANUAL & SLIDER SYNC ---

  const handleSliderChange = (val: number) => {

    setTargetProfit(val);

    const price = hppFinal / (1 - (val / 100));

    setManualPrice(Math.round(price));

  };


  const handleManualPriceChange = (val: number) => {

    setManualPrice(val);

    if (val > hppFinal) {

      const margin = ((val - hppFinal) / val) * 100;

      setTargetProfit(Math.round(margin));

    } else {

      setTargetProfit(0);

    }

  };


  const saveRecipeChanges = async () => {

    if (!selectedMenuForRecipe) return;

    setSavingRecipe(true);

   

    try {

      // 1. Update Harga DAN SUNTIKAN HPP di Tabel MENUS (🔥 INI KABELNYA!)

      await supabase.from("menus")

        .update({

          price: manualPrice,

          hpp: Math.round(hppFinal) // <--- SUNTIKAN HPP PERMANEN KE DATABASE

        })

        .eq("id", selectedMenuForRecipe.id)

        .eq("tenant_id", tenantId);


      // 2. Update Resep di Tabel RECIPES

      await supabase.from("recipes").delete().eq("menu_id", selectedMenuForRecipe.id).eq("tenant_id", tenantId);

      const newRecipeData = currentRecipeItems.map(item => ({ tenant_id: tenantId, menu_id: selectedMenuForRecipe.id, inventory_id: item.inventory_id, qty_needed: item.qty_needed }));

      await supabase.from("recipes").insert(newRecipeData);


      alert(`Sukses! Resep tersimpan & Harga ${selectedMenuForRecipe.name} diupdate ke Rp ${manualPrice.toLocaleString()}`);

      setIsRecipeModalOpen(false);

      fetchMenus();

    } catch (e) {

      alert("Terjadi kesalahan saat menyimpan.");

    } finally {

      setSavingRecipe(false);

    }

  };


  return (

    <div className="p-6 space-y-6 animate-in fade-in duration-500 text-white bg-[#020617] min-h-screen italic uppercase font-sans">

     

      {/* HEADER */}

      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 shadow-lg">

        <div>

          <h1 className="text-2xl font-black text-blue-500 tracking-tighter">MENU_MASTER</h1>

          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase italic">Automatic Financial Sync</p>

        </div>

        <div className="flex gap-2">

          <button onClick={() => setIsCatModalOpen(true)} className="bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border border-white/10 transition-all active:scale-95"><Tag size={14} /> Kategori</button>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"><Plus size={14} /> Tambah Menu</button>

        </div>

      </div>


      {/* GRID MENU */}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">

        {menus.map((menu) => (

          <div key={menu.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all">

            <div className="h-32 bg-black/50 relative flex justify-center items-center overflow-hidden">

              {menu.image_url ? <img src={menu.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" /> : <ImageIcon size={30} className="text-gray-700" />}

              <span className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded-md text-[8px] font-black text-blue-400 border border-white/10">{menu.category}</span>

              <button onClick={() => openRecipeManager(menu)} className="absolute top-2 right-2 bg-orange-600 p-1.5 rounded-lg text-white shadow-lg active:scale-90 transition-all"><ChefHat size={14} /></button>

            </div>

            <div className="p-3 flex-1 flex flex-col">

              <h3 className="font-black text-xs truncate">{menu.name}</h3>

              <p className="text-blue-400 font-mono font-bold text-sm mt-1 mb-3">Rp {Number(menu.price).toLocaleString()}</p>

              <div className="mt-auto flex gap-2">

                <button onClick={() => { setFormData(menu); setPreviewUrl(menu.image_url); setIsModalOpen(true); }} className="flex-1 bg-white/10 py-1.5 rounded-lg flex justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={12} /></button>

                <button onClick={async () => { if(confirm("Hapus?")) { await supabase.from("menus").delete().eq("id", menu.id); fetchMenus(); } }} className="flex-1 bg-white/10 py-1.5 rounded-lg flex justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={12} /></button>

              </div>

            </div>

          </div>

        ))}

      </div>


      {/* MODAL RESEP - VERSI SYNC HARGA MANUAL */}

      {isRecipeModalOpen && selectedMenuForRecipe && (

        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex justify-center items-center z-[6000] p-4">

          <div className="bg-[#0b1120] rounded-[2.5rem] p-6 md:p-8 w-full max-w-5xl border border-white/5 shadow-2xl flex flex-col max-h-[95vh] relative overflow-hidden">

           

            <button onClick={() => setIsRecipeModalOpen(false)} className="absolute top-6 right-8 text-gray-400 hover:text-white transition-colors z-10"><X size={28}/></button>

           

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">

             

              {/* KOLOM KIRI: EDITOR RESEP */}

              <div className="lg:col-span-7 flex flex-col min-h-0">

                <div className="mb-6">

                  <h2 className="text-xl md:text-2xl font-black tracking-tighter flex items-center gap-3">

                    <ChefHat className="text-orange-500" size={28} />

                    <span className="text-white">RESIP_SYNC:</span>

                    <span className="text-orange-500">{selectedMenuForRecipe.name}</span>

                  </h2>

                </div>


                <div className="flex-1 overflow-y-auto pr-3 no-scrollbar space-y-3 pb-6">

                  {currentRecipeItems.map((item, idx) => (

                    <div key={idx} className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex justify-between items-center group">

                      <div className="flex-1">

                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.name}</p>

                        <div className="flex items-center gap-3 mt-2">

                          <input type="number" className="w-20 bg-black/50 border border-white/10 p-2 rounded-xl text-xs text-orange-400 font-black outline-none focus:border-orange-500" value={item.qty_needed} onChange={(e) => {

                            const n = [...currentRecipeItems]; n[idx].qty_needed = parseFloat(e.target.value) || 0; setCurrentRecipeItems(n);

                          }} />

                          <span className="text-[8px] font-bold text-gray-500 italic">Modal Bahan: Rp {Math.round(item.unit_price * item.qty_needed).toLocaleString()}</span>

                        </div>

                      </div>

                      <button onClick={() => setCurrentRecipeItems(currentRecipeItems.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>

                    </div>

                  ))}

                 

                  <div className="pt-2">

                    <select className="w-full bg-blue-600/10 border-2 border-dashed border-blue-500/20 p-4 rounded-2xl text-[10px] font-black text-blue-400 outline-none mt-2" onChange={(e) => {

                      if (!e.target.value) return;

                      const invId = e.target.value;

                      const item = inventory.find(i => i.id == invId);

                      if (item) {

                        let up = item.cost_price || 0; if (up > 1000) up = up / (item.current_stock || 1);

                        setCurrentRecipeItems([...currentRecipeItems, { inventory_id: item.id, name: item.item_name, qty_needed: 1, unit_price: up, stock: item.current_stock || 0 }]);

                      }

                      e.target.value = "";

                    }}>

                      <option value="">+ TAMBAH BAHAN DARI GUDANG</option>

                      {inventory.map(inv => <option key={inv.id} value={inv.id} className="bg-[#0b1120] text-white">{inv.item_name}</option>)}

                    </select>

                  </div>

                </div>

              </div>


              {/* KOLOM KANAN: FINANCIAL ANALYST */}

              <div className="lg:col-span-5 flex flex-col min-h-0 bg-black/60 rounded-[2rem] border border-white/5 shadow-inner overflow-hidden">

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">

                  <div className="flex items-center gap-2 mb-6">

                    <Calculator size={16} className="text-blue-500" />

                    <h3 className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">Smart_Financials</h3>

                  </div>


                  <div className="space-y-4">

                    <div className="flex justify-between items-center text-[10px] font-bold px-1">

                      <span className="text-gray-400 uppercase tracking-widest">HPP FINAL (MODAL)</span>

                      <span className="font-mono text-white text-base">Rp {Math.round(hppFinal).toLocaleString()}</span>

                    </div>


                    <div className="space-y-6 pt-4 border-t border-white/5">

                      {/* Margin Slider */}

                      <div className="flex flex-col gap-3">

                        <div className="flex justify-between items-center px-1">

                          <span className="text-[9px] font-black text-orange-400 tracking-widest uppercase">TARGET MARGIN PROFIT (%)</span>

                          <span className="text-xl font-black text-white">{targetProfit}%</span>

                        </div>

                        <input type="range" min="5" max="95" step="1" className="w-full accent-orange-500 cursor-pointer h-2 bg-gray-800 rounded-lg appearance-none" value={targetProfit} onChange={(e) => handleSliderChange(Number(e.target.value))} />

                      </div>


                      {/* Simulasi Harga & Untung */}

                      <div className="grid grid-cols-2 gap-3">

                        <div className="bg-white/5 p-4 rounded-2xl border border-blue-500/30">

                          <p className="text-[7px] font-black text-blue-500 mb-2 tracking-widest uppercase flex items-center gap-1"><RefreshCcw size={8}/> INPUT HARGA JUAL</p>

                          <div className="flex items-center gap-1">

                            <span className="text-xs font-black text-blue-400 font-mono">RP</span>

                            <input

                              type="number"

                              className="bg-transparent text-xl font-black text-white italic font-mono outline-none w-full"

                              value={manualPrice}

                              onChange={(e) => handleManualPriceChange(Number(e.target.value))}

                            />

                          </div>

                        </div>

                        <div className="bg-green-600/10 p-4 rounded-2xl border border-green-500/20">

                          <p className="text-[7px] font-black text-green-500 mb-1 tracking-widest uppercase italic">KEUNTUNGAN BERSIH</p>

                          <p className="text-xl font-black text-green-400 italic font-mono tracking-tighter">

                            +Rp {Math.round(manualPrice - hppFinal).toLocaleString()}

                          </p>

                        </div>

                      </div>

                     

                      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 flex items-center gap-3">

                        <DollarSign className="text-green-500 flex-shrink-0" size={16} />

                        <p className="text-[8px] font-bold text-gray-400 leading-relaxed italic">

                          Margin <span className="text-white font-black">{targetProfit}%</span> = <span className="text-green-400 font-black">Rp {Math.round(manualPrice - hppFinal).toLocaleString()}</span> per porsi.

                        </p>

                      </div>


                      <div className="pt-6 border-t border-white/5 space-y-4 pb-4">

                        <div className="bg-blue-600/20 border border-blue-500/20 p-3 rounded-xl flex items-start gap-2">

                           <TrendingUp size={14} className="text-blue-400 mt-0.5" />

                           <p className="text-[8px] font-bold text-blue-200">Menyimpan konfigurasi ini akan otomatis mengubah harga jual menu di Menu Master & Waiter Order.</p>

                        </div>

                       

                        <button onClick={saveRecipeChanges} disabled={savingRecipe} className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black text-[9px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all active:scale-95">

                          {savingRecipe ? <Loader2 className="animate-spin" size={14}/> : <><Save size={16}/> SIMPAN RESEP & HARGA</>}

                        </button>

                      </div>

                    </div>

                  </div>

                </div>

              </div>


            </div>

          </div>

        </div>

      )}


      {/* MODAL FORM TAMBAH MENU */}

      {isModalOpen && (

        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[5000] p-4">

          <div className="bg-[#0f172a] p-6 rounded-3xl w-full max-w-md border border-white/10 shadow-2xl relative">

            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>

            <h2 className="text-xl font-black mb-6 italic uppercase tracking-tighter">New_Menu</h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>

                <label className="text-[8px] font-black text-gray-500 block mb-1">NAMA MENU</label>

                <input required className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value.toUpperCase()})}/>

              </div>

              <div className="grid grid-cols-2 gap-4">

                <div><label className="text-[8px] font-black text-gray-500 block mb-1">HARGA JUAL</label><input type="number" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})}/></div>

                <div><label className="text-[8px] font-black text-gray-500 block mb-1">KATEGORI</label><input className="w-full bg-white/5 border border-white/10 p-3 rounded-xl outline-none" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value.toUpperCase()})}/></div>

              </div>

              <button className="w-full bg-blue-600 py-4 rounded-xl font-black text-xs mt-4">SIMPAN_MENU</button>

            </form>

          </div>

        </div>

      )}


      {/* MODAL KATEGORI */}

      {isCatModalOpen && (

        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[5000] p-4">

          <div className="bg-[#0f172a] p-6 rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl relative">

            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>

            <h2 className="text-lg font-black mb-6 italic uppercase">Categories</h2>

            <div className="flex gap-2 mb-6"><input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none" /><button onClick={handleAddCategory} className="bg-blue-600 px-4 rounded-xl font-black text-[10px]">ADD</button></div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">{categories.map(c => (<div key={c.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"><span className="text-[10px] font-bold">{c.name}</span><button onClick={() => deleteCategory(c.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={12}/></button></div>))}</div>

          </div>

        </div>

      )}


    </div>

  );

} 