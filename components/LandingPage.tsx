import React from 'react';
import { LogIn, Target, ShieldCheck } from 'lucide-react';
import logoDisba from "./assets/logo-disba.png"; 

interface LandingPageProps {
  onEnterSystem: () => void;
}

export default function LandingPage({ onEnterSystem }: LandingPageProps) {
  // Ambil nama outlet dari storage atau hardcode untuk NES House
  const outletName = "NES House Cold Brew";

  return (
    /** * h-[100dvh]: Mengunci tinggi tepat setinggi layar hp (dynamic)
     * overflow-hidden: Mematikan fungsi scroll secara paksa
     */
    <div className="h-[100dvh] w-full bg-[#020617] text-white font-sans italic flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500">
      
      {/* Background Decor - Glow yang statis */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)] pointer-events-none"></div>

      {/* Kontainer Utama - Dibuat sangat padat (compact) */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6 md:space-y-8 relative z-10 text-center">
        
        {/* 1. LOGO SECTION */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-500/20 blur-[40px] rounded-full opacity-40 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-[#b4975a]/30 p-1.5 bg-black/60 backdrop-blur-3xl shadow-2xl">
            <img src={logoDisba} alt="DISBA" className="w-full h-full object-cover rounded-[1rem] md:rounded-[1.5rem]" />
          </div>
          <Target className="absolute -top-1 -right-1 text-cyan-400 opacity-60 animate-pulse" size={18} />
        </div>

        {/* 2. TEXT SECTION (IDENTITAS OUTLET) */}
        <div className="space-y-2 md:space-y-4 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 not-italic">
              Official_Access_Point
            </span>
          </div>
          
          <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter italic leading-none">
            DISBA<span className="text-[#b4975a]">.</span>POS
          </h1>

          {/* NAMA OUTLET DINAMIS */}
          <div className="py-1">
            <p className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-white/90 italic">
              Terminal: <span className="text-[#b4975a] underline decoration-blue-500/50 underline-offset-4">{outletName}</span>
            </p>
          </div>
          
          <p className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 italic opacity-80">
            Imperial_Intelligence_System_v2.6
          </p>
        </div>

        {/* 3. BUTTON SECTION */}
        <div className="w-full max-w-[240px] md:max-w-[280px] space-y-4">
          <button 
            onClick={onEnterSystem}
            className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-[#020617] font-black uppercase text-[10px] md:text-xs tracking-[0.2em] rounded-xl transition-all duration-300 hover:bg-cyan-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95"
          >
            Initialize_Login <LogIn size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="flex items-center justify-center gap-2 text-[6px] md:text-[7px] font-bold text-gray-700 uppercase tracking-widest italic opacity-50">
            <ShieldCheck size={10}/> Military_Grade_Encryption
          </div>
        </div>
      </div>

      {/* 4. FOOTER - Minimalis agar tidak tertabrak jempol di HP */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center text-[6px] md:text-[8px] font-mono text-gray-800 uppercase tracking-[0.3em]">
        LOC_ID // {new Date().getFullYear()} &copy; IMPERIAL_DIGITAL_PROTOCOL
      </div>
    </div>
  );
}