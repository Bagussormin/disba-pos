import React from 'react';
import { ShieldAlert, Globe } from 'lucide-react';

// 🔥 KABEL GAMBAR INI SAYA MATIKAN DENGAN TANDA '//' AGAR TIDAK ERROR
// import logoDisba from "../../assets/logo-disba.png";

export default function ProtocolLock() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-white font-sans italic relative overflow-hidden">
      
      {/* Background Effect */}
      <div className="absolute inset-0 bg-red-900/10 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* Logo Grayscale (Diganti Kotak Sementara) */}
        <div className="flex justify-center opacity-50 grayscale">
          <div className="w-24 h-24 bg-white/5 flex items-center justify-center rounded-3xl border border-white/10 text-[10px] font-bold tracking-widest text-gray-500">
            LOGO_DISBA
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 animate-bounce">
              <ShieldAlert size={48} />
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Protocol_Locked</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Access_Denied // License_Expired</p>
        </div>

        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-xl space-y-6">
          <p className="text-gray-400 text-xs not-italic leading-relaxed font-light">
            Sistem keamanan DISBA mendeteksi masa aktif lisensi Anda telah berakhir atau akses telah dibatasi oleh admin pusat.
          </p>
          
          <div className="pt-4 border-t border-white/5 space-y-4">
             <div className="flex items-center justify-center gap-3 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                <Globe size={14}/> Contact Imperial Support
             </div>
             <p className="text-blue-400 text-sm font-black italic">support@disba.protocol</p>
          </div>
        </div>

        <p className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.6em] pt-12">
          Imperial_Standard_Security_System
        </p>
      </div>
    </div>
  );
}