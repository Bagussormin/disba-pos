import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loader2, Lock, User, Building2 } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Cek ke tabel profiles apakah username & password cocok, DAN role-nya adalah admin
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username.toLowerCase())
        .eq("password", password)
        .eq("role", "admin") // 🔥 HANYA ADMIN YANG BOLEH MASUK SINI
        .single();

      if (error || !data) {
        alert("Akses Ditolak: Username/Password salah, atau Anda bukan Admin.");
        setLoading(false);
        return;
      }

      // Jika berhasil, simpan KTP Digital Admin Outlet ke memori browser
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", data.username);
      localStorage.setItem("tenant_id", data.tenant_id); // 🔥 KUNCI MASTER OUTLET MEREKA

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
      {/* Background Decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-md relative z-10">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <Building2 className="text-blue-500" size={32} />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Outlet <span className="text-blue-500">HQ</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">
            Manager & Owner Portal
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase ml-2">Username Admin</label>
            <div className="relative">
              <User className="absolute left-4 top-4 text-gray-500" size={18} />
              <input 
                type="text" 
                required
                placeholder="Masukkan username..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:opacity-30"
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
                required
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all placeholder:opacity-30 tracking-widest"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-[0_0_25px_rgba(37,99,235,0.2)] mt-4 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Login Backoffice"}
          </button>
        </form>
      </div>
    </div>
  );
}