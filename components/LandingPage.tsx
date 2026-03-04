import React, { useState } from 'react';
import { LogIn, Target, ShieldCheck } from 'lucide-react';
import { supabase } from "../lib/supabase";
import logoDisba from "./assets/logo-disba.png"; 

interface LandingPageProps {
  onEnterSystem: () => void;
}

export default function LandingPage({ onEnterSystem }: LandingPageProps) {
  const outletName = "NES House Cold Brew";
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Fungsi Verifikasi Email & Password Outlet (NES House)
  const handleOutletLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert("Akses Outlet Ditolak! Periksa Email & Password NES House.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // --- KUNCI SISTEM DISINI ---
        // Kita set true agar App.tsx tahu bahwa gerbang Initialize sudah dilewati
        localStorage.setItem("system_ready", "true");
        
        // Simpan nama outlet jika ingin digunakan secara global
        localStorage.setItem("tenant_name", "NES HOUSE");

        // Panggil fungsi callback untuk pindah ke Login Staff
        onEnterSystem(); 
      }
    } catch (err) {
      console.error("Critical Error:", err);
      alert("Terjadi kesalahan sistem. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#020617] text-white font-sans italic flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500">
      
      {/* Glow Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6 md:space-y-8 relative z-10 text-center">
        
        {/* 1. LOGO SECTION */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/20 blur-[40px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-[#b4975a]/30 p-1.5 bg-black/60 backdrop-blur-3xl shadow-2xl">
            <img src={logoDisba} alt="DISBA" className="w-full h-full object-cover rounded-[1rem] md:rounded-[1.5rem]" />
          </div>
          <Target className="absolute -top-1 -right-1 text-cyan-400 opacity-60 animate-pulse" size={18} />
        </div>

        {/* 2. IDENTITAS OUTLET */}
        <div className="space-y-2 md:space-y-4 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 not-italic">
              Official_Access_Point
            </span>
          </div>
          
          <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">
            DISBA<span className="text-[#b4975a]">.</span>POS
          </h1>

          <div className="py-1">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-white/90 italic">
              Terminal: <span className="text-[#b4975a] underline decoration-blue-500/50 underline-offset-4">{outletName}</span>
            </p>
          </div>
        </div>

        {/* 3. AUTH SECTION */}
        <div className="w-full max-w-[240px] md:max-w-[280px]">
          {!showAuthForm ? (
            /* TAMPILAN AWAL */
            <button 
              onClick={() => setShowAuthForm(true)}
              className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#020617] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] rounded-xl transition-all duration-300 hover:bg-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95"
            >
              Initialize_Login <LogIn size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            /* FORM INPUT */
            <form onSubmit={handleOutletLogin} className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <input 
                type="email" 
                placeholder="OUTLET EMAIL" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[10px] outline-none focus:border-cyan-500 transition-all text-white placeholder:text-gray-600"
                required
              />
              <input 
                type="password" 
                placeholder="OUTLET PASSWORD" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-[10px] outline-none focus:border-cyan-500 transition-all text-white placeholder:text-gray-600"
                required
              />
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-cyan-600 text-white font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? "AUTHORIZING..." : "VERIFY_SYSTEM →"}
              </button>
              <button 
                type="button" 
                onClick={() => setShowAuthForm(false)} 
                className="text-[8px] text-gray-500 uppercase tracking-widest mt-2 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
          
          <div className="flex items-center justify-center gap-2 text-[6px] md:text-[7px] font-bold text-gray-700 uppercase tracking-widest italic opacity-50 mt-6">
            <ShieldCheck size={10}/> Military_Grade_Encryption
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center text-[6px] md:text-[8px] font-mono text-gray-800 uppercase tracking-[0.3em]">
        LOC_ID // 2026 &copy; IMPERIAL_DIGITAL_PROTOCOL
      </div>
    </div>
  );
}