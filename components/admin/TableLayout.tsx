import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase"; 
import { Plus, Trash2, Layout, Loader2, MousePointer2 } from "lucide-react";

export default function TableLayout() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  // 🔥 KUNCI MASTER MULTI-OUTLET
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    // Cegah eksekusi jika tidak ada tenant_id (misal: memori terhapus)
    if (tenantId) {
      fetchTables();
    } else {
      console.error("Akses Ditolak: Tenant ID tidak ditemukan. Harap login ulang.");
    }
  }, [tenantId]);

  const fetchTables = async () => {
    setLoading(true);
    // 🔥 FILTER 1: Hanya ambil meja milik toko ini
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenantId) 
      .order("name");
    
    setTables(data || []);
    setLoading(false);
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || !tenantId) return;
    
    // 🔥 FILTER 2: Stempel meja baru dengan identitas toko ini
    const { error } = await supabase.from("tables").insert([
      { 
        name: newTableName.toUpperCase(), 
        status: "available", 
        x_pos: 20, 
        y_pos: 20,
        tenant_id: tenantId // Wajib diisi!
      }
    ]);
    
    if (!error) {
      setNewTableName("");
      fetchTables();
    } else {
      alert("Gagal menambahkan meja: " + error.message);
    }
  };

  const handleDragEnd = async (e: React.DragEvent, id: string) => {
    if (!canvasRef.current || !tenantId) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    let newX = e.clientX - canvasRect.left - 48; 
    let newY = e.clientY - canvasRect.top - 48;

    newX = Math.max(0, Math.min(newX, canvasRect.width - 96));
    newY = Math.max(0, Math.min(newY, canvasRect.height - 96));

    setTables(prev => prev.map(t => t.id === id ? { ...t, x_pos: newX, y_pos: newY } : t));

    // 🔥 FILTER 3: Amankan proses update posisi
    await supabase
      .from("tables")
      .update({ x_pos: newX, y_pos: newY })
      .eq("id", id)
      .eq("tenant_id", tenantId); 
  };

  const deleteTable = async (id: string) => {
    if (!tenantId) return;
    
    if (confirm("Hapus meja ini?")) {
      // 🔥 FILTER 4: Amankan proses penghapusan
      await supabase
        .from("tables")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); 
        
      fetchTables();
    }
  };

  return (
    <div className="space-y-6 font-sans italic uppercase animate-in fade-in">
      <div className="flex justify-between items-center bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
        <div>
          <h1 className="text-xl font-black tracking-tighter italic flex items-center gap-3">
            <MousePointer2 className="text-blue-500" /> Layout Denah Meja
          </h1>
          <p className="text-[8px] text-gray-500 font-bold tracking-widest mt-1">Geser meja ke posisi yang diinginkan</p>
        </div>
        
        <form onSubmit={addTable} className="flex gap-2 not-italic">
          <input 
            type="text" 
            placeholder="NAMA MEJA" 
            className="bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] font-bold text-white uppercase outline-none focus:border-blue-500"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            disabled={!tenantId} // Matikan input jika tidak ada sesi
          />
          <button 
            disabled={!tenantId}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-3 rounded-xl font-black text-[9px] transition-all"
          >
            TAMBAH
          </button>
        </form>
      </div>

      {/* CANVAS AREA */}
      <div 
        ref={canvasRef}
        className="relative w-full h-[550px] bg-[#020617] border-2 border-dashed border-white/5 rounded-[3rem] overflow-hidden shadow-inner cursor-crosshair"
        style={{ 
          backgroundImage: 'radial-gradient(circle, #ffffff05 1px, transparent 1px)', 
          backgroundSize: '25px 25px' 
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          tables.map((table) => (
            <div
              key={table.id}
              draggable
              onDragEnd={(e) => handleDragEnd(e, table.id)}
              style={{ 
                position: 'absolute',
                left: `${table.x_pos}px`, 
                top: `${table.y_pos}px`,
                transition: 'transform 0.1s ease'
              }}
              className="w-24 h-24 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-move hover:border-blue-500 active:scale-90 hover:bg-blue-500/10 shadow-xl backdrop-blur-md group"
            >
              <Layout size={18} className="text-gray-600 mb-2 group-hover:text-blue-500 transition-colors" />
              <p className="text-[10px] font-black tracking-tighter text-gray-300">{table.name}</p>
              
              <button 
                onClick={() => deleteTable(table.id)}
                className="absolute -top-2 -right-2 bg-red-600 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
              >
                <Trash2 size={12} />
              </button>
              
              {/* Indikator Status di pojok */}
              <div className={`absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full ${table.status === 'available' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}