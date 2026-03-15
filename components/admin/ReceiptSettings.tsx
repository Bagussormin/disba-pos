import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Save, Printer, Store, MapPin, Phone, AtSign, Wifi, MessageSquare } from "lucide-react";

export default function ReceiptSettings() {
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "NES_HOUSE_001" : "NES_HOUSE_001";
  
  const [settings, setSettings] = useState({
    store_name: "NES House Cold Brew",
    address: "Alamat Outlet Anda",
    contact: "WA: 08xx-xxxx-xxxx",
    social_media: "@neshouse.id",
    wifi_info: "Password WiFi: -",
    footer_text: "Terima kasih atas kunjungannya!"
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("receipt_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (data) {
      setSettings(data);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("receipt_settings")
        .update({
          store_name: settings.store_name,
          address: settings.address,
          contact: settings.contact,
          social_media: settings.social_media,
          wifi_info: settings.wifi_info,
          footer_text: settings.footer_text,
          updated_at: new Date().toISOString()
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;
      alert("Pengaturan Struk Berhasil Disimpan! 🎉");
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 🔥 ERROR 1 HILANG KARENA 'React' SUDAH DI-IMPORT DI ATAS
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  if (isLoading) return <div className="p-8 text-white font-black italic">MEMUAT PENGATURAN...</div>;

  return (
    <div className="p-6 bg-[#020617] text-white min-h-screen font-sans uppercase italic">
      <div className="mb-6 border-b border-white/10 pb-4">
        <h1 className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <Printer className="text-blue-500" /> RECEIPT_BUILDER
        </h1>
        <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">Atur tampilan struk kasir DISBA POS Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* KIRI: FORM INPUT */}
        <div className="md:col-span-7 bg-black/40 border border-white/5 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><Store size={12}/> Nama_Toko</label>
              <input type="text" name="store_name" value={settings.store_name} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
            </div>
            
            <div>
              <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><MapPin size={12}/> Alamat</label>
              <textarea name="address" rows={2} value={settings.address} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><Phone size={12}/> Kontak / WA</label>
                <input type="text" name="contact" value={settings.contact} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><AtSign size={12}/> Sosial Media</label>
                <input type="text" name="social_media" value={settings.social_media} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><Wifi size={12}/> Info WiFi (Opsional)</label>
              <input type="text" name="wifi_info" value={settings.wifi_info} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-400 flex items-center gap-1 mb-1"><MessageSquare size={12}/> Pesan Bawah (Footer)</label>
              <input type="text" name="footer_text" value={settings.footer_text} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isSaving ? "MENYIMPAN..." : <><Save size={16} /> Simpan Pengaturan</>}
          </button>
        </div>

        {/* KANAN: LIVE PREVIEW STRUK */}
        <div className="md:col-span-5 flex items-start justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
          {/* Efek cahaya */}
          <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
          
          <div className="bg-white text-black p-6 w-full max-w-[300px] font-mono shadow-2xl relative uppercase italic font-bold transform rotate-1 transition-all hover:rotate-0">
            {/* Gerigi Kertas Atas */}
            <div className="absolute -top-2 left-0 w-full h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIHBvaW50cz0iMCwwIDQsOCA4LDAiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] repeat-x"></div>
            
            <div className="text-center mb-4">
              <h3 className="font-black text-xl border-b-2 border-black border-double pb-2 mb-2 tracking-tighter">
                {settings.store_name || "NAMA TOKO"}
              </h3>
              <p className="text-[9px] leading-tight">{settings.address}</p>
              <p className="text-[9px] mt-1">{settings.contact}</p>
            </div>
            
            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="text-[10px] space-y-1 my-4 opacity-50">
              <div className="flex justify-between"><span>1x COFFEE MILK</span> <span>18,000</span></div>
              <div className="flex justify-between"><span>2x SNACK PLATTER</span> <span>40,000</span></div>
            </div>
            
            <div className="border-b border-black border-dashed my-2"></div>
            
            <div className="text-center mt-4 space-y-1">
              {settings.wifi_info && <p className="text-[9px] font-black bg-gray-100 py-1">{settings.wifi_info}</p>}
              <p className="text-[9px]">{settings.social_media}</p>
              <p className="text-[8px] mt-2 font-black tracking-widest">{settings.footer_text}</p>
            </div>

            {/* Gerigi Kertas Bawah */}
            <div className="absolute -bottom-2 left-0 w-full h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIHBvaW50cz0iMCw4IDQsMCA4LDgiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] repeat-x"></div>
          </div>
        </div>

      </div>
    </div>
  );
}