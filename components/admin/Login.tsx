import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Lock, ShieldCheck, Loader2, Delete } from "lucide-react";
import logoDisba from "./assets/logo-disba.png"; 

type Props = {
  onLoginSuccess: (role: string) => void;
};

export default function Login({ onLoginSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (pin.length < 4) return alert("Masukkan PIN minimal 4 angka!");
    setLoading(true);

    try {
      // Login menggunakan PIN yang didaftarkan Admin
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("pin", pin)
        .single();
        
      if (error || !data) {
        throw new Error("PIN Salah atau User Tidak Aktif!");
      }

      // 🔥 Ambil nama bisnis dari tabel tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("tenant_id", data.tenant_id)
        .single();
      if (tenantError) throw new Error(tenantError.message || "Gagal mengambil info tenant.");

      localStorage.setItem("tenant_id", data.tenant_id); 
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      localStorage.setItem("tenant_name", tenantData.business_name); // 🔥 SIMPAN NAMA OUTLET
      
      setTimeout(() => { // 🔥 PERBAIKAN: Beri waktu 100ms agar browser selesai menulis ke localStorage sebelum pindah halaman
        onLoginSuccess(data.role);
      }, 100);
    } catch (e: any) {
      console.error("Login_Error:", e);
      alert(e.message || "Akses Ditolak! Pastikan koneksi internet stabil.");
    } finally {
      setLoading(false);
    }
  };

  const addDigit = (digit: string) => {
    if (pin.length < 6) setPin(prev => prev + digit);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617] font-sans text-slate-100">
      {/* Background Decorator */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)',
          transform: 'perspective(500px) rotateX(45deg) translateY(-50px)',
        }}></div>

        <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] bg-indigo-500/10 blur-[150px] rounded-full"></div>
      </div>

      {/* Main card */}
      <div className="w-full max-w-[360px] bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative z-20 transition-all">
        <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-[-4px] bg-gradient-to-r from-blue-500 to-indigo-500 blur-lg opacity-40 rounded-3xl animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center p-2">
                <img src={logoDisba} alt="DISBA Logo" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
            DISBA <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.5em] mt-2">
            Secure PIN Access
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i < pin.length ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_10px_#3b82f6]' : 'border-slate-700'}`}></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => addDigit(num.toString())} className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-black hover:bg-blue-600 hover:border-blue-500 transition-all active:scale-90">
              {num}
            </button>
          ))}
          <button onClick={() => setPin("")} className="h-16 rounded-2xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all">C</button>
          <button onClick={() => addDigit("0")} className="h-16 rounded-2xl bg-white/5 text-xl font-black hover:bg-blue-600 transition-all">0</button>
          <button onClick={() => setPin(prev => prev.slice(0, -1))} className="h-16 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-slate-700 transition-all"><Delete size={20}/></button>
        </div>

        <button 
          onClick={handleLogin}
          disabled={loading || pin.length < 4}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
          <span>MASUK SISTEM</span>
        </button>
      </div>
    </div>
  );
}