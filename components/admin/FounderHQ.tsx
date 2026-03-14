import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Building2, ShieldAlert, CalendarClock, Power, 
  Plus, Search, MoreVertical, LogIn, Save, X, Activity
} from "lucide-react";

export default function FounderHQ() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: "",
    business_name: "",
    subscription_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], // Default +1 Bulan
    is_active: true
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (!error && data) setTenants(data);
    setLoading(false);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      tenant_id: formData.tenant_id.toUpperCase().replace(/\s+/g, '_'),
      business_name: formData.business_name,
      subscription_end: formData.subscription_end,
      is_active: formData.is_active,
      features: { pos: true, inventory: true, hr: true } // Default Full Features
    };

    // Upsert (Insert jika baru, Update jika tenant_id sudah ada)
    const { error } = await supabase.from("tenants").upsert(payload);

    if (error) {
      alert("Gagal menyimpan klien: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ tenant_id: "", business_name: "", subscription_end: "", is_active: true });
      fetchTenants();
      alert("Operasi Klien Berhasil!");
    }
    setLoading(false);
  };

  const toggleStatus = async (tenantId: string, currentStatus: boolean) => {
    if (confirm(`Yakin ingin ${currentStatus ? 'MEMBLOKIR' : 'MENGAKTIFKAN'} klien ini?`)) {
      await supabase.from("tenants").update({ is_active: !currentStatus }).eq("tenant_id", tenantId);
      fetchTenants();
    }
  };

  // 🔥 FITUR DEWA: MASUK SEBAGAI KLIEN TANPA PASSWORD
  const impersonateTenant = (tenantId: string) => {
    if (confirm(`Masuk ke Backoffice sebagai ${tenantId}?`)) {
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", "FOUNDER_OVERRIDE");
      localStorage.setItem("tenant_id", tenantId);
      window.location.href = "/admin/dashboard"; // Arahkan ke Backoffice klien
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.tenant_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050b14] text-white font-sans p-8 selection:bg-blue-500/30 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="fixed top-[-10%] left-[-5%] w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-96 h-96 bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="text-red-500" size={24} />
              <h2 className="text-[10px] font-black tracking-[0.5em] text-red-500 uppercase">Level 5 Clearance</h2>
            </div>
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">
              Founder <span className="text-blue-500">HQ</span>
            </h1>
            <p className="text-xs text-gray-500 font-bold tracking-widest mt-2 uppercase">Global Infrastructure Control</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 bg-black/50 border border-white/10 rounded-2xl flex items-center px-4 py-1">
              <Search size={16} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="CARI KLIEN..."
                className="bg-transparent border-none outline-none text-xs font-black uppercase text-white p-3 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setFormData({ tenant_id: "", business_name: "", subscription_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], is_active: true });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={16} /> Deploy Klien Baru
            </button>
          </div>
        </header>

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Outlets</p>
              <p className="text-3xl font-black italic">{tenants.length}</p>
            </div>
            <Building2 size={32} className="text-blue-500 opacity-50" />
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active License</p>
              <p className="text-3xl font-black italic text-emerald-500">{tenants.filter(t => t.is_active).length}</p>
            </div>
            <Activity size={32} className="text-emerald-500 opacity-50" />
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Suspended</p>
              <p className="text-3xl font-black italic text-red-500">{tenants.filter(t => !t.is_active).length}</p>
            </div>
            <Power size={32} className="text-red-500 opacity-50" />
          </div>
        </div>

        {/* TENANT LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTenants.map(tenant => {
            const isExpired = new Date(tenant.subscription_end) < new Date();
            
            return (
              <div key={tenant.tenant_id} className={`bg-white/[0.02] border p-6 rounded-[2.5rem] transition-all relative group ${
                !tenant.is_active ? 'border-red-500/20 grayscale opacity-70' : isExpired ? 'border-orange-500/30' : 'border-white/5 hover:border-blue-500/30'
              }`}>
                
                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    !tenant.is_active ? 'bg-red-500/10 text-red-500' : isExpired ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {!tenant.is_active ? 'SUSPENDED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter w-3/4 truncate">{tenant.business_name}</h3>
                  <p className="text-[10px] text-blue-400 font-mono mt-1 font-bold">{tenant.tenant_id}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-xs font-black text-gray-400">
                    <CalendarClock size={14} className={isExpired ? "text-orange-500" : ""} /> 
                    <span className="uppercase">Exp: {new Date(tenant.subscription_end).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}</span>
                  </div>
                  <div className="flex gap-2">
                     <span className="text-[8px] px-2 py-1 bg-white/5 rounded text-gray-500 font-bold uppercase">POS</span>
                     <span className="text-[8px] px-2 py-1 bg-white/5 rounded text-gray-500 font-bold uppercase">INV</span>
                     <span className="text-[8px] px-2 py-1 bg-white/5 rounded text-gray-500 font-bold uppercase">QR</span>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-white/5 pt-4">
                  {/* Action Buttons */}
                  <button 
                    onClick={() => impersonateTenant(tenant.tenant_id)}
                    className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white py-3 rounded-xl flex justify-center items-center gap-2 text-[9px] font-black uppercase transition-all"
                  >
                    <LogIn size={14} /> Kunjungi Backoffice
                  </button>
                  <button 
                    onClick={() => {
                      setFormData({ ...tenant });
                      setIsModalOpen(true);
                    }}
                    className="w-12 bg-white/5 hover:bg-white/10 flex justify-center items-center rounded-xl text-gray-400 hover:text-white transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>
                  <button 
                    onClick={() => toggleStatus(tenant.tenant_id, tenant.is_active)}
                    className={`w-12 flex justify-center items-center rounded-xl transition-all ${
                      tenant.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                    }`}
                  >
                    <Power size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL TAMBAH/EDIT KLIEN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1120] border border-blue-500/20 w-full max-w-md p-8 rounded-[3rem] shadow-[0_0_50px_rgba(37,99,235,0.1)] relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X size={20}/></button>
            
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8 text-blue-500">
              {formData.tenant_id ? "Edit_Klien" : "Deploy_Klien_Baru"}
            </h2>

            <form onSubmit={handleSaveTenant} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Tenant ID (Kunci Database)</label>
                <input 
                  type="text" required placeholder="E.G. ALPHA_001"
                  disabled={!!formData.tenant_id} // Tidak boleh diedit jika sudah ada
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500 disabled:opacity-50"
                  value={formData.tenant_id}
                  onChange={e => setFormData({...formData, tenant_id: e.target.value})}
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Nama Bisnis</label>
                <input 
                  type="text" required placeholder="Nama Kafe / Resto"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500"
                  value={formData.business_name}
                  onChange={e => setFormData({...formData, business_name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Batas Langganan (Expired Date)</label>
                <input 
                  type="date" required
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white uppercase outline-none focus:border-blue-500"
                  value={formData.subscription_end}
                  onChange={e => setFormData({...formData, subscription_end: e.target.value})}
                />
              </div>

              <button disabled={loading} type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] mt-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                <Save size={16} /> {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}