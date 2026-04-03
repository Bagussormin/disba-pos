import { useState, useEffect } from "react";
import { Printer, Server, Monitor, CheckCircle2, AlertCircle, Save, Wifi, Coffee, ChefHat, MonitorSmartphone, Bluetooth, Play, Loader2 } from "lucide-react";

// 🔥 PERBAIKAN BUG 2: RenderSlot DIPINDAH KE LUAR AGAR KURSOR TIDAK HILANG SAAT MENGETIK
const RenderSlot = ({ title, id, icon: Icon, config, setConfig, placeholder, colorClass, bgClass, borderClass, testingSlot, handleTestPrint }: any) => (
  <div className={`p-4 rounded-2xl border transition-all ${bgClass} ${borderClass}`}>
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgClass}`}><Icon size={16} className={colorClass}/></div>
        <label className={`text-[10px] font-black tracking-widest ${colorClass}`}>{title}</label>
      </div>
      
      <div className="flex items-center gap-2">
          {/* 🔥 TOMBOL TEST */}
          <button 
              onClick={() => handleTestPrint(id, config)}
              disabled={testingSlot === id}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[9px] font-black tracking-widest transition-all border ${config.type === 'off' ? 'hidden' : 'flex'} ${testingSlot === id ? 'bg-gray-500 border-gray-400' : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'}`}
          >
              {testingSlot === id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              {testingSlot === id ? "FIRING..." : "TEST"}
          </button>

          <select 
              value={config.type} 
              onChange={(e) => setConfig({ ...config, type: e.target.value })}
              className={`bg-[#0f172a] border ${borderClass} rounded-lg px-2 py-1 text-[9px] font-black ${colorClass} outline-none cursor-pointer`}
          >
              <option value="lan">🌐 LAN IP</option>
              <option value="browser">🔵 BLUETOOTH / BROWSER</option>
              <option value="off">❌ MATIKAN</option>
          </select>
      </div>
    </div>
    
    {config.type === "lan" && (
      <div className="mt-2 animate-in fade-in slide-in-from-top-1">
          <input 
              type="text" 
              value={config.ip} 
              onChange={(e) => setConfig({ ...config, ip: e.target.value })} 
              placeholder={placeholder} 
              className={`w-full bg-black/40 border ${borderClass} rounded-xl py-3 px-3 text-sm font-mono font-bold text-white focus:border-white outline-none placeholder:text-gray-600`}
          />
      </div>
    )}
  </div>
);

export default function PrinterSettings() {
  const [paperSize, setPaperSize] = useState("58mm");
  const [autoPrint, setAutoPrint] = useState(false);
  const [printerType, setPrinterType] = useState("browser");
  const [localPrinterIp, setLocalPrinterIp] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [testingSlot, setTestingSlot] = useState<string | null>(null);

  const [kasirConfig, setKasirConfig] = useState({ type: "browser", ip: "" });
  const [dapurConfig, setDapurConfig] = useState({ type: "lan", ip: "" });
  const [barConfig, setBarConfig] = useState({ type: "lan", ip: "" });
  const [st4Config, setSt4Config] = useState({ type: "lan", ip: "" });
  const [st5Config, setSt5Config] = useState({ type: "lan", ip: "" });

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DEFAULT" : "DEFAULT";

  useEffect(() => {
    setPaperSize(localStorage.getItem(`disba_printer_size_${tenantId}`) || "58mm");
    setAutoPrint(localStorage.getItem(`disba_printer_auto_${tenantId}`) === "true");
    setPrinterType(localStorage.getItem(`disba_printer_type_${tenantId}`) || "browser");
    setLocalPrinterIp(localStorage.getItem("printer_ip") || "127.0.0.1"); 
    
    setKasirConfig({
        type: localStorage.getItem(`disba_type_kasir_${tenantId}`) || "browser",
        ip: localStorage.getItem(`disba_ip_kasir_${tenantId}`) || ""
    });
    setDapurConfig({
        type: localStorage.getItem(`disba_type_dapur_${tenantId}`) || "lan",
        ip: localStorage.getItem(`disba_ip_dapur_${tenantId}`) || ""
    });
    setBarConfig({
        type: localStorage.getItem(`disba_type_bar_${tenantId}`) || "lan",
        ip: localStorage.getItem(`disba_ip_bar_${tenantId}`) || ""
    });
    setSt4Config({
        type: localStorage.getItem(`disba_type_st4_${tenantId}`) || "lan",
        ip: localStorage.getItem(`disba_ip_st4_${tenantId}`) || ""
    });
    setSt5Config({
        type: localStorage.getItem(`disba_type_st5_${tenantId}`) || "lan",
        ip: localStorage.getItem(`disba_ip_st5_${tenantId}`) || ""
    });
  }, [tenantId]);

  const handleSave = () => {
    localStorage.setItem(`disba_printer_size_${tenantId}`, paperSize);
    localStorage.setItem(`disba_printer_auto_${tenantId}`, String(autoPrint));
    localStorage.setItem(`disba_printer_type_${tenantId}`, printerType); 
    localStorage.setItem("printer_ip", localPrinterIp); 
    
    localStorage.setItem(`disba_type_kasir_${tenantId}`, kasirConfig.type);
    localStorage.setItem(`disba_ip_kasir_${tenantId}`, kasirConfig.ip);
    localStorage.setItem(`disba_type_dapur_${tenantId}`, dapurConfig.type);
    localStorage.setItem(`disba_ip_dapur_${tenantId}`, dapurConfig.ip);
    localStorage.setItem(`disba_type_bar_${tenantId}`, barConfig.type);
    localStorage.setItem(`disba_ip_bar_${tenantId}`, barConfig.ip);
    localStorage.setItem(`disba_type_st4_${tenantId}`, st4Config.type);
    localStorage.setItem(`disba_ip_st4_${tenantId}`, st4Config.ip);
    localStorage.setItem(`disba_type_st5_${tenantId}`, st5Config.type);
    localStorage.setItem(`disba_ip_st5_${tenantId}`, st5Config.ip);
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestPrint = async (slotName: string, config: any) => {
    if (config.type === "off") return alert("STATION INI SEDANG MATI!");
    if (config.type === "browser") return window.print();

    setTestingSlot(slotName);
    try {
      const response = await fetch(`http://${localPrinterIp}:4000/print-lan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp: config.ip,
          content: `\n[ TEST PRINT ]\nSTATION: ${slotName.toUpperCase()}\nTENANT: ${tenantId}\nSTATUS: KONEKSI BERHASIL\n--------------------------\n\n\n`
        })
      });

      if (response.ok) {
        alert(`✅ TEMBAKAN BERHASIL KE ${slotName.toUpperCase()}!`);
      } else {
        alert(`❌ TEMBAKAN GAGAL! CEK KONEKSI KE SERVER NODE.JS`);
      }
    } catch (err) {
      alert(`❌ ERROR: SERVER TIDAK MERESPON!\nPASTIKAN SERVER.JS SUDAH JALAN DI IP ${localPrinterIp}`);
    } finally {
      setTestingSlot(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-white font-sans uppercase italic">
      
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
        
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Server size={18} className="text-orange-500" />
              <h2 className="text-sm font-black text-white tracking-widest">PRINT SERVER (NODE.JS)</h2>
            </div>
            <div className="space-y-2 bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20">
              <label className="text-[10px] font-black text-orange-400 tracking-widest block text-center mb-2">IP PC KASIR UTAMA (BRIDGE)</label>
              <input 
                type="text" value={localPrinterIp} onChange={(e) => setLocalPrinterIp(e.target.value)} placeholder="127.0.0.1"
                className="w-full bg-[#0f172a] border border-orange-500/30 rounded-xl p-4 focus:border-orange-500 outline-none font-mono font-bold text-orange-400 placeholder:text-gray-700 text-sm shadow-inner text-center tracking-widest"
              />
              <p className="text-[9px] text-gray-500 normal-case mt-3 text-center leading-relaxed">Gunakan IP PC Kasir agar HP/Tablet bisa mengakses Printer LAN.</p>
            </div>
          </div>

          <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <Monitor size={18} className="text-purple-500" />
              <h2 className="text-sm font-black text-white tracking-widest">GLOBAL SETTINGS</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPaperSize("58mm")} className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "58mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>KERTAS 58MM</button>
                <button onClick={() => setPaperSize("80mm")} className={`py-4 rounded-xl border text-[11px] font-mono font-black transition-all ${paperSize === "80mm" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>KERTAS 80MM</button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-black/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <Wifi size={18} className="text-blue-500" />
            <h2 className="text-sm font-black text-white tracking-widest">MULTI-STATION ROUTING</h2>
          </div>

          <div className="space-y-3">
            {/* 🔥 Props testingSlot dan handleTestPrint dipassing ke komponen anak dengan benar */}
            <RenderSlot id="kasir" title="STATION 1: KASIR UTAMA" icon={MonitorSmartphone} config={kasirConfig} setConfig={setKasirConfig} placeholder="192.168.1.27" colorClass="text-blue-400" bgClass="bg-blue-500/5" borderClass="border-blue-500/20" testingSlot={testingSlot} handleTestPrint={handleTestPrint} />
            <RenderSlot id="dapur" title="STATION 2: DAPUR (KITCHEN)" icon={ChefHat} config={dapurConfig} setConfig={setDapurConfig} placeholder="192.168.1.30" colorClass="text-red-400" bgClass="bg-red-500/5" borderClass="border-red-500/20" testingSlot={testingSlot} handleTestPrint={handleTestPrint} />
            <RenderSlot id="bar" title="STATION 3: BAR (MINUMAN)" icon={Coffee} config={barConfig} setConfig={setBarConfig} placeholder="192.168.1.24" colorClass="text-emerald-400" bgClass="bg-emerald-500/5" borderClass="border-emerald-500/20" testingSlot={testingSlot} handleTestPrint={handleTestPrint} />
            <RenderSlot id="st4" title="STATION 4: EKSTRA / KASIR 2" icon={Printer} config={st4Config} setConfig={setSt4Config} placeholder="192.168.1.xxx" colorClass="text-gray-300" bgClass="bg-gray-500/10" borderClass="border-gray-500/20" testingSlot={testingSlot} handleTestPrint={handleTestPrint} />
            <RenderSlot id="st5" title="STATION 5: EKSTRA / GUDANG" icon={Printer} config={st5Config} setConfig={setSt5Config} placeholder="192.168.1.xxx" colorClass="text-gray-300" bgClass="bg-gray-500/10" borderClass="border-gray-500/20" testingSlot={testingSlot} handleTestPrint={handleTestPrint} />
          </div>
        </div>

      </div>
    </div>
  );
}