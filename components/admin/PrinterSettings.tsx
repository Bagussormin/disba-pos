import { useState, useEffect } from "react";
import { Printer, Server, Monitor, CheckCircle2, AlertCircle, Save, Wifi } from "lucide-react";

export default function PrinterSettings() {
  const [paperSize, setPaperSize] = useState("58mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerType, setPrinterType] = useState("browser");
  const [lanIp, setLanIp] = useState("");
  const [localPrinterIp, setLocalPrinterIp] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 🔥 KUNCI MASTER MULTI-OUTLET (Untuk membedakan settingan per outlet di browser yang sama)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DEFAULT" : "DEFAULT";

  // Tarik data pengaturan saat halaman dimuat
  useEffect(() => {
    // Menggunakan tenantId pada key localStorage agar settingan Alpha tidak menimpa settingan NES House
    const savedSize = localStorage.getItem(`disba_printer_size_${tenantId}`) || "58mm";
    const savedAuto = localStorage.getItem(`disba_printer_auto_${tenantId}`) === "true";
    const savedType = localStorage.getItem(`disba_printer_type_${tenantId}`) || "browser";
    const savedLanIp = localStorage.getItem(`disba_printer_lan_ip_${tenantId}`) || "";
    const savedLocalIp = localStorage.getItem("printer_ip") || "127.0.0.1"; // IP Print Server Node.js (Kasir)
    
    setPaperSize(savedSize);
    setAutoPrint(savedAuto);
    setPrinterType(savedType);
    setLanIp(savedLanIp);
    setLocalPrinterIp(savedLocalIp);
  }, [tenantId]);

  // Simpan pengaturan ke browser outlet tersebut
  const handleSave = () => {
    localStorage.setItem(`disba_printer_size_${tenantId}`, paperSize);
    localStorage.setItem(`disba_printer_auto_${tenantId}`, String(autoPrint));
    localStorage.setItem(`disba_printer_type_${tenantId}`, printerType);
    
    // Simpan IP Print Server Node.js (Dibutuhkan oleh file KasirHome dan WaiterOrder)
    localStorage.setItem("printer_ip", localPrinterIp);
    
    if (printerType === "lan") {
      localStorage.setItem(`disba_printer_lan_ip_${tenantId}`, lanIp);
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-white font-sans uppercase italic">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-500 tracking-tighter flex items-center gap-3">
            <Printer size={32} /> Hardware_Config
          </h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mt-2">PENGATURAN MESIN PRINTER [TENANT: {tenantId}]</p>
        </div>
        <button 
          onClick={handleSave} 
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black border border-blue-500/30 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {isSaved ? "TERSAVE!" : "SIMPAN KONFIGURASI"}
        </button>
      </div>

      {/* ALERT INFO */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-300 font-bold tracking-widest leading-relaxed">
          <span className="text-blue-400 font-black">INFO SISTEM:</span> Pengaturan ini bersifat "Terminal-Based" (Terikat pada perangkat yang sedang Anda gunakan). 
          Jika Kasir menggunakan Tablet/Laptop yang berbeda, Anda harus login Admin di perangkat Kasir tersebut dan mengaturnya kembali di sini.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PANEL 1: METODE KONEKSI & UKURAN KERTAS */}
        <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <Monitor size={18} className="text-purple-500" />
            <h2 className="text-sm font-black text-white tracking-widest">METODE CETAK</h2>
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-[10px] font-black text-gray-500 mb-2 block">PILIH JALUR PRINTER</label>
              <select 
                value={printerType}
                onChange={(e) => setPrinterType(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-4 text-xs font-bold text-white outline-none focus:border-purple-500/50 cursor-pointer shadow-inner"
              >
                <option value="browser">DIALOG PRINT BROWSER (DEFAULT)</option>
                <option value="lan">LAN / NETWORK PRINTER</option>
                <option value="bluetooth">WEB BLUETOOTH API</option>
              </select>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <label className="text-[10px] font-black text-gray-500 mb-2 block">UKURAN KERTAS (THERMAL PAPER)</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setPaperSize("58mm")}
                  className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "58mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
                >
                  KECIL (58 MM)
                </button>
                <button 
                  onClick={() => setPaperSize("80mm")}
                  className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "80mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}
                >
                  BESAR (80 MM)
                </button>
              </div>
            </div>

            {/* AUTO PRINT TOGGLE */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Cetak Otomatis</h3>
                  <p className="text-[9px] text-gray-500 normal-case mt-1 font-bold">Langsung cetak struk saat transaksi selesai</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 2: KONFIGURASI IP ADDRESS */}
        <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <Wifi size={18} className="text-blue-500" />
            <h2 className="text-sm font-black text-white tracking-widest">KONEKSI IP ADDRESS</h2>
          </div>

          <div className="space-y-6 flex-1">
            {/* IP KASIR UTAMA */}
            <div className="space-y-2 bg-blue-500/5 p-5 rounded-2xl border border-blue-500/20">
              <label className="text-[10px] font-black text-blue-400 tracking-widest block">IP KOMPUTER KASIR (PRINT SERVER)</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={localPrinterIp}
                  onChange={(e) => setLocalPrinterIp(e.target.value)}
                  placeholder="Contoh: 127.0.0.1"
                  className="w-full bg-[#0f172a] border border-blue-500/30 rounded-xl p-4 pl-10 focus:border-blue-500 outline-none font-mono font-bold text-blue-400 placeholder:text-gray-700 text-sm shadow-inner"
                />
                <Server size={16} className="absolute left-4 top-4 text-blue-600" />
              </div>
              <p className="text-[9px] text-gray-500 normal-case mt-2 leading-relaxed">
                * Isi <span className="font-bold text-gray-300">127.0.0.1</span> jika di layar Kasir. Isi IP Kasir (misal: <span className="font-bold text-gray-300">192.168.1.10</span>) jika diakses dari tablet Waiter.
              </p>
            </div>

            {/* MUNCUL JIKA MEMILIH LAN (PRINTER DAPUR) */}
            <div className={`transition-all duration-300 overflow-hidden ${printerType === "lan" ? "opacity-100 max-h-40" : "opacity-0 max-h-0"}`}>
              <div className="space-y-2 bg-purple-500/5 p-5 rounded-2xl border border-purple-500/20">
                <label className="text-[10px] font-black text-purple-400 tracking-widest block">ALAMAT IP PRINTER LAN (DAPUR/BAR)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={lanIp}
                    onChange={(e) => setLanIp(e.target.value)}
                    placeholder="Contoh: 192.168.1.120"
                    className="w-full bg-[#0f172a] border border-purple-500/30 rounded-xl p-4 pl-10 focus:border-purple-500 outline-none font-mono font-bold text-purple-400 placeholder:text-gray-700 text-sm shadow-inner"
                  />
                  <Printer size={16} className="absolute left-4 top-4 text-purple-600" />
                </div>
                <p className="text-[9px] text-gray-500 normal-case mt-2 leading-relaxed">
                  * Digunakan khusus jika ada printer ethernet/WIFI yang langsung terhubung ke jaringan untuk cetak otomatis order Waiter.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}