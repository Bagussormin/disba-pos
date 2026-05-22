import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase"; 
import { Plus, Trash2, Layout, Loader2, MousePointer2 } from "lucide-react";

interface Table {
  id: string;
  name: string;
  status: string;
  x_pos: number;
  y_pos: number;
  tenant_id: string;
}

export default function TableLayout() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) {
      fetchTables();
    } else {
      console.error("Akses Ditolak: Tenant ID tidak ditemukan. Harap login ulang.");
    }
  }, [tenantId]);

  const fetchTables = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenantId) 
      .order("name");
    
    if (data) setTables(data);
    if (error) console.error("Error fetching tables:", error.message);
    setLoading(false);
  };

  const addTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || !tenantId) return;
    
    const { error } = await supabase.from("tables").insert([
      { 
        name: newTableName.trim().toUpperCase(), 
        status: "available", 
        x_pos: 20, 
        y_pos: 20,
        tenant_id: tenantId 
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

    await supabase
      .from("tables")
      .update({ x_pos: newX, y_pos: newY })
      .eq("id", id)
      .eq("tenant_id", tenantId); 
  };

  const deleteTable = async (id: string) => {
    if (!tenantId) return;
    
    if (confirm("Hapus meja ini?")) {
      await supabase
        .from("tables")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); 
        
      fetchTables();
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-100 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 p-6 rounded-[1.8rem] border border-slate-800/85 gap-4 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <MousePointer2 className="text-blue-500" size={18} /> Layout Denah Meja
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-wider mt-1 uppercase">Geser meja ke posisi yang diinginkan untuk layout operasional</p>
        </div>
        
        <form onSubmit={addTable} className="flex gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="NAMA MEJA (contoh: 01)" 
            className="flex-1 sm:flex-initial bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-xs font-bold text-white uppercase outline-none focus:border-blue-500"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            disabled={!tenantId} 
          />
          <button 
            disabled={!tenantId}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-blue-600/10 transition-colors"
          >
            TAMBAH
          </button>
        </form>
      </div>

      {/* CANVAS AREA */}
      <div 
        ref={canvasRef}
        className="relative w-full h-[550px] bg-slate-950/40 border-2 border-dashed border-slate-800/60 rounded-[2.5rem] overflow-hidden shadow-inner cursor-crosshair backdrop-blur-xl"
        style={{ 
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
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
              className="w-24 h-24 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-move hover:border-blue-500 active:scale-95 hover:bg-blue-600/10 shadow-lg backdrop-blur-md group"
            >
              <Layout size={18} className="text-slate-500 mb-1.5 group-hover:text-blue-400 transition-colors" />
              <p className="text-xs font-bold tracking-tight text-slate-200">{table.name}</p>
              
              <button 
                onClick={() => deleteTable(table.id)}
                className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-105"
              >
                <Trash2 size={12} className="text-white" />
              </button>
              
              <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${table.status === 'available' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}