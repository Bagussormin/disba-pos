import { useState, useEffect } from "react";
import { Printer, Server, Monitor, CheckCircle2, AlertCircle, Save, Wifi, Coffee, ChefHat, MonitorSmartphone } from "lucide-react";

export default function PrinterSettings() {
  const [paperSize, setPaperSize] = useState("58mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerType, setPrinterType] = useState("browser");
  const [localPrinterIp, setLocalPrinterIp] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // 🔥 5 SLOT IP LAN PRINTER
  const [ipKasir, setIpKasir] = useState("");
  const [ipDapur, setIpDapur] = useState("");
  const [ipBar, setIpBar] = useState("");
  const [ipStation4, setIpStation4] = useState("");
  const [ipStation5, setIpStation5] = useState("");

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DEFAULT" : "DEFAULT";

  useEffect(() => {
    setPaperSize(localStorage.getItem(`disba_printer_size_${tenantId}`) || "58mm");
    setAutoPrint(localStorage.getItem(`disba_printer_auto_${tenantId}`) === "true");
    setPrinterType(localStorage.getItem(`disba_printer_type_${tenantId}`) || "browser");
    setLocalPrinterIp(localStorage.getItem("printer_ip") || "127.0.0.1"); 
    
    // Load 5 Slot IP
    setIpKasir(localStorage.getItem(`disba_ip_kasir_${tenantId}`) || "");
    setIpDapur(localStorage.getItem(`disba_ip_dapur_${tenantId}`) || "");
    setIpBar(localStorage.getItem(`disba_ip_bar_${tenantId}`) || "");
    setIpStation4(localStorage.getItem(`disba_ip_st4_${tenantId}`) || "");
    setIpStation5(localStorage.getItem(`disba_ip_st5_${tenantId}`) || "");
  }, [tenantId]);

  const handleSave = () => {
    localStorage.setItem(`disba_printer_size_${tenantId}`, paperSize);
    localStorage.setItem(`disba_printer_auto_${tenantId}`, String(autoPrint));
    localStorage.setItem(`disba_printer_type_${tenantId}`, printerType);
    localStorage.setItem("printer_ip", localPrinterIp);
    
    // Save 5 Slot IP
    localStorage.setItem(`disba_ip_kasir_${tenantId}`, ipKasir);
    localStorage.setItem(`disba_ip_dapur_${tenantId}`, ipDapur);
    localStorage.setItem(`disba_ip_bar_${tenantId}`, ipBar);
    localStorage.setItem(`disba_ip_st4_${tenantId}`, ipStation4);
    localStorage.setItem(`disba_ip_st5_${tenantId}`, ipStation5);
    
    // Backward compatibility untuk KasirHome (mewarisi IP Kasir Utama)
    if (printerType === "lan") {
      localStorage.setItem(`disba_printer_lan_ip_${tenantId}`, ipKasir);
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-white font-sans uppercase italic">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-500 tracking-tighter flex items-center gap-3">
            <Printer size={32} /> Hardware_Config
          </h1>
          <p className="text-[10px] font-bold text-gray-400 tracking-[0.2em] mt-2">MULTI-STATION PRINTER CONTROL [TENANT: {tenantId}]</p>
        </div>
        <button 
          onClick={handleSave} 
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-[11px] font-black border border-blue-500/30 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 tracking-widest"
        >
          {isSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          {isSaved ? "TERSAVE!" : "SIMPAN KONFIGURASI"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* KOLOM KIRI: METODE & PRINT SERVER (Lebar 5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Server size={18} className="text-orange-500" />
              <h2 className="text-sm font-black text-white tracking-widest">PRINT SERVER (BRIDGE)</h2>
            </div>
            <div className="space-y-2 bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20">
              <label className="text-[10px] font-black text-orange-400 tracking-widest block">IP KOMPUTER KASIR UTAMA</label>
              <input 
                type="text" value={localPrinterIp} onChange={(e) => setLocalPrinterIp(e.target.value)} placeholder="127.0.0.1"
                className="w-full bg-[#0f172a] border border-orange-500/30 rounded-xl p-4 focus:border-orange-500 outline-none font-mono font-bold text-orange-400 placeholder:text-gray-700 text-sm shadow-inner text-center"
              />
              <p className="text-[9px] text-gray-500 normal-case mt-2 text-center">Isi <b>127.0.0.1</b> jika diakses dari Kasir.<br/>Isi IP Kasir jika diakses dari HP Waiter.</p>
            </div>
          </div>

          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Monitor size={18} className="text-purple-500" />
              <h2 className="text-sm font-black text-white tracking-widest">METODE CETAK KASIR</h2>
            </div>
            <div className="space-y-4">
              <select 
                value={printerType} onChange={(e) => setPrinterType(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-4 text-xs font-bold text-white outline-none focus:border-purple-500/50 cursor-pointer shadow-inner"
              >
                <option value="browser">BROWSER POPUP (DEFAULT)</option>
                <option value="lan">LAN / NETWORK PRINTER</option>
              </select>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button onClick={() => setPaperSize("58mm")} className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "58mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>58 MM</button>
                <button onClick={() => setPaperSize("80mm")} className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "80mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>80 MM</button>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: 5 SLOT IP LAN (Lebar 7/12) */}
        <div className="lg:col-span-7 bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <Wifi size={18} className="text-blue-500" />
            <h2 className="text-sm font-black text-white tracking-widest">MULTI-STATION LAN IP (KONEKSI FISIK)</h2>
          </div>

          <div className={`space-y-4 transition-all duration-500 ${printerType === 'browser' ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
            
            {/* Slot 1: KASIR */}
            <div className="flex items-center gap-4 bg-blue-500/5 p-3 rounded-2xl border border-blue-500/20">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0"><MonitorSmartphone size={20} className="text-blue-400"/></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-blue-400 tracking-widest mb-1 block">STATION 1: KASIR UTAMA</label>
                <input type="text" value={ipKasir} onChange={(e) => setIpKasir(e.target.value)} placeholder="192.168.1.27" className="w-full bg-transparent border-b border-blue-500/30 py-1 text-sm font-mono font-bold text-white focus:border-blue-400 outline-none"/>
              </div>
            </div>

            {/* Slot 2: DAPUR */}
            <div className="flex items-center gap-4 bg-red-500/5 p-3 rounded-2xl border border-red-500/20">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0"><ChefHat size={20} className="text-red-400"/></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-red-400 tracking-widest mb-1 block">STATION 2: DAPUR (KITCHEN)</label>
                <input type="text" value={ipDapur} onChange={(e) => setIpDapur(e.target.value)} placeholder="192.168.1.30" className="w-full bg-transparent border-b border-red-500/30 py-1 text-sm font-mono font-bold text-white focus:border-red-400 outline-none"/>
              </div>
            </div>

            {/* Slot 3: BAR */}
            <div className="flex items-center gap-4 bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0"><Coffee size={20} className="text-emerald-400"/></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-emerald-400 tracking-widest mb-1 block">STATION 3: BAR (MINUMAN)</label>
                <input type="text" value={ipBar} onChange={(e) => setIpBar(e.target.value)} placeholder="192.168.1.24" className="w-full bg-transparent border-b border-emerald-500/30 py-1 text-sm font-mono font-bold text-white focus:border-emerald-400 outline-none"/>
              </div>
            </div>

            {/* Slot 4: CADANGAN 1 */}
            <div className="flex items-center gap-4 bg-gray-500/10 p-3 rounded-2xl border border-gray-500/20">
              <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center shrink-0"><Printer size={20} className="text-gray-400"/></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-400 tracking-widest mb-1 block">STATION 4: EKSTRA / KASIR 2</label>
                <input type="text" value={ipStation4} onChange={(e) => setIpStation4(e.target.value)} placeholder="192.168.1.xxx" className="w-full bg-transparent border-b border-gray-500/30 py-1 text-sm font-mono font-bold text-white focus:border-gray-400 outline-none"/>
              </div>
            </div>

            {/* Slot 5: CADANGAN 2 */}
            <div className="flex items-center gap-4 bg-gray-500/10 p-3 rounded-2xl border border-gray-500/20">
              <div className="w-10 h-10 rounded-xl bg-gray-500/20 flex items-center justify-center shrink-0"><Printer size={20} className="text-gray-400"/></div>
              <div className="flex-1">
                <label className="text-[9px] font-black text-gray-400 tracking-widest mb-1 block">STATION 5: EKSTRA / GUDANG</label>
                <input type="text" value={ipStation5} onChange={(e) => setIpStation5(e.target.value)} placeholder="192.168.1.xxx" className="w-full bg-transparent border-b border-gray-500/30 py-1 text-sm font-mono font-bold text-white focus:border-gray-400 outline-none"/>
              </div>
            </div>

            <p className="text-[9px] text-gray-500 normal-case mt-4 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
              *Hanya berfungsi jika "Metode Cetak" menggunakan <b>LAN/Network</b>. IP ini akan langsung ditembak oleh Print Server Node.js (Port 4000).
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}