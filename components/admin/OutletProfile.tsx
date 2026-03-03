import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Store, Save, Loader2, Mail, Phone, Globe, ShieldCheck, Box } from "lucide-react";

export default function OutletProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    address: "",
    phone: "",
    email: "nessbarandpool@gmail.com",
    is_public: true,
    company_type: "Personal",
    business_type: "Restoran",
    inventory_method: "Average"
  });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data } = await supabase.from("outlet_profile").select("*").eq("id", 1).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("outlet_profile").upsert({ id: 1, ...profile });
    alert("INFO TOKO BERHASIL DIPERBARUI!");
    setSaving(false);
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 italic uppercase font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tighter italic">Info Toko</h1>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 not-italic">
        
        {/* IDENTITAS UTAMA */}
        <div className="space-y-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-[10px] font-black text-blue-500 tracking-widest flex items-center gap-2 mb-4">
            <Store size={14} /> INFORMASI DASAR
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">NAMA TOKO</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold uppercase text-white" 
                value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-4 top-4 text-gray-600" size={18} />
                <input type="email" className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl font-bold text-white lowercase" 
                  value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2">TELPON</label>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-gray-600" size={18} />
                <input type="text" className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl font-bold text-white" 
                  value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* KONFIGURASI SISTEM */}
        <div className="space-y-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-[10px] font-black text-emerald-500 tracking-widest flex items-center gap-2 mb-4">
            <ShieldCheck size={14} /> PUBLIKASI & TIPE
          </h3>

          <div className="space-y-6">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <p className="text-[10px] font-black text-white">PUBLIKASI TOKO</p>
                <p className="text-[8px] text-gray-500 italic">Siap publikasikan toko untuk pembeli</p>
              </div>
              <select className="bg-emerald-600 text-[10px] font-black px-4 py-2 rounded-xl"
                value={profile.is_public ? "Ya" : "Tidak"} onChange={(e) => setProfile({...profile, is_public: e.target.value === "Ya"})}>
                <option>Ya</option>
                <option>Tidak</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2 uppercase">Tipe Perusahaan</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white uppercase" 
                  value={profile.company_type} readOnly />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 ml-2 uppercase">Tipe Bisnis</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white uppercase" 
                  value={profile.business_type} readOnly />
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Box className="text-blue-500" size={16} />
                <p className="text-[10px] font-black text-white">STOK SISTEM</p>
              </div>
              <p className="text-xl font-black text-blue-400 italic tracking-tighter">
                {profile.inventory_method}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <button disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[1.5rem] font-black italic tracking-widest text-[11px] flex justify-center items-center gap-3 transition-all">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> SIMPAN PERUBAHAN INFO TOKO</>}
          </button>
        </div>
      </form>
    </div>
  );
}