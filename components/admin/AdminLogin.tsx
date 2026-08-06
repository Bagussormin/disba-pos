import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Lock,
  Building2,
  User,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Timer,
} from "lucide-react";
import { createRateLimiter } from "../../lib/utils";

const adminLoginLimiter = createRateLimiter(5, 15 * 60 * 1000);

function validateAdminInput(username: string, password: string): string | null {
  if (!username.trim()) return "Username tidak boleh kosong.";
  if (!password) return "Password tidak boleh kosong.";
  if (password.length < 4) return "Password terlalu pendek.";
  return null;
}

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const countdownRef = useRef<any>(null);

  const startCountdown = (seconds: number) => {
    setLockCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async () => {
    setError(null);

    if (!adminLoginLimiter.isAllowed()) {
      setError("Terlalu banyak percobaan login.");
      startCountdown(60);
      return;
    }

    const validationError = validateAdminInput(username, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("kasir", username.trim())
        .eq("password", password)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        setError("Username atau password salah.");
        setLoading(false);
        return;
      }

      // 🔥 AMBIL TENANT (SAFE)
      let tenantId = data.tenant_id;

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("business_name")
        .eq("tenant_id", tenantId)
        .single();

      // 🔥 FALLBACK BIAR TIDAK NULL (INI FIX UTAMA KAMU)
      if (!tenantId) {
        tenantId = "DISBA_UTAMA";
      }

      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", data.kasir);

      // 🔥 INI WAJIB TIDAK BOLEH NULL
      localStorage.setItem("tenant_id", tenantId);
      localStorage.setItem(
        "tenant_name",
        tenantData?.business_name || "DISBA"
      );

      setLoading(false);

      // 🔥 PAKAI REDIRECT BIASA
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setLoading(false);
      setError("Terjadi kesalahan sistem.");
    }
  };

  const isLocked = lockCountdown > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10">

        <div className="text-center mb-6">
          <Building2 className="mx-auto mb-3 text-blue-400" />
          <h1 className="text-xl font-bold">ADMIN LOGIN</h1>
        </div>

        {error && (
          <div className="mb-4 text-red-400 text-sm">{error}</div>
        )}

        <input
          className="w-full p-3 mb-3 bg-black/40 border border-white/10 rounded-xl"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="w-full p-3 mb-3 bg-black/40 border border-white/10 rounded-xl"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading || isLocked}
          className="w-full p-3 bg-blue-600 rounded-xl font-bold"
        >
          {loading ? "Loading..." : "LOGIN ADMIN"}
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          DISBA POS ADMIN SYSTEM
        </p>
      </div>
    </div>
  );
}