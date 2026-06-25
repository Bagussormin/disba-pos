import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Lock, Building2, User, ShieldCheck, Loader2 } from "lucide-react"; 

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return alert("Harap isi username dan password!");
    setLoading(true);

    // 🔥 SUPREME FOUNDER MASTER CHECK (ENVIRONMENT ONLY - NO HARDCODED CREDENTIALS)
    const supremeEmail = import.meta.env.VITE_SUPREME_EMAIL;
    const supremePass = import.meta.env.VITE_SUPREME_PASSWORD;
    
    // Check against environment variables only
    const isEnvFounder = supremeEmail && supremePass && username.toLowerCase() === supremeEmail.toLowerCase() && password === supremePass;

    if (isEnvFounder) {
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", "SUPREME_FOUNDER");
      const targetTenant = localStorage.getItem("tenant_id") || "DISBA_HQ";
      localStorage.setItem("tenant_id", targetTenant);
      setTimeout(() => {
        window.location.href = "/admin/dashboard";
      }, 100);
      return;
    }

    try {
      // Use secure RPC for password verification instead of fetching plaintext
      const { data: rpcData, error } = await supabase.rpc('verify_admin_password', {
        p_username: username.toLowerCase(),
        p_password: password
      });

      const data = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (error || !data) {
        alert("Akses Ditolak: Username/Password salah, atau Anda bukan Admin.");
        setLoading(false);
        return;
      }

      // 🔥 Ambil nama bisnis dari tabel tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("tenant_id", data.tenant_id)
        .single();
      if (tenantError) throw new Error(tenantError.message || "Gagal mengambil info tenant.");

      // Jika berhasil, simpan KTP Digital Admin Outlet ke memori browser
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", data.username);
      localStorage.setItem("tenant_id", data.tenant_id); // 🔥 KUNCI MASTER OUTLET MEREKA
      localStorage.setItem("tenant_name", tenantData.business_name); // 🔥 SIMPAN NAMA OUTLET
      
      // 🔥 PERBAIKAN: Beri waktu 100ms agar browser selesai menulis ke localStorage sebelum pindah halaman
      setTimeout(() => {
        alert(`Selamat Datang di Backoffice, Admin ${data.tenant_id}!`);
        window.location.href = "/admin/dashboard"; 
      }, 100);

    } catch (err: any) {
      alert("Terjadi kesalahan sistem: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <Building2 className="text-blue-500" size={28} />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Outlet <span className="text-blue-500">HQ</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">
            Manager & Owner Portal
          </p>
        </div>
        
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase ml-2">Username Admin</label>
            <div className="relative">
              <User className="absolute left-4 top-4 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Masukkan username"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase ml-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-gray-500" size={18} />
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all tracking-widest"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all mt-8 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
          MASUK BACKOFFICE
        </button>
      </div>
    </div>
  );
}