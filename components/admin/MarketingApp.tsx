import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MarketingApp() {
  const [activeSubMenu, setActiveSubMenu] = useState("DISCOUNT");
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // 🔥 KUNCI MASTER MULTI-OUTLET
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const [newPromo, setNewPromo] = useState({
    name: "", type: "PERCENTAGE", value: 0, min_purchase: 0, code: ""
  });

  useEffect(() => {
    if (tenantId) loadPromos();
  }, [activeSubMenu, tenantId]);

  const loadPromos = async () => {
    setLoading(true);
    try {
      // 🔥 FILTER PROMO PER OUTLET
      const { data, error } = await supabase
        .from("promos")
        .select("*")
        .eq("tenant_id", tenantId) 
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      const filtered = (data || []).filter((p: any) => {
        return activeSubMenu === "DISCOUNT" ? (!p.code || p.code === "") : (p.code && p.code !== "");
      });
      setPromos(filtered);
    } catch (err) {
      console.error("Marketing Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newPromo.name || newPromo.value <= 0 || !tenantId) return alert("Lengkapi data promo!");
    try {
      // 🔥 INJEKSI IDENTITAS OUTLET KE PROMO BARU
      const payload = {
        name: newPromo.name.toUpperCase(),
        type: newPromo.type,
        value: Number(newPromo.value),
        min_purchase: Number(newPromo.min_purchase) || 0,
        code: activeSubMenu === "VOUCHER" ? newPromo.code.toUpperCase() : null,
        is_active: true,
        tenant_id: tenantId 
      };
      const { error } = await supabase.from("promos").insert([payload]);
      if (error) throw error;
      setModalOpen(false);
      setNewPromo({ name: "", type: "PERCENTAGE", value: 0, min_purchase: 0, code: "" });
      loadPromos();
    } catch (err: any) {
      alert("Error Simpan: " + err.message);
    }
  };

  const deletePromo = async (id: string) => {
    if (!tenantId) return;
    if (!confirm("Hapus promo ini?")) return;
    // 🔥 AMANKAN PENGHAPUSAN
    await supabase.from("promos").delete().eq("id", id).eq("tenant_id", tenantId);
    loadPromos();
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex gap-6">
          {["DISCOUNT", "VOUCHER"].map(t => (
            <button key={t} onClick={() => setActiveSubMenu(t)} 
              className={`text-[9px] font-black tracking-widest uppercase transition-all ${
                activeSubMenu === t ? "text-blue-500 border-b-2 border-blue-500 pb-4 -mb-4.5" : "text-gray-600 hover:text-gray-400"
              }`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setModalOpen(true)} disabled={!tenantId} className="bg-blue-600 disabled:opacity-50 px-4 py-1.5 rounded-lg text-[8px] font-black uppercase text-white shadow-lg active:scale-95 transition-all">
          + New {activeSubMenu}
        </button>
      </div>

      {loading ? (
        <p className="text-center py-20 text-[9px] font-black text-blue-500 animate-pulse uppercase tracking-[0.3em]">Syncing Database...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {promos.length > 0 ? promos.map(p => (
            <div key={p.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl group relative overflow-hidden transition-all hover:border-white/10">
               <button onClick={() => deletePromo(p.id)} className="absolute top-2 right-2 text-[8px] opacity-0 group-hover:opacity-100 text-red-500 font-black transition-all">DELETE</button>
               <span className="text-[7px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded">{p.type}</span>
               <h3 className="text-xs font-black italic text-white uppercase truncate mt-2">{p.name}</h3>
               {p.code && <p className="text-[10px] font-mono text-blue-400 font-black mt-1">[{p.code}]</p>}
               <p className="text-xl font-mono font-bold text-white mt-2">{p.type === "PERCENTAGE" ? `${p.value}%` : `Rp${p.value.toLocaleString()}`}</p>
               <div className="border-t border-white/5 mt-3 pt-2">
                 <p className="text-[7px] text-gray-600 font-black uppercase">Min. Spend: Rp{p.min_purchase.toLocaleString()}</p>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-30">
               <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">No {activeSubMenu} Configured</p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#020617] border border-white/10 w-full max-w-[280px] p-8 rounded-[2.5rem] space-y-4 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="text-[10px] font-black italic text-center text-white mb-6 uppercase tracking-widest">Setup {activeSubMenu}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Promo Name" onChange={e => setNewPromo({...newPromo, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-blue-500" />
              {activeSubMenu === "VOUCHER" && (
                <input type="text" placeholder="Voucher Code" onChange={e => setNewPromo({...newPromo, code: e.target.value})} className="w-full bg-blue-600/10 border border-blue-500/30 rounded-xl p-3 text-[10px] text-blue-400 font-black outline-none" />
              )}
              <div className="grid grid-cols-2 gap-3">
                <select onChange={e => setNewPromo({...newPromo, type: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none">
                  <option value="PERCENTAGE">%</option>
                  <option value="NOMINAL">Rp</option>
                </select>
                <input type="number" placeholder="Value" onChange={e => setNewPromo({...newPromo, value: parseFloat(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-blue-500" />
              </div>
              <input type="number" placeholder="Min. Purchase" onChange={e => setNewPromo({...newPromo, min_purchase: parseFloat(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-blue-500" />
              <button onClick={handleSave} className="w-full py-4 bg-blue-600 rounded-2xl font-black text-[10px] text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest">Activate</button>
              <button onClick={() => setModalOpen(false)} className="w-full text-[8px] font-black text-gray-700 uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}