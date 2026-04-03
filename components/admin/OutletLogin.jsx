import { useState } from 'react'; 
import { supabase } from "../../lib/supabase"; 
import { Mail, Lock, Loader2, ShieldCheck } from "lucide-react";

// 🔥 KABEL LOGO DISBA DIMASUKKAN KE SINI JUGA
import logoDisba from "./assets/logo-disba.png";

export default function OutletLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginOutlet = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      alert('Login Gagal: Periksa kembali email dan password Outlet.');
      setLoading(false);
      return;
    }

    const { data: outletData, error: outletError } = await supabase
      .from('outlet_profile')
      .select('tenant_id, name')
      .eq('email', email)
      .single();

    if (outletData) {
      localStorage.setItem('tenant_id', outletData.tenant_id);
      localStorage.setItem('tenant_name', outletData.name);
      localStorage.setItem('system_ready', 'true'); 
      
      alert(`Berhasil! Tablet ini sekarang terikat ke Outlet: ${outletData.name}`);
      window.location.href = "/login"; 
    } else {
      alert('Data Outlet tidak ditemukan di database.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans uppercase relative overflow-hidden italic">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-md bg-white/[0.02] border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl z-10">
        
        {/* HEADER BRANDING (DENGAN LOGO DISBA) */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-black border border-cyan-500/20 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden p-1">
            <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-20 animate-pulse"></div>
            {/* INI GAMBAR LOGONYA */}
            <img src={logoDisba} alt="DISBA Logo" className="relative z-10 w-full h-full object-cover rounded-[1.2rem]" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white">
            DISBA <span className="text-cyan-400">POS</span>
          </h1>
          <p className="text-[9px] text-gray-500 font-bold tracking-[0.3em] mt-2">
            OUTLET INITIALIZATION PROTOCOL
          </p>
        </div>

        {/* FORM INITIALIZE */}
        <form onSubmit={handleLoginOutlet} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[9px] text-cyan-400 font-black tracking-widest ml-2">OUTLET EMAIL</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="email"
                placeholder="EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/5 focus:border-cyan-500/50 text-white pl-11 pr-4 py-4 rounded-2xl text-xs font-bold outline-none transition-all shadow-inner not-italic placeholder:text-gray-700"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] text-cyan-400 font-black tracking-widest ml-2">SECURITY KEY</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/5 focus:border-cyan-500/50 text-white pl-11 pr-4 py-4 rounded-2xl text-xs font-bold outline-none transition-all shadow-inner not-italic placeholder:text-gray-700"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-black text-[11px] tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 mt-4 active:scale-95 border border-cyan-400/20"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={16} /> MENGHUBUNGKAN SERVER...</>
            ) : (
              "KUNCI PERANGKAT KE OUTLET"
            )}
          </button>
        </form>

        <div className="mt-8 flex justify-center opacity-40">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
             <ShieldCheck size={10} className="text-gray-400" />
             <span className="text-[7px] font-bold tracking-[0.2em] text-gray-400 not-italic">END-TO-END ENCRYPTED</span>
           </div>
        </div>
      </div>
    </div>
  );
}