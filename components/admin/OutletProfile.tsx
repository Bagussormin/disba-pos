import React, { useState, useEffect } from "react";
import { useTenant } from "../../hooks/useTenant";
import { supabase } from "../../lib/supabase";
import { 
  Store, Save, Loader2, Mail, Phone, Box, ShieldCheck, 
  Percent, Gift, ToggleLeft, ToggleRight, Settings2 
} from "lucide-react";

interface ProfileState {
  name: string;
  address: string;
  phone: string;
  email: string;
  is_public: boolean;
  company_type: string;
  business_type: string;
  inventory_method: string;
}

interface FiscalSettings {
  tax_rate: number | string;
  service_charge: number | string;
  use_tax: boolean;
  use_service_charge: boolean;
  loyalty_point_rate: number | string;
  store_name: string;
  address: string;
  contact: string;
  footer_text: string;
  bridge_ip: string;
  cashier_printer_ip: string;
  kitchen_printer_ip: string;
  bar_printer_ip: string;
  office_printer_ip: string;
  [key: string]: any;
}

export default function OutletProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    address: "",
    phone: "",
    email: "",
    is_public: true,
    company_type: "Personal",
    business_type: "Restoran",
    inventory_method: "Average"
  });

  const [fiscal, setFiscal] = useState<FiscalSettings>({
    tax_rate: 10,
    service_charge: 5,
    use_tax: true,
    use_service_charge: true,
    loyalty_point_rate: 1000,
    store_name: "",
    address: "",
    contact: "",
    footer_text: "Terima Kasih sudah berkunjung!",
    bridge_ip: "127.0.0.1",
    cashier_printer_ip: "",
    kitchen_printer_ip: "",
    bar_printer_ip: "",
    office_printer_ip: ""
  });

  const { tenantId } = useTenant();

  useEffect(() => { 
    if (tenantId) {
      fetchProfile(); 
      fetchFiscal();
    }
  }, [tenantId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("outlet_profile")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) console.error("Error fetching profile:", error.message);
    if (data) setProfile(data);
    else setProfile((prev: any) => ({ ...prev, name: tenantId }));
    setLoading(false);
  };

  const fetchFiscal = async () => {
    const { data, error } = await supabase
      .from("receipt_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) console.error("Error fetching fiscal settings:", error.message);
    if (data) {
      setFiscal({
        tax_rate: (data.tax_rate || 0.10) * 100,
        service_charge: (data.service_charge || 0.05) * 100,
        use_tax: data.use_tax !== false,
        use_service_charge: data.use_service_charge !== false,
        loyalty_point_rate: data.loyalty_point_rate || 1000,
        store_name: data.store_name || "",
        address: data.address || "",
        contact: data.contact || "",
        footer_text: data.footer_text || "Terima Kasih",
        bridge_ip: data.bridge_ip || "127.0.0.1",
        cashier_printer_ip: data.cashier_printer_ip || "",
        kitchen_printer_ip: data.kitchen_printer_ip || "",
        bar_printer_ip: data.bar_printer_ip || "",
        office_printer_ip: data.office_printer_ip || ""
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return alert("Sesi tidak valid!");
    setSaving(true);
    
    // Save outlet profile
    const { error: profileError } = await supabase
      .from("outlet_profile")
      .upsert({ ...profile, tenant_id: tenantId }, { onConflict: 'tenant_id' });

    // Save fiscal / receipt settings
    const fiscalPayload = {
      tenant_id: tenantId,
      store_name: fiscal.store_name || profile.name,
      address: fiscal.address,
      contact: fiscal.contact,
      footer_text: fiscal.footer_text,
      bridge_ip: fiscal.bridge_ip,
      cashier_printer_ip: fiscal.cashier_printer_ip,
      kitchen_printer_ip: fiscal.kitchen_printer_ip,
      bar_printer_ip: fiscal.bar_printer_ip,
      office_printer_ip: fiscal.office_printer_ip,
      tax_rate: Number(fiscal.tax_rate) / 100,
      service_charge: Number(fiscal.service_charge) / 100,
      use_tax: fiscal.use_tax,
      use_service_charge: fiscal.use_service_charge,
      loyalty_point_rate: Number(fiscal.loyalty_point_rate)
    };

    const { error: fiscalError } = await supabase
      .from("receipt_settings")
      .upsert(fiscalPayload, { onConflict: 'tenant_id' });

    if (profileError || fiscalError) {
      alert("GAGAL MENYIMPAN: " + (profileError?.message || fiscalError?.message));
    } else {
      alert("✅ Semua pengaturan berhasil disimpan!");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 italic uppercase font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tighter italic">Info Toko <span className="text-blue-500 text-sm">({tenantId})</span></h1>
        <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-1">PENGATURAN DINAMIS — Semua nilai berikut berlaku untuk semua terminal</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 not-italic">
        {/* ROW 1: Identitas & Publikasi */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
            <h3 className="text-[10px] font-black text-blue-500 tracking-widest flex items-center gap-2 mb-4">
              <Store size={14} /> IDENTITAS TOKO
            </h3>
            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">NAMA TOKO (Tampil di Struk)</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold uppercase text-white outline-none focus:border-blue-500"
                value={fiscal.store_name || profile.name || ""} onChange={(e) => setFiscal({ ...fiscal, store_name: e.target.value })} required />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">ALAMAT</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-blue-500"
                value={fiscal.address} onChange={(e) => setFiscal({ ...fiscal, address: e.target.value })} />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">KONTAK / NO HP</label>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-600" size={18} />
                <input type="text" className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl font-bold text-white outline-none focus:border-blue-500"
                  value={fiscal.contact} onChange={(e) => setFiscal({ ...fiscal, contact: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">FOOTER STRUK</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-blue-500"
                value={fiscal.footer_text} onChange={(e) => setFiscal({ ...fiscal, footer_text: e.target.value })} />
            </div>
          </div>

          {/* FISCAL SETTINGS */}
          <div className="space-y-4 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
            <h3 className="text-[10px] font-black text-emerald-500 tracking-widest flex items-center gap-2 mb-4">
              <Percent size={14} /> PENGATURAN FISKAL
            </h3>

            {/* Tax Toggle */}
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] font-black text-white">PAJAK (PB1 / PPN)</p>
                <p className="text-[8px] text-gray-500 italic">Dikenakan ke pelanggan</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white">{fiscal.tax_rate}%</span>
                <input type="number" min="0" max="30" step="0.5"
                  className="w-16 bg-blue-500/10 border border-blue-500/30 rounded-xl p-2 text-center text-blue-400 font-black outline-none text-xs"
                  value={fiscal.tax_rate} onChange={(e) => setFiscal({ ...fiscal, tax_rate: e.target.value })} />
                <button type="button" onClick={() => setFiscal({ ...fiscal, use_tax: !fiscal.use_tax })}
                  className={`transition-all ${fiscal.use_tax ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {fiscal.use_tax ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>

            {/* Service Charge Toggle */}
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] font-black text-white">SERVICE CHARGE</p>
                <p className="text-[8px] text-gray-500 italic">Biaya layanan restoran</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-white">{fiscal.service_charge}%</span>
                <input type="number" min="0" max="30" step="0.5"
                  className="w-16 bg-purple-500/10 border border-purple-500/30 rounded-xl p-2 text-center text-purple-400 font-black outline-none text-xs"
                  value={fiscal.service_charge} onChange={(e) => setFiscal({ ...fiscal, service_charge: e.target.value })} />
                <button type="button" onClick={() => setFiscal({ ...fiscal, use_service_charge: !fiscal.use_service_charge })}
                  className={`transition-all ${fiscal.use_service_charge ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {fiscal.use_service_charge ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
            </div>

            {/* Loyalty Point Rate */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Gift size={14} className="text-yellow-500" />
                <p className="text-[10px] font-black text-white">LOYALTY POINT RATE</p>
              </div>
              <p className="text-[8px] text-gray-500 italic mb-3">Setiap Rp __ belanja = 1 poin pelanggan</p>
              <input type="number" min="100" step="100"
                className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center text-yellow-400 font-black text-xl outline-none"
                value={fiscal.loyalty_point_rate} onChange={(e) => setFiscal({ ...fiscal, loyalty_point_rate: e.target.value })} />
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Box size={14} className="text-blue-500" />
                <p className="text-[10px] font-black text-white">METODE STOK</p>
              </div>
              <select className="w-full bg-transparent text-xl font-black text-blue-400 italic tracking-tighter outline-none appearance-none cursor-pointer"
                value={profile.inventory_method || "Average"} onChange={(e) => setProfile({ ...profile, inventory_method: e.target.value })}>
                <option className="bg-slate-900 text-sm">Average</option>
                <option className="bg-slate-900 text-sm">FIFO</option>
                <option className="bg-slate-900 text-sm">LIFO</option>
              </select>
            </div>
          </div>
        </div>

        {/* ROW 2: PRINTER SETTINGS */}
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-[10px] font-black text-orange-400 tracking-widest flex items-center gap-2 mb-6">
            <Settings2 size={14} /> PRINTER & BRIDGE CONFIG
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "BRIDGE IP", key: "bridge_ip", placeholder: "127.0.0.1", color: "blue" },
              { label: "PRINTER KASIR IP", key: "cashier_printer_ip", placeholder: "192.168.1.xxx", color: "emerald" },
              { label: "PRINTER DAPUR IP", key: "kitchen_printer_ip", placeholder: "192.168.1.xxx", color: "orange" },
              { label: "PRINTER BAR IP", key: "bar_printer_ip", placeholder: "192.168.1.xxx", color: "purple" },
              { label: "PRINTER OFFICE IP", key: "office_printer_ip", placeholder: "192.168.1.xxx", color: "gray" },
            ].map(({ label, key, placeholder, color }) => (
              <div key={key}>
                <label className={`text-[9px] font-black text-${color}-400 block mb-2 ml-2 uppercase tracking-widest`}>{label}</label>
                <input type="text"
                  className={`w-full bg-white/5 border border-${color}-500/20 p-4 rounded-2xl font-mono font-bold text-white outline-none focus:border-${color}-500`}
                  placeholder={placeholder}
                  value={fiscal[key]} onChange={(e) => setFiscal({ ...fiscal, [key]: e.target.value })} />
              </div>
            ))}
          </div>
        </div>

        <button disabled={saving || !tenantId} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 py-5 rounded-[1.5rem] font-black italic tracking-widest text-[11px] flex justify-center items-center gap-3 transition-all shadow-xl shadow-blue-500/20">
          {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> SIMPAN SEMUA PENGATURAN</>}
        </button>
      </form>
    </div>
  );
}