import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Building2, ShieldAlert, CalendarClock, Power, 
  Plus, Search, MoreVertical, LogIn, Save, X, Activity, 
  Globe, Zap, LayoutDashboard, ShieldCheck
} from "lucide-react";

interface Tenant {
  tenant_id: string;
  business_name: string;
  plan_name: string;
  subscription_end: string;
  is_active: boolean;
  features: {
    pos: boolean;
    has_hpp: boolean;
    has_inventory: boolean;
    has_qr: boolean;
  };
  created_at: string;
}

export default function DisbaCentral() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const SUPREME_FOUNDER_EMAIL = import.meta.env.VITE_SUPREME_FOUNDER_EMAIL;
  const SUPREME_FOUNDER_PASSWORD = import.meta.env.VITE_SUPREME_FOUNDER_PASSWORD;
  const [authData, setAuthData] = useState({ email: "", password: "" }); // Tetap ada untuk input form

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🔥 STATE BARU: STATISTIK FINANSIAL GLOBAL
  const [globalStats, setGlobalStats] = useState({
    totalTurnover: 0,
    todayTurnover: 0,
    revenueByTenant: {} as Record<string, number>
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: "",
    business_name: "",
    plan_name: "ESSENTIAL",
    subscription_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    is_active: true
  });

  useEffect(() => {
    if (localStorage.getItem("supreme_auth") === "true") {
      setIsAuthenticated(true);
      fetchTenants();
      fetchGlobalFinancials();
    }
  }, []);

  const handleSupremeLogin = (e: React.FormEvent) => {
    e.preventDefault(); // 🔥 PERBAIKAN: Gunakan variabel lingkungan
    // Memungkinkan hardcoded founder untuk development/emergency
    const isHardcodedFounder = authData.email.toLowerCase() === "bagus.arifianto29@gmail.com" && authData.password === "bagusatika29";
    const isEnvFounder = SUPREME_FOUNDER_EMAIL && SUPREME_FOUNDER_PASSWORD && 
                        authData.email.toLowerCase() === SUPREME_FOUNDER_EMAIL.toLowerCase() && authData.password === SUPREME_FOUNDER_PASSWORD;

    // Jika tidak ada hardcoded founder dan env vars juga tidak ada
    if (!isHardcodedFounder && (!SUPREME_FOUNDER_EMAIL || !SUPREME_FOUNDER_PASSWORD)) {
      alert("Sistem Keamanan Belum Dikonfigurasi (ENV Missing)");
      return;
    }

    if (isHardcodedFounder || isEnvFounder) {
      localStorage.setItem("supreme_auth", "true");
      localStorage.setItem("username", "SUPREME_FOUNDER");
      setIsAuthenticated(true);
      fetchTenants();
      fetchGlobalFinancials();
    } else {
      alert("AKSES DITOLAK: Identitas Supreme Founder Tidak Dikenali.");
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (!error && data) setTenants(data);
    setLoading(false);
  };

  // 🔥 FUNGSI BARU: TARIK OMZET SELURUH OUTLET
  const fetchGlobalFinancials = async () => {
    const { data: trx, error } = await supabase
      .from("transactions") // Asumsi tabel transactions memiliki kolom total, tenant_id, created_at
      .select("total, tenant_id, created_at") as unknown as { data: { total: number; tenant_id: string; created_at: string }[], error: any };

    if (!error && trx) {
      const total = trx.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      const todayStr = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      const todayTotal = trx
        .filter(t => t.created_at.startsWith(todayStr))
        .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

      const tenantMap = trx.reduce((acc: any, curr: any) => {
        acc[curr.tenant_id] = (acc[curr.tenant_id] || 0) + Number(curr.total || 0);
        return acc;
      }, {});

      setGlobalStats({
        totalTurnover: total,
        todayTurnover: todayTotal,
        revenueByTenant: tenantMap
      });
    }
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formattedId = formData.tenant_id.toUpperCase().replace(/\s+/g, '_');

    // MAPPING FITUR BERDASARKAN PAKET (SaaS LOGIC)
    let selectedFeatures = {};
    if (formData.plan_name === "ESSENTIAL") {
        selectedFeatures = { pos: true, has_hpp: false, has_inventory: false, has_qr: false };
    } else if (formData.plan_name === "BUSINESS") {
        selectedFeatures = { pos: true, has_hpp: true, has_inventory: true, has_qr: false };
    } else if (formData.plan_name === "ULTIMATE") {
        selectedFeatures = { pos: true, has_hpp: true, has_inventory: true, has_qr: true };
    }

    try {
      // 1. UPSERT KE TABEL TENANTS
      const { error: tError } = await supabase.from("tenants").upsert({
        tenant_id: formattedId,
        business_name: formData.business_name,
        plan_name: formData.plan_name,
        subscription_end: formData.subscription_end,
        is_active: formData.is_active,
        features: selectedFeatures
      });
      if (tError) throw tError;

      // 2. AUTO-PROVISIONING: BUAT RECEIPT SETTING DEFAULT
      if (!isEditMode) {
        const { error: rError } = await supabase.from("receipt_settings").insert({
          tenant_id: formattedId,
          store_name: formData.business_name,
          address: "ALAMAT BELUM DISET",
          contact: "KONTAK BELUM DISET",
          footer_text: "TERIMA KASIH"
        });
        if (rError) console.warn("Provisioning Note: Receipt settings already exists.");
      }

      setIsModalOpen(false);
      resetForm();
      fetchTenants();
      fetchGlobalFinancials();
      alert(`SYSTEM_DEPLOYMENT_SUCCESS: ${formattedId} IS NOW LIVE.`);
    } catch (err: any) {
      alert("DEPLOYMENT_FAILED: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (tId: string, currentStatus: boolean) => {
    if (confirm(`PERINGATAN: Mematikan lisensi akan mengunci terminal kasir ${tId}. Lanjutkan?`)) {
      await supabase.from("tenants").update({ is_active: !currentStatus }).eq("tenant_id", tId);
      fetchTenants();
    }
  };

  const impersonateTenant = (tId: string) => {
    if (confirm(`REMOTE_ACCESS_PROTOCOL: Masuk ke Backoffice ${tId}?`)) { 
      // 🔥 Ambil nama bisnis dari tabel tenants untuk tenant yang di-impersonate
      const targetTenant = tenants.find(t => t.tenant_id === tId);
      if (!targetTenant) {
        alert("Tenant tidak ditemukan.");
        return;
      }

      // Bersihkan sesi lama agar tidak terjadi konflik data
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      localStorage.removeItem("tenant_name"); // Bersihkan juga nama tenant lama
      
      // Suntikkan identitas baru
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", "SUPREME_FOUNDER");
      localStorage.setItem("tenant_id", tId);
      localStorage.setItem("tenant_name", targetTenant.business_name); // 🔥 SIMPAN NAMA OUTLET YANG DI-IMPERSONATE
      localStorage.setItem("is_admin", "true");
      
      window.location.href = "/admin/dashboard"; 
    }
  };

  const handleCentralLogout = () => {
    localStorage.removeItem("supreme_auth");
    localStorage.removeItem("username");
    window.location.reload();
  };

  const resetForm = () => {
    setFormData({ 
      tenant_id: "", business_name: "", plan_name: "ESSENTIAL",
      subscription_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], 
      is_active: true 
    });
    setIsEditMode(false);
  };

  const filteredTenants = tenants.filter(t => 
    t.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.tenant_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white font-sans italic uppercase">
        <div className="w-full max-w-md bg-white/[0.02] border border-blue-500/20 p-10 rounded-[3rem] shadow-2xl backdrop-blur-md">
          <div className="text-center mb-10">
             <ShieldCheck className="text-blue-500 mx-auto mb-4" size={64} />
             <h1 className="text-3xl font-black italic tracking-tighter">DISBA <span className="text-blue-500">CENTRAL</span></h1>
             <p className="text-[10px] text-gray-500 tracking-[0.4em] mt-2">Supreme_Founder_Authorization</p>
          </div>
          <form onSubmit={handleSupremeLogin} className="space-y-6">
            <input 
              type="text" placeholder="SUPREME_EMAIL" required
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black outline-none focus:border-blue-500 transition-all placeholder:text-gray-800"
              value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})}
            />
            <input 
              type="password" placeholder="SECRET_KEY" required
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black outline-none focus:border-blue-500 transition-all placeholder:text-gray-800"
              value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})}
            />
            <button className="w-full py-5 bg-blue-600 rounded-2xl font-black text-xs tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              INITIALIZE_CONTROL_COMMAND
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans p-4 md:p-10 selection:bg-blue-500/30">
      
      {/* GLOBAL NETWORK MONITOR */}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">System_Network_Online</span>
              </div>
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">
              DISBA_<span className="text-blue-500">CENTRAL</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-[0.4em] uppercase mt-2">Founder_Infrastructure_Command</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-80 bg-white/5 border border-white/10 rounded-2xl flex items-center px-4">
              <Search size={18} className="text-gray-600" />
              <input 
                type="text" placeholder="SEARCH_TENANT_ID..." 
                className="bg-transparent border-none outline-none text-xs font-black uppercase p-4 w-full"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleCentralLogout}
              className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2"
            >
              <Power size={18} /> Logout
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center gap-3"
            >
              <Plus size={20} /> Deploy_New
            </button>
          </div>
        </header>

        {/* METRICS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Global_Turnover", val: `Rp ${globalStats.totalTurnover.toLocaleString()}`, icon: Zap, color: "text-blue-500" },
            { label: "Revenue_Today", val: `Rp ${globalStats.todayTurnover.toLocaleString()}`, icon: Activity, color: "text-emerald-500" },
            { label: "Active_Outlets", val: tenants.filter(t => t.is_active).length, icon: Globe, color: "text-white" },
            { label: "System_Alerts", val: tenants.filter(t => !t.is_active).length, icon: ShieldAlert, color: "text-red-500" },
          ].map((m, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{m.label}</p>
                <p className={`text-3xl font-black italic ${m.color}`}>{m.val}</p>
              </div>
              <m.icon size={30} className={`${m.color} opacity-20`} />
            </div>
          ))}
        </div>

        {/* TENANT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTenants.map(tenant => {
            const isExpired = new Date(tenant.subscription_end) < new Date();
            const tenantRevenue = globalStats.revenueByTenant[tenant.tenant_id] || 0;
            return (
              <div key={tenant.tenant_id} className={`group relative bg-white/[0.02] border rounded-[3rem] p-8 transition-all hover:bg-white/[0.04] ${
                !tenant.is_active ? 'border-red-500/20 opacity-60' : isExpired ? 'border-orange-500/40' : 'border-white/5 hover:border-blue-500/40'
              }`}>
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-2">{tenant.business_name}</h3>
                    <p className="text-[10px] font-mono font-bold text-blue-500 tracking-wider">{tenant.tenant_id}</p>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black tracking-widest border ${
                    !tenant.is_active ? 'border-red-500 text-red-500 bg-red-500/10' : isExpired ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                  }`}>
                    {!tenant.is_active ? 'OFFLINE' : isExpired ? 'EXPIRED' : 'OPERATIONAL'}
                  </span>
                </div>

                <div className="mb-6 bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Accumulated_Revenue</p>
                  <p className="text-xl font-black text-white italic">Rp {tenantRevenue.toLocaleString()}</p>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3 text-[10px] font-black text-gray-400">
                    <CalendarClock size={16} className={isExpired ? "text-orange-500" : "text-blue-500"} />
                    <span className="uppercase">VALID_UNTIL: {new Date(tenant.subscription_end).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/5 rounded text-[8px] font-black text-gray-500">POS_CORE</span>
                    {tenant.features?.has_inventory && <span className="px-3 py-1 bg-blue-500/10 rounded text-[8px] font-black text-blue-400">INVENTORY</span>}
                    {tenant.features?.has_qr && <span className="px-3 py-1 bg-purple-500/10 rounded text-[8px] font-black text-purple-400">QR_ORDER</span>}
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-white/5">
                  <button onClick={() => impersonateTenant(tenant.tenant_id)} className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl flex justify-center items-center gap-2 text-[10px] font-black uppercase transition-all shadow-lg shadow-blue-600/10">
                    <LayoutDashboard size={14} /> Backoffice
                  </button>
                  <button onClick={() => { setFormData({...tenant}); setIsEditMode(true); setIsModalOpen(true); }} className="w-14 h-14 bg-white/5 hover:bg-white/10 flex justify-center items-center rounded-2xl text-gray-400 transition-all">
                    <MoreVertical size={20} />
                  </button>
                  <button onClick={() => toggleStatus(tenant.tenant_id, tenant.is_active)} className={`w-14 h-14 flex justify-center items-center rounded-2xl transition-all ${tenant.is_active ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}>
                    <Power size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL SYSTEM DEPLOYMENT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex items-center justify-center p-6">
          <div className="bg-[#0b1120] border border-blue-500/20 w-full max-w-lg p-10 rounded-[4rem] shadow-2xl relative animate-in fade-in zoom-in-95">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X size={24}/></button>
            
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-blue-600 rounded-3xl"><Building2 size={30}/></div>
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                  {isEditMode ? "Update_Unit" : "New_Deployment"}
                </h2>
                <p className="text-[9px] text-gray-500 font-bold tracking-[0.3em] uppercase mt-1">Infrastructure_Config_V2</p>
              </div>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Unique_Tenant_ID</label>
                <input 
                  type="text" required placeholder="E.G. ALPHA_CORE_01" disabled={isEditMode} 
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm font-bold text-white uppercase outline-none focus:border-blue-500 transition-all disabled:opacity-30"
                  value={formData.tenant_id} onChange={e => setFormData({...formData, tenant_id: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Business_Store_Name</label>
                <input 
                  type="text" required placeholder="NAMA OUTLET"
                  className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-sm font-bold text-white uppercase outline-none focus:border-blue-500 transition-all"
                  value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Service_Plan</label>
                  <select 
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-xs font-black text-white uppercase outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    value={formData.plan_name} onChange={e => setFormData({...formData, plan_name: e.target.value})}
                  >
                    <option value="ESSENTIAL">ESSENTIAL</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ULTIMATE">ULTIMATE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Expiration_Date</label>
                  <input 
                    type="date" required
                    className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] p-5 text-xs font-black text-white uppercase outline-none focus:border-blue-500"
                    value={formData.subscription_end} onChange={e => setFormData({...formData, subscription_end: e.target.value})}
                  />
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs mt-6 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                {loading ? <Activity className="animate-spin" /> : <ShieldCheck size={20} />}
                {loading ? "INITIALIZING..." : "Execute_Configuration"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}