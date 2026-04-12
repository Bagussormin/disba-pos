import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, MapPin, Search, User, ShoppingBag } from "lucide-react";

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
      // Hanya ambil data meja murni
      const [tRes, oRes] = await Promise.all([
        supabase.from("tables").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("tenant_id", tenantId).eq("status", "open")
      ]);

      if (tRes.data) setTables(tRes.data);
      if (oRes.data) setOrders(oRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Sync Realtime untuk Meja dan Order
    const channel = supabase.channel(`waiter-sync-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateOrder = async () => {
    if (!selectedTable || !guestName) return alert("INPUT NAMA TAMU!");
    
    try {
      const { data: newOrder, error } = await supabase.from("orders").insert({
        tenant_id: tenantId,
        table_id: selectedTable.id,
        guest_name: guestName.toUpperCase(),
        status: "open"
      }).select().single();

      if (error) throw error;

      await supabase.from("tables").update({ status: "open" }).eq("id", selectedTable.id);
      
      onOpenBill(newOrder.id);
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };

  const dynamicAreas = Array.from(new Set(tables.map(t => (t.area || "GENERAL").toUpperCase())));

  return (
    <div className="fixed inset-0 bg-[#010413] text-white italic uppercase flex flex-col p-4 lg:p-6 overflow-hidden">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* LEFT: MAP MEJA */}
        <div className="col-span-12 lg:col-span-8 bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 overflow-y-auto no-scrollbar backdrop-blur-3xl shadow-2xl">
          {loading ? (
            <div className="flex justify-center mt-20 opacity-20"><Loader2 className="animate-spin" size={40}/></div>
          ) : (
            dynamicAreas.map(area => (
              <div key={area} className="mb-10">
                <div className="flex items-center gap-4 mb-6 opacity-40">
                  <MapPin size={14} className="text-blue-500" />
                  <h3 className="text-[10px] font-black tracking-[0.4em]">{area}</h3>
                  <div className="flex-1 h-[1px] bg-white/5"></div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tables.filter(t => (t.area || "GENERAL").toUpperCase() === area).map(t => {
                    const order = orders.find(o => o.table_id === t.id);
                    const isOccupied = !!order;
                    const isSelected = selectedTable?.id === t.id;

                    return (
                      <button key={t.id} onClick={() => { setSelectedTable(t); setGuestName(order?.guest_name || ""); }}
                        className={`aspect-square rounded-[2.2rem] border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xl relative ${
                          isOccupied ? "border-orange-500 bg-orange-500/10 text-orange-500" : 
                          isSelected ? "border-blue-500 bg-blue-500/20 shadow-blue-500/20" : 
                          "border-white/5 bg-white/[0.02] text-gray-700"
                        }`}
                      >
                        <div className="text-[14px] font-black tracking-tighter">{t.name}</div>
                        {isOccupied && (
                          <div className="text-[7px] text-white font-black mt-2 px-2 py-0.5 bg-orange-600 rounded-md truncate w-[80%] text-center">
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
        <div className="col-span-12 lg:col-span-4 bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 flex flex-col shadow-2xl backdrop-blur-md">
          {selectedTable ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
               <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-3">Table_Protocol</p>
               <h3 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none mb-10">{selectedTable.name}</h3>
               
               <div className="flex-1 space-y-8">
                  {orders.find(o => o.table_id === selectedTable.id) ? (
                    <div className="space-y-6">
                       <div className="p-8 rounded-[2rem] bg-orange-500/10 border border-orange-500/20">
                          <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">Active_Guest</p>
                          <p className="text-3xl font-black text-white">{guestName || "WALK-IN"}</p>
                       </div>
                       <p className="text-[10px] text-gray-600 text-center font-black">BILLING_ACTIVE_ON_CASHIER</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="relative group">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-5 mb-3 block opacity-50">Assign_Guest</label>
                          <input type="text" className="w-full bg-[#03081a] border-2 border-white/5 rounded-[2.5rem] py-6 px-8 outline-none font-black text-white text-sm" placeholder="NAME..." value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                       </div>
                       <button onClick={handleCreateOrder} className="w-full bg-blue-600 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20">Initialize_Order</button>
                    </div>
                  )}
               </div>
               <button onClick={() => setSelectedTable(null)} className="w-full text-gray-700 font-black py-5 hover:text-red-500 uppercase text-[9px] tracking-[0.5em]">[ DISMISS ]</button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center px-10">
              <Search size={48} className="mb-6 text-blue-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.6em]">Waiting_For_Selection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}