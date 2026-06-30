import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Lock, ShieldCheck, Loader2, Delete, AlertTriangle, Timer } from "lucide-react";
import logoDisba from "./assets/logo-disba.png";
import { createRateLimiter } from "../../lib/utils";

type Props = {
  onLoginSuccess: (role: string) => void;
};

// Client-side rate limiter: 5 percobaan per 15 menit
const pinLoginLimiter = createRateLimiter(5, 15 * 60 * 1000);

export default function Login({ onLoginSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    setLockCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setLockCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const handleLogin = async () => {
    if (pin.length < 4) return;
    setError(null);

    // Cek client-side rate limit (mencegah spam request)
    if (!pinLoginLimiter.isAllowed()) {
      const remaining = Math.ceil(pinLoginLimiter.getRemainingTime() / 1000);
      startCountdown(remaining);
      setError(`Terlalu banyak percobaan. Tunggu ${Math.ceil(remaining / 60)} menit.`);
      setPin("");
      return;
    }

    setLoading(true);

    try {
      const tenantId = localStorage.getItem("tenant_id");
      if (!tenantId) throw new Error("Tenant ID tidak ditemukan. Harap registrasi outlet terlebih dahulu.");

      // Validasi PIN — hanya angka, 4-6 digit
      if (!/^\d{4,6}$/.test(pin)) {
        setError("PIN hanya boleh berisi angka (4-6 digit).");
        setPin("");
        setLoading(false);
        return;
      }

      // Server-side PIN verification via Supabase RPC
      // RPC verify_user_pin memiliki rate limiting & hashing di server
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_user_pin', {
        p_tenant_id: tenantId,
        p_pin: pin
      });

      // Tangani error dari server (termasuk ACCOUNT_LOCKED dan INVALID_PIN_FORMAT)
      if (rpcError) {
        if (rpcError.message?.includes('ACCOUNT_LOCKED')) {
          const seconds = parseInt(rpcError.message.split(':')[1] || '900');
          startCountdown(seconds);
          setError(`Akun dikunci. Coba lagi dalam ${Math.ceil(seconds / 60)} menit.`);
        } else if (rpcError.message?.includes('INVALID_PIN_FORMAT')) {
          setError("Format PIN tidak valid.");
        } else {
          setError("PIN Salah atau User Tidak Aktif!");
        }
        setPin("");
        setLoading(false);
        return;
      }

      const matchedUser = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (!matchedUser) {
        setError("PIN Salah! Silakan coba lagi.");
        setPin("");
        setLoading(false);
        return;
      }

      // Ambil data tenant untuk mendapatkan nama bisnis
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("tenant_id", matchedUser.tenant_id)
        .single();

      if (tenantError || !tenantData) {
        setError("Gagal mengambil informasi outlet.");
        setLoading(false);
        return;
      }

      // Reset rate limiter setelah login sukses
      pinLoginLimiter.reset();

      // Simpan kredensial ke localStorage
      localStorage.setItem("role", matchedUser.role);
      localStorage.setItem("username", matchedUser.username);
      localStorage.setItem("tenant_id", matchedUser.tenant_id);
      localStorage.setItem("tenant_name", tenantData.business_name);

      setTimeout(() => {
        onLoginSuccess(matchedUser.role);
      }, 100);

    } catch (e: any) {
      setError(e.message || "Akses Ditolak! Pastikan koneksi internet stabil.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // Auto-login saat PIN 6 digit sudah diisi
  useEffect(() => {
    if (pin.length === 6 && !loading && lockCountdown === 0) {
      handleLogin();
    }
  }, [pin]);

  const addDigit = (digit: string) => {
    if (pin.length < 6 && lockCountdown === 0) {
      setError(null);
      setPin(prev => prev + digit);
    }
  };

  const isLocked = lockCountdown > 0;

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

        {/* Error/Lock Alert */}
        {error && (
          <div className={`mb-4 p-3 rounded-2xl border flex items-start gap-2 text-xs ${
            isLocked
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
          }`}>
            {isLocked ? <Timer size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
            <span>{error}</span>
          </div>
        )}

        {/* Countdown saat dikunci */}
        {isLocked ? (
          <div className="text-center py-4 mb-4">
            <div className="text-4xl font-black text-red-500 tabular-nums">{formatTime(lockCountdown)}</div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-2">Akun dikunci sementara</p>
          </div>
        ) : (
          <div className="flex justify-center gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i < pin.length ? 'bg-blue-500 border-blue-500 scale-125 shadow-[0_0_10px_#3b82f6]' : 'border-slate-700'}`}></div>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-3 gap-4 ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => addDigit(num.toString())}
              disabled={isLocked || loading}
              className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-black hover:bg-blue-600 hover:border-blue-500 transition-all active:scale-90"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => { setPin(""); setError(null); }}
            disabled={isLocked || loading}
            className="h-16 rounded-2xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all"
          >
            C
          </button>
          <button
            onClick={() => addDigit("0")}
            disabled={isLocked || loading}
            className="h-16 rounded-2xl bg-white/5 text-xl font-black hover:bg-blue-600 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPin(prev => prev.slice(0, -1))}
            disabled={isLocked || loading}
            className="h-16 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-slate-700 transition-all"
          >
            <Delete size={20} />
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || pin.length < 4 || isLocked}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={16} /><span>Memverifikasi...</span></>
          ) : isLocked ? (
            <><Timer size={16} /><span>TUNGGU {formatTime(lockCountdown)}</span></>
          ) : (
            <><ShieldCheck size={16} /><span>MASUK SISTEM</span></>
          )}
        </button>
      </div>
    </div>
  );
}