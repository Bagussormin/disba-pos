import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase"; 
import { Plus, Trash2, Layout, Loader2, MousePointer2 } from "lucide-react";

export default function TableLayout() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data } = await supabase.from("tables").select("*").order("name");
    setTables(data || []);
    setLoading(false);
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName) return;
    
    // Meja baru akan diletakkan di posisi 0,0 secara default
    const { error } = await supabase.from("tables").insert([
      { name: newTableName.toUpperCase(), status: "available", x_pos: 20, y_pos: 20 }
    ]);
    
    if (!error) {
      setNewTableName("");
      fetchTables();
    }
  };

  const handleDragEnd = async (e: React.DragEvent, id: string) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Menghitung koordinat baru (dikurangi setengah lebar meja agar kursor di tengah)
    let newX = e.clientX - canvasRect.left - 48; 
    let newY = e.clientY - canvasRect.top - 48;

    // Batasi agar tidak keluar dari area kanvas
    newX = Math.max(0, Math.min(newX, canvasRect.width - 96));
    newY = Math.max(0, Math.min(newY, canvasRect.height - 96));

    // Update state lokal agar instan di layar
    setTables(prev => prev.map(t => t.id === id ? { ...t, x_pos: newX, y_pos: newY } : t));

    // Simpan permanen ke database
    await supabase.from("tables").update({ x_pos: newX, y_pos: newY }).eq("id", id);
  };

  const deleteTable = async (id: string) => {
    if (confirm("Hapus meja ini?")) {
      await supabase.from("tables").delete().eq("id", id);
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
          />
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-black text-[9px] transition-all">
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