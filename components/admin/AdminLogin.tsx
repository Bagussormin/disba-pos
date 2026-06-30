import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Lock, Building2, User, ShieldCheck, Loader2, AlertTriangle, Timer } from "lucide-react";
import { createRateLimiter } from "../../lib/utils";

// Client-side rate limiter: 5 percobaan per 15 menit
const adminLoginLimiter = createRateLimiter(5, 15 * 60 * 1000);

// Validasi input sederhana
function validateAdminInput(username: string, password: string): string | null {
  if (!username.trim()) return "Username tidak boleh kosong.";
  if (username.length > 100) return "Username terlalu panjang (maks 100 karakter).";
  if (/[<>"'`;]/.test(username)) return "Username mengandung karakter yang tidak diizinkan.";
  if (!password) return "Password tidak boleh kosong.";
  if (password.length < 4) return "Password terlalu pendek (minimal 4 karakter).";
  if (password.length > 128) return "Password terlalu panjang (maks 128 karakter).";
  return null;
}

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer saat dikunci
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
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    setError(null);

    // rate limit tetap aman dipakai
    if (!adminLoginLimiter.isAllowed()) {
      const remaining = Math.ceil(adminLoginLimiter.getRemainingTime() / 1000);
      startCountdown(remaining);
      setError(`Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(remaining / 60)} menit.`);
      return;
    }

    const validationError = validateAdminInput(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 🔥 LOGIN BARU (SESUAI DATABASE KAMU)
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("kasir", username.trim())
        .eq("password", password)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        setError("Akses Ditolak: Username/Password salah, atau Anda bukan Admin.");
        setLoading(false);
        return;
      }

      // 🔥 AMBIL TENANT INFO
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("tenant_id", data.tenant_id)
        .single();

      if (tenantError || !tenantData) {
        setError("Gagal mengambil info outlet.");
        setLoading(false);
        return;
      }

      // 🔥 SAVE SESSION
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", data.kasir);
      localStorage.setItem("tenant_id", data.tenant_id);
      localStorage.setItem("tenant_name", tenantData.business_name);

      window.location.href = "/admin/dashboard";

    } catch (err: any) {
      setError("Terjadi kesalahan sistem: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };
  const isLocked = lockCountdown > 0;
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
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

        {/* Error / Lock Alert */}
        {error && (
          <div className={`mb-5 p-3 rounded-2xl border flex items-start gap-2 text-sm ${isLocked
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
            {isLocked ? <Timer size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
            <span>{error}</span>
          </div>
        )}

        {/* Countdown bar saat dikunci */}
        {isLocked && (
          <div className="mb-5 text-center">
            <div className="text-3xl font-black text-red-500 tabular-nums">{formatTime(lockCountdown)}</div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Waktu tunggu</p>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 tracking-widest uppercase ml-2">Username Admin</label>
            <div className="relative">
              <User className="absolute left-4 top-4 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Masukkan username"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all disabled:opacity-40"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && !isLocked && !loading && handleLogin()}
                disabled={isLocked || loading}
                maxLength={100}
                autoComplete="username"
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
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all tracking-widest disabled:opacity-40"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && !isLocked && !loading && handleLogin()}
                disabled={isLocked || loading}
                maxLength={128}
                autoComplete="current-password"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || isLocked}
          className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all mt-8 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={16} /> Memverifikasi...</>
          ) : isLocked ? (
            <><Timer size={16} /> TUNGGU {formatTime(lockCountdown)}</>
          ) : (
            <><ShieldCheck size={16} /> MASUK BACKOFFICE</>
          )}
        </button>
      </div>
    </div>
  );
}