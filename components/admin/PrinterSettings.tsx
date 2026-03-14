import { useState, useEffect } from "react";

export default function PrinterSettings() {
  const [paperSize, setPaperSize] = useState("58mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerType, setPrinterType] = useState("browser");
  const [lanIp, setLanIp] = useState("");
  const [localPrinterIp, setLocalPrinterIp] = useState("");

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
    
    alert(`🖨️ Pengaturan Printer berhasil disimpan untuk outlet ${tenantId}!`);
  };

  return (
    <div className="p-6 max-w-2xl bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 italic">
      <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-4">
        Pengaturan <span className="text-blue-500">Printer</span>
      </h2>

      <div className="space-y-6">
        
        {/* IP KASIR (PRINT SERVER) */}
        <div className="space-y-2 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
          <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">IP Komputer Kasir (Print Server)</label>
          <input 
            type="text" 
            placeholder="127.0.0.1 (Jika komputer ini adalah kasir)"
            value={localPrinterIp}
            onChange={(e) => setLocalPrinterIp(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold font-mono text-white focus:border-blue-500/50 outline-none"
          />
          <p className="text-[8px] text-gray-400 mt-1 uppercase">
            * Isi 127.0.0.1 jika di Kasir. Isi IP Kasir (misal: 192.168.1.10) jika di tablet Waiter.
          </p>
        </div>

        {/* UKURAN KERTAS */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ukuran Kertas Thermal</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setPaperSize("58mm")}
              className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${paperSize === "58mm" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
            >
              Kecil (58mm)
            </button>
            <button 
              onClick={() => setPaperSize("80mm")}
              className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${paperSize === "80mm" ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}
            >
              Besar (80mm)
            </button>
          </div>
        </div>

        {/* METODE CETAK */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode Koneksi</label>
          <select 
            value={printerType}
            onChange={(e) => setPrinterType(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-blue-500/50"
          >
            <option value="browser">Dialog Print Browser (Default)</option>
            <option value="bluetooth">Web Bluetooth API</option>
            <option value="lan">LAN / Network Printer</option>
          </select>

          {/* MUNCUL JIKA MEMILIH LAN */}
          {printerType === "lan" && (
            <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
               <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Alamat IP Printer LAN (Dapur/Bar)</label>
               <input 
                 type="text" 
                 placeholder="Contoh: 192.168.1.120"
                 value={lanIp}
                 onChange={(e) => setLanIp(e.target.value)}
                 className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 mt-2 text-sm text-white focus:border-purple-500/50 outline-none"
               />
               <p className="text-[9px] text-gray-400 mt-2 uppercase">
                 * Digunakan khusus jika Anda menggunakan printer ethernet langsung ke jaringan.
               </p>
            </div>
          )}
        </div>

        {/* AUTO PRINT */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cetak Otomatis</h3>
            <p className="text-[10px] text-gray-400 font-medium">Langsung cetak struk saat transaksi selesai</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {/* TOMBOL SIMPAN */}
        <button 
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 transition-all uppercase tracking-widest text-[11px] mt-4"
        >
          Simpan Konfigurasi Printer
        </button>
      </div>
    </div>
  );
}