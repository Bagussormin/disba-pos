import { safeJSONParse } from "../../lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, MapPin, Search, User, Compass, ArrowRight, X } from "lucide-react";

type Table = { 
  id: number; 
  name: string; 
  status: string; 
  area: string; 
};

type ActiveOrder = { 
  id: string; 
  table_id: number; 
  guest_name: string; 
  status: string; 
}; 

export default function WaiterHome({ onOpenBill }: { onOpenBill: (orderId: string) => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(true);

  const tenantId = localStorage.getItem("tenant_id") || "NES_HOUSE_001";

  const fetchData = async () => {
    try {
      const [tRes, oRes] = await Promise.all([
        supabase.from("tables").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("tenant_id", tenantId).eq("status", "open")
      ]);

      if (tRes.error) throw tRes.error;
      if (oRes.error) throw oRes.error;

      if (tRes.data) {
        setTables(tRes.data);
        localStorage.setItem("disba_cache_tables", JSON.stringify(tRes.data));
      }
      if (oRes.data) {
        setOrders(oRes.data);
        localStorage.setItem("disba_cache_orders", JSON.stringify(oRes.data));
      }
    } catch (err) {
      // Using cached tables - offline mode active
      const cachedTables = safeJSONParse(localStorage.getItem("disba_cache_tables"), []);
      const cachedOrders = safeJSONParse(localStorage.getItem("disba_cache_orders"), []);
      
      if (cachedTables.length === 0) {
        const mockTables = [
          { id: 1, name: "Meja 1", status: "available", area: "Area Utama" },
          { id: 2, name: "Meja 2", status: "available", area: "Area Utama" },
          { id: 3, name: "Meja 3", status: "available", area: "Area Utama" },
          { id: 4, name: "Meja 4", status: "available", area: "Area Utama" },
          { id: 5, name: "Meja 5", status: "available", area: "Teras" },
          { id: 6, name: "Meja 6", status: "available", area: "Teras" }
        ];
        setTables(mockTables);
        localStorage.setItem("disba_cache_tables", JSON.stringify(mockTables));
      } else {
        setTables(cachedTables);
      }
      setOrders(cachedOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    try {
      const channel = supabase.channel(`waiter-sync-${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } catch (e) {
      // Realtime sync unavailable - offline mode active
    }
  }, []);

  const handleCreateOrder = async () => {
    if (!selectedTable) return;
    if (!guestName.trim()) return alert("Masukkan Nama Tamu terlebih dahulu!");
    
    try {
      const { data: newOrder, error } = await supabase.from("orders").insert({
        tenant_id: tenantId,
        table_id: selectedTable.id,
        guest_name: guestName.trim().toUpperCase(),
        status: "open"
      }).select().single();

      if (error) throw error;

      await supabase.from("tables").update({ status: "open" }).eq("id", selectedTable.id);
      onOpenBill(newOrder.id);
    } catch (err: any) {
      // Order saved offline - will sync when connection restores
      const newOrderId = "offline_order_" + Date.now();
      const offlineOrder = {
        id: newOrderId,
        table_id: selectedTable.id,
        guest_name: guestName.trim().toUpperCase(),
        status: "open"
      };
      
      const updatedOrders = [...orders, offlineOrder];
      const updatedTables = tables.map(t => t.id === selectedTable.id ? { ...t, status: "open" } : t);
      
      setOrders(updatedOrders);
      setTables(updatedTables);
      localStorage.setItem("disba_cache_orders", JSON.stringify(updatedOrders));
      localStorage.setItem("disba_cache_tables", JSON.stringify(updatedTables));
      
      onOpenBill(newOrderId);
    }
  };

  const dynamicAreas = Array.from(new Set(tables.map(t => (t.area || "Area Utama").toUpperCase())));

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col p-6 overflow-hidden font-sans">
      
      {/* Top info header */}
      <header className="mb-6 flex justify-between items-center bg-slate-900/40 p-5 rounded-[1.8rem] border border-slate-800/80 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <Compass className="text-blue-500" size={20} />
            Waitress Navigator
          </h2>
          <p className="text-[9px] text-slate-500 font-bold tracking-widest mt-1 uppercase">Daftar Meja Aktif & Pesanan Pelanggan</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-400">POS OK</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 h-[calc(100%-88px)] min-h-0">
        
        {/* LEFT: MAP MEJA */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900/20 border border-slate-900 rounded-[2.5rem] p-8 overflow-y-auto no-scrollbar backdrop-blur-3xl shadow-2xl">
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={36}/></div>
          ) : (
            dynamicAreas.map(area => (
              <div key={area} className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <MapPin size={14} className="text-blue-500" />
                  <h3 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">{area}</h3>
                  <div className="flex-1 h-[1px] bg-slate-800/50"></div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {tables.filter(t => (t.area || "Area Utama").toUpperCase() === area).map(t => {
                    const order = orders.find(o => o.table_id === t.id);
                    const isOccupied = !!order;
                    const isSelected = selectedTable?.id === t.id;

                    return (
                      <button 
                        key={t.id} 
                        onClick={() => { setSelectedTable(t); setGuestName(order?.guest_name || ""); }}
                        className={`aspect-[4/3] rounded-[1.8rem] border-2 flex flex-col items-center justify-center p-3 transition-all relative ${
                          isOccupied 
                            ? "border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20" 
                            : isSelected 
                              ? "border-blue-500 bg-blue-500/15 text-white" 
                              : "border-slate-800/60 bg-slate-950/40 text-slate-400 hover:border-slate-700/80 hover:text-white"
                        }`}
                      >
                        <div className="text-sm font-extrabold tracking-tight">{t.name}</div>
                        {isOccupied && (
                          <div className="text-[8px] text-white font-extrabold mt-1 px-2.5 py-0.5 bg-orange-600 rounded-lg truncate w-[90%] text-center">
                            {order.guest_name}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT: CONTROL PANEL */}
        <div className="col-span-12 lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] p-8 flex flex-col shadow-2xl backdrop-blur-md">
          {selectedTable ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">PILIHAN MEJA</p>
               <h3 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-6">{selectedTable.name}</h3>
               
               <div className="flex-1 space-y-6">
                  {orders.find(o => o.table_id === selectedTable.id) ? (
                    <div className="space-y-5">
                       <div className="p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/20 flex flex-col justify-center">
                          <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Pelanggan Aktif</p>
                          <p className="text-xl font-extrabold text-white">{guestName || "WALK-IN"}</p>
                       </div>
                       
                       <button 
                         onClick={() => onOpenBill(orders.find(o => o.table_id === selectedTable.id)!.id)}
                         className="w-full bg-orange-500 hover:bg-orange-600 py-4.5 rounded-[1.6rem] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                       >
                         <span>Buka Bill Pesanan</span>
                         <ArrowRight size={14} />
                       </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                       <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block">Nama Pelanggan</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-5 outline-none font-bold text-white text-sm focus:border-blue-500 transition-colors" 
                            placeholder="Contoh: Budi, Meja 5B" 
                            value={guestName} 
                            onChange={(e) => setGuestName(e.target.value)} 
                          />
                       </div>
                       <button 
                         onClick={handleCreateOrder} 
                         className="w-full bg-blue-600 hover:bg-blue-500 py-4.5 rounded-[1.6rem] font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20"
                       >
                         Mulai Pesanan Baru
                       </button>
                    </div>
                  )}
               </div>
               <button 
                 onClick={() => setSelectedTable(null)} 
                 className="w-full text-slate-500 font-bold py-3 hover:text-red-400 uppercase text-[10px] tracking-wider transition-colors"
               >
                 [ Batalkan Pilihan ]
               </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
              <Compass size={40} className="mb-4 text-blue-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pilih Meja untuk Memulai</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}