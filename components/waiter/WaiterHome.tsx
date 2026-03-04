import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

type Table = { id: number; name: string; status: string; area: string; x_pos: number; y_pos: number; };
type OpenBill = { id: number; table_id: number; guest_name: string; status: string; };
type Props = { onOpenBill: (billId: number) => void; };

export default function WaiterHome({ onOpenBill }: Props) {
  const [tables, setTables] = useState<Table[]>([]);
  const [bills, setBills] = useState<OpenBill[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTables = async () => {
    const { data } = await supabase.from("tables").select("*").order("id");
    if (data) setTables(data);
    setLoading(false);
  };

  const fetchBills = async () => {
    const { data } = await supabase.from("open_bills").select("*").eq("status", "open");
    if (data) setBills(data);
  };

  useEffect(() => {
    fetchTables();
    fetchBills();

    const channel = supabase.channel('waiter-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchTables())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_bills' }, () => fetchBills())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateAndOrder = async () => {
    if (!selectedTable || !guestName) return alert("Masukan nama tamu!");
    const tableIdClean = Number(selectedTable.id);

    try {
      const { data: bill, error: billError } = await supabase
        .from("open_bills")
        .insert({ 
          table_id: tableIdClean, 
          guest_name: guestName.toUpperCase(), 
          status: "open" 
        })
        .select().single();
      
      if (billError) throw billError;

      await supabase
        .from("tables")
        .update({ status: "open" })
        .eq("id", tableIdClean);

      onOpenBill(bill.id);

    } catch (err: any) { 
      alert("Gagal: " + err.message); 
    }
  };

  const handleExistingOrder = () => {
    const bill = bills.find(b => b.table_id === selectedTable?.id);
    if (bill) onOpenBill(bill.id);
  };

  return (
    /* PERBAIKAN: Menghapus fixed inset-0 agar Header di WaiterApp.tsx terlihat */
    <div className="w-full h-[calc(100vh-120px)] overflow-hidden select-none font-sans italic text-white">
      <div className="max-w-7xl mx-auto flex flex-col h-full relative">
        
        <div className="grid grid-cols-12 gap-4 h-full overflow-hidden pb-6">
          
          {/* BAGIAN DENAH */}
          <div className="col-span-12 lg:col-span-8 bg-white/[0.01] rounded-[2rem] border border-white/5 relative overflow-auto no-scrollbar shadow-2xl group">
            
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                backgroundImage: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)', 
                backgroundSize: '30px 30px' 
              }}
            ></div>

            {loading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
              <div className="relative min-w-[800px] min-h-[600px] p-10">
                {tables.map((table) => {
                  const bill = bills.find(b => b.table_id === table.id);
                  const isOccupied = table.status === "open";
                  const isSelected = selectedTable?.id === table.id;

                  return (
                    <button
                      key={table.id}
                      onClick={() => { 
                        setSelectedTable(table); 
                        setGuestName(bill?.guest_name || ""); 
                      }}
                      style={{ 
                        position: 'absolute',
                        left: `${table.x_pos}px`, 
                        top: `${table.y_pos}px`,
                        width: '90px', 
                        height: '90px'
                      }}
                      className={`rounded-2xl flex flex-col items-center justify-center transition-all border active:scale-90 shadow-xl ${
                        isOccupied 
                          ? isSelected ? "border-orange-500 bg-orange-500/20" : "border-orange-500/40 bg-white/[0.02]"
                          : isSelected ? "border-blue-500 bg-blue-500/20" : "border-white/5 bg-white/[0.01]"
                      }`}
                    >
                      <div className={`text-[10px] font-black tracking-tighter ${isOccupied ? "text-orange-500" : isSelected ? "text-blue-400" : "text-gray-500"}`}>
                        {table.name}
                      </div>
                      
                      {isOccupied && (
                        <div className="text-[6px] text-white font-black mt-1 px-1 py-0.5 bg-orange-600 rounded-sm truncate w-[85%] uppercase">
                          {bill?.guest_name}
                        </div>
                      )}

                      <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${isOccupied ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500 opacity-30'}`}></div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PANEL KANAN */}
          <div className="col-span-12 lg:col-span-4 bg-white/[0.02] rounded-[2rem] border border-white/5 p-6 flex flex-col shadow-2xl relative">
            {selectedTable ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1">UNIT_ID</p>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">
                    TBL-{selectedTable.name}
                  </h3>
                </div>

                {selectedTable.status === "open" ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-orange-500/5 border border-white/5">
                      <p className="text-[7px] font-black text-orange-500 uppercase mb-1">GUEST_DATA</p>
                      <p className="text-lg font-black text-white uppercase italic tracking-tight">{guestName}</p>
                    </div>
                    <button 
                      onClick={handleExistingOrder}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[9px]"
                    >
                      ADD ORDER
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">GUEST_NAME_INPUT</label>
                      <input 
                        type="text" 
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl p-4 mt-1 focus:border-blue-500 outline-none font-black uppercase text-blue-400 placeholder:text-gray-800 text-[10px] shadow-inner"
                        placeholder="TYPE NAME..."
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={handleCreateAndOrder}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[9px]"
                    >
                      INITIALIZE ORDER
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-full text-gray-700 font-black py-2 hover:text-white uppercase text-[8px] tracking-[0.3em] transition-colors"
                >
                  [ ABORT_PROCESS ]
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/5">
                  <span className="text-xl opacity-20">🍽️</span>
                </div>
                <p className="font-black text-[8px] text-gray-700 uppercase tracking-[0.4em]">Ready for input</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}