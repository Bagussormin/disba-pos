import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Printer, MapPin, Plus, Trash2, X, Loader2, QrCode } from "lucide-react";

export default function TableQRManager() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);

  const [newTableName, setNewTableName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchTables();
  }, [tenantId]);

  const fetchTables = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tables")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("area", { ascending: true })
      .order("name", { ascending: true });
    
    if (data) {
      setTables(data);
      const uniqueAreas = Array.from(new Set(data.map((t) => (t.area || "UNASSIGNED").toUpperCase())));
      setAreas(uniqueAreas as string[]);
    }
    setLoading(false);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName || !tenantId) return;

    setLoading(true);
    const { error } = await supabase.from("tables").insert([{
      name: newTableName.toUpperCase(),
      area: newAreaName.toUpperCase() || "REGULER",
      tenant_id: tenantId
    }]);

    if (!error) {
      setNewTableName("");
      setNewAreaName("");
      setIsModalOpen(false);
      fetchTables();
    } else {
      alert("Gagal menambah meja.");
    }
    setLoading(false);
  };

  const handleDeleteTable = async (id: string) => {
    if (confirm("Hapus meja ini? QR Code yang sudah dicetak tidak akan berlaku lagi.")) {
      await supabase.from("tables").delete().eq("id", id).eq("tenant_id", tenantId);
      fetchTables();
    }
  };

  const groupedTables = areas.reduce((acc: any, area) => {
    acc[area] = tables.filter(t => (t.area || "UNASSIGNED").toUpperCase() === area);
    return acc;
  }, {});

  // =========================================================================
  // 🔥 FUNGSI PRINT QR INSTAN (FIX UKURAN LONCAT & PERBESAR QR CODE)
  // =========================================================================
  const printQR = (tableId: string, tableName: string) => {
    const baseUrl = window.location.origin;
    const qrUrl = `${baseUrl}/menu?tenant=${tenantId}&table=${tableId}`;
    // Minta gambar ukuran 400x400 dari server agar pas
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;
    const displayTenantName = tenantId ? tenantId.replace(/_/g, " ") : "DISBA POS";
    
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print QR - ${tableName}</title>
            <style>
              /* Font standar bawaan OS agar langsung muncul tanpa loading internet */
              body { 
                font-family: Arial, Helvetica, sans-serif; 
                background: #fff; 
                margin: 0; 
                padding: 30px 20px; 
                text-align: center;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important;
              }
              
              /* Ukuran Card diperbesar sedikit agar proporsional dengan QR yang membesar */
              .card { 
                width: 380px; 
                display: inline-block; 
                margin: 0 auto; 
                background: white; 
                border: 6px solid #000; 
                border-radius: 20px; 
                padding: 30px; 
                color: #000;
                text-align: center;
              }
              
              .logo { font-size: 28px; font-weight: 900; margin-bottom: 5px; text-transform: uppercase; font-style: italic;}
              .tagline { font-size: 11px; font-weight: bold; color: #3b82f6; letter-spacing: 2px; margin-bottom: 25px; text-transform: uppercase; }
              
              .qr-box { 
                border: 2px solid #ddd; 
                padding: 15px; 
                border-radius: 16px; 
                display: inline-block; 
                margin-bottom: 25px;
              }
              
              /* Kunci ukuran menggunakan !important agar tidak loncat */
              .qr-img { width: 300px !important; height: 300px !important; display: block; margin: 0 auto; }
              
              .table-box { background: #000; color: white; padding: 15px; border-radius: 12px; margin-bottom: 25px; }
              .table-name { font-size: 32px; font-weight: 900; margin: 0; font-style: italic; text-transform: uppercase;}
              
              .steps { font-size: 11px; color: #333; font-weight: bold; text-align: left; background: #f5f5f5; padding: 15px; border-radius: 12px;}
              .step-item { margin-bottom: 8px; }
              .step-num { color: #3b82f6; font-weight: 900; }
              
              .footer { font-size: 10px; font-weight: bold; color: #999; margin-top: 30px; text-transform: uppercase; }
              
              @media print {
                @page { margin: 10mm auto; size: auto; }
                body { padding: 0; margin: 0; text-align: center; }
                .card { border: 4px solid #000; box-shadow: none; margin: 0 auto; display: inline-block; page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">${displayTenantName}</div>
              <div class="tagline">Pesan Digital Lebih Cepat</div>
              
              <div class="qr-box">
                <img src="${qrImageUrl}" width="300" height="300" class="qr-img" alt="QR Code" />
              </div>
              
              <div class="table-box">
                <h1 class="table-name">${tableName}</h1>
              </div>
              
              <div class="steps">
                <div class="step-item"><span class="step-num">1.</span> SCAN QR CODE INI</div>
                <div class="step-item"><span class="step-num">2.</span> PILIH MENU FAVORIT ANDA</div>
                <div class="step-item"><span class="step-num">3.</span> KONFIRMASI PESANAN</div>
              </div>
              
              <div class="footer">Powered by DISBA POS SYSTEM</div>
            </div>
            
            <script>
              setTimeout(function() {
                window.print();
                window.close();
              }, 800);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("Popup diblokir oleh browser. Izinkan pop-ups untuk mencetak QR.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white italic font-sans uppercase">
      
      {/* HEADER SECTION (Gahar Edition) */}
      <div className="mb-12 flex justify-between items-center bg-black/40 border border-white/5 p-5 rounded-[2rem] shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-blue-500 tracking-tighter flex items-center gap-3">
             <QrCode size={30} className="text-white"/> QR_COMMANDER_
          </h2>
          <p className="text-[10px] text-gray-500 font-mono tracking-[0.3em] mt-1">OUTLET: {tenantId || "???"} | STATUS: ONLINE</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3.5 rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={18} /> REGISTRASI_MEJA
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-blue-500 font-black animate-pulse text-xs bg-white/5 p-4 rounded-xl border border-white/5 w-fit">
          <Loader2 className="animate-spin" size={16} /> MENGAMBIL_DATA_MEJA...
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-24 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center gap-4">
           <MapPin size={40} className="opacity-20 text-gray-500" />
          <p className="text-gray-500 text-xs font-bold tracking-widest">BELUM ADA MEJA YANG TERDAFTAR DI OUTLET INI</p>
        </div>
      ) : (
        areas.map((area) => (
          <div key={area} className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* AREA TITLE */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20 text-blue-500">
                  <MapPin size={18} />
              </div>
              <h3 className="text-sm font-black tracking-[0.5em]">{area}</h3>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
            </div>
            
            {/* MEJA GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5">
              {groupedTables[area].map((table: any) => (
                <div key={table.id} className="bg-white/5 border border-white/5 p-5 rounded-[2.5rem] group hover:border-blue-500/50 transition-all relative flex flex-col items-center">
                  <button 
                    onClick={() => handleDeleteTable(table.id)}
                    className="absolute -top-2 -right-2 bg-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10 hover:bg-red-500 active:scale-90"
                  >
                    <X size={12} />
                  </button>
                  
                  <div className="flex-1 flex flex-col items-center w-full">
                    <div className="w-14 h-14 bg-black/60 rounded-full flex justify-center items-center mb-4 border-2 border-dashed border-white/10 group-hover:border-blue-500/30 group-hover:bg-blue-600/10 transition-all">
                        <span className="text-xl font-black text-white group-hover:text-blue-400 font-mono tracking-tighter">
                            {table.name.substring(0,3)}
                        </span>
                    </div>
                    <div className="text-[10px] font-black mb-5 truncate text-gray-400 w-full text-center tracking-tighter group-hover:text-white transition-colors">
                      {table.name}
                    </div>
                    <button
                      onClick={() => printQR(table.id, table.name)}
                      className="w-full bg-white text-black py-3 rounded-xl font-black text-[9px] flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95"
                    >
                      <Printer size={15} /> PRINT_QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* MODAL: REGISTRASI MEJA BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex justify-center items-center z-[5000] p-4">
          <div className="bg-[#0b1120] p-10 rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors"><X size={28}/></button>
            
            <div className="flex items-center gap-3 mb-10">
                <QrCode size={24} className="text-blue-500"/>
                <h2 className="text-2xl font-black text-white tracking-tighter">REGISTRASI_MEJA_BARU_</h2>
            </div>
            
            <form onSubmit={handleAddTable} className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-gray-600 mb-2 block tracking-[0.2em]">NAMA / NO MEJA (CONTOH: MEJA 01)</label>
                <input required autoFocus className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 text-sm font-bold uppercase placeholder:text-gray-800" placeholder="INPUT NAMA MEJA..." value={newTableName} onChange={e => setNewTableName(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-600 mb-2 block tracking-[0.2em]">AREA LOKASI (CONTOH: VIP / OUTDOOR)</label>
                <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-blue-500 text-sm font-bold uppercase placeholder:text-gray-800" placeholder="INPUT NAMA AREA..." value={newAreaName} onChange={e => setNewAreaName(e.target.value)} />
              </div>
              
              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 py-5 rounded-2xl font-black text-xs uppercase text-gray-400 hover:bg-white/10">BATAL</button>
                 <button disabled={loading} type="submit" className="flex-[2] bg-blue-600 py-5 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                   {loading ? <Loader2 className="animate-spin mx-auto"/> : "KONFIRMASI_MEJA"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}