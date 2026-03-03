import { useState } from "react";
import { supabase } from "../lib/supabase";
import logoDisba from "./assets/logo-disba.png"; 

type Props = {
  onLoginSuccess: (role: string) => void;
};

export default function Login({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();
      

    if (error || !data) {
      alert("Akses Ditolak! Periksa Username & Password.");
      setLoading(false);
      return;
    }

    localStorage.setItem("role", data.role);
    localStorage.setItem("username", data.username);
    onLoginSuccess(data.role);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden italic bg-[#020617]">
      
      {/* --- BACKGROUND FUTURISTIK DINAMIS --- */}
      <div className="absolute inset-0 z-0">
        {/* 1. Efek Grid Bergerak (Cyber Grid) */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, #1e40af 1px, transparent 1px), linear-gradient(to bottom, #1e40af 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
            transform: 'perspective(500px) rotateX(60deg) translateY(-100px)',
            animation: 'grid-move 20s linear infinite'
          }}
        ></div>

        {/* 2. Cahaya Aurora Bergerak (Mesh Gradient) */}
        <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[100%] bg-blue-600/10 blur-[120px] rounded-full animate-float-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[100%] h-[100%] bg-indigo-500/10 blur-[120px] rounded-full animate-float-reverse"></div>
        
        {/* 3. Efek Scanline (Garis-garis TV Tua Tipis) */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] z-10"></div>
      </div>

      {/* --- CARD LOGIN (DIAM & SOLID) --- */}
      <div className="glass-card w-full max-w-[310px] rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative z-20 bg-black/40 backdrop-blur-xl">
        
        {/* BRANDING */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border border-blue-500/30 p-1 bg-black">
                <img 
                  src={logoDisba} 
                  alt="DISBA Logo" 
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">
            DISBA <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-[7px] font-bold text-blue-400/60 uppercase tracking-[0.5em] mt-2">
            System Authorized Only
          </p>
        </div>

        {/* FORM INPUT */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-blue-400 uppercase ml-4 tracking-widest">Operator ID</label>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-xl px-5 py-3 text-sm text-white placeholder:text-gray-800 outline-none focus:border-blue-500/50 transition-all font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-blue-400 uppercase ml-4 tracking-widest">Secret Key</label>
            <input
              type="password"
              placeholder="••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-xl px-5 py-3 text-sm text-white placeholder:text-gray-800 outline-none focus:border-blue-500/50 transition-all font-bold"
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-[0_0_30px_rgba(29,78,216,0.4)] active:scale-95 transition-all uppercase tracking-widest text-[10px] mt-2 border border-blue-400/20"
          >
            {loading ? "Decrypting..." : "Access System"}
          </button>
        </div>

        <footer className="mt-8 text-center pt-4 opacity-20">
          <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">
            v2.0.6 &bull; Secure Connection
          </p>
        </footer>
      </div>

      {/* --- CSS ANIMATIONS --- */}
      <style>{`
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10%, 10%); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10%, -10%); }
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse 12s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}