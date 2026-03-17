import { useState, useEffect } from "react";
// Import Landing Page
import LandingPage from "./components/LandingPage"; 

// Import Operasional
import KasirHome from "./components/kasir/KasirHome";
import WaiterApp from "./components/waiter/WaiterApp"; 
import Login from "./components/Login";

// Import Admin Area
import AdminLogin from "./components/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminHome from "./components/admin/AdminHome";
import MenuMaster from "./components/admin/MenuMaster";
import OrderHistory from "./components/admin/OrderHistory"; 
import ShiftReports from "./components/admin/ShiftReports";
import InventoryApp from "./components/admin/InventoryApp"; 
import CustomerMenu from "./components/Customer/CustomerMenu"; 
import TableQRManager from "./components/admin/TableQRManager";

// 🔥 IMPORT FITUR BARU: MANAJEMEN PAKET BUNDLING
import Paket from "./components/admin/Paket";

// IMPORT FITUR SETTINGS & LAPORAN
import SalesReport from "./components/admin/SalesReport"; 
import TransactionHistory from "./components/admin/TransactionHistory";
import RecipeManagement from "./components/RecipeManagement"; 
import HPPCalculator from "./components/admin/HPPCalculator"; 

import UserManagement from "./components/admin/UserManagement"; 
import TableLayout from "./components/admin/TableLayout";       
import OutletProfile from "./components/admin/OutletProfile";   
import MerchantBank from "./components/admin/MerchantBank"; 
import PrinterSettings from "./components/admin/PrinterSettings";

// 🔥 IMPORT RECEIPT BUILDER BARU KITA
import ReceiptSettings from "./components/admin/ReceiptSettings"; 

// --- IMPORT KOMPONEN KONTROL FOUNDER ---
import FounderHQ from "./components/admin/FounderHQ"; 
import ProtocolLock from "./components/ProtocolLock";

export default function App() {
  const [user, setUser] = useState<null | { username: string; role: string }>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isLicenseActive, setIsLicenseActive] = useState(true);

  // --- SAKLAR UTAMA (DIBACA LANGSUNG DARI STORAGE) ---
  const isSystemReady = localStorage.getItem("system_ready") === "true";
  const activeTenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    
    // Cek Sesi Login Staff & Admin
    const isAdminAuth = localStorage.getItem("is_admin") === "true";
    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("username");
    const licenseStatus = localStorage.getItem("disba_license_active") !== "false";

    setIsLicenseActive(licenseStatus);

    if (isAdminAuth) {
      setUser({ username: savedUser || "Supreme Admin", role: "admin" });
    } else if (savedRole && savedUser) {
      setUser({ username: savedUser, role: savedRole });
    }

    // Auto-lock expired 
    const expiryDate = new Date("2027-03-03");
    if (new Date() > expiryDate) {
      setIsLicenseActive(false);
      localStorage.setItem("disba_license_active", "false");
    }

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // --- HANDLERS ---

  const handleEnterSystem = () => {
    localStorage.setItem("system_ready", "true");
    window.location.href = "/login"; 
  };

  const handleLoginSuccess = (role: string) => {
    const savedUsername = localStorage.getItem("username") || "User";
    
    // Tenant ID sudah diset di Login.tsx / AdminLogin.tsx, jadi kita tidak hardcode lagi di sini.
    setUser({ username: savedUsername, role: role });
    
    // Arahkan Admin ke jalurnya sendiri
    if (role === "admin") {
      window.history.pushState({}, "", "/admin/dashboard");
      setCurrentPath("/admin/dashboard");
    } else {
      window.history.pushState({}, "", "/dashboard");
      setCurrentPath("/dashboard");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("tenant_id"); // Hancurkan KTP Digital saat keluar
    localStorage.removeItem("tenant_name");

    setUser(null);
    window.location.href = "/login"; 
  };

  // --- LOGIKA RENDER ---

  const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' 
    ? currentPath.slice(0, -1) 
    : currentPath;

  // 1. Prioritas Tertinggi: Kontrol Founder & Lisensi
  if (normalizedPath === "/founder-hq" || normalizedPath === "/founder-console") return <FounderHQ />;
  if (!isLicenseActive) return <ProtocolLock />;

  // -------------------------------------------------------------
  // 2. AREA PUBLIK (MENU QR) - HARUS DI ATAS!
  // Supaya HP tamu yang memori (localStorage)-nya kosong tidak diblokir
  // -------------------------------------------------------------
  if (normalizedPath.startsWith("/menu")) {
    return <CustomerMenu />;
  }

  // 3. Jika Sistem Belum Ready (Hanya berlaku untuk Kasir/Admin)
  if (!isSystemReady) {
    return <LandingPage onEnterSystem={handleEnterSystem} />;
  }

  // 4. AREA ADMIN (Cek URL /admin lebih dulu)
  if (normalizedPath.startsWith("/admin")) {
    // Jika belum login ATAU login tapi bukan admin, tampilkan AdminLogin
    if (!user || user.role !== "admin") return <AdminLogin />;
    
    return (
      <AdminLayout>
        {/* DAFTAR ROUTE KOMPONEN */}
        {(normalizedPath === "/admin/dashboard" || normalizedPath === "/admin") && <AdminHome />}
        {normalizedPath === "/admin/qr" && <TableQRManager />}
        {normalizedPath === "/admin/menu" && <MenuMaster />}
        
        {/* 🔥 JALUR ROUTING PAKET BUNDLING KITA */}
        {normalizedPath === "/admin/paket" && <Paket />} 
        
        {normalizedPath === "/admin/recipes" && <RecipeManagement />}
        {normalizedPath === "/admin/hpp-calculator" && <HPPCalculator />} 
        {normalizedPath === "/admin/inventory" && <InventoryApp />}
        {normalizedPath === "/admin/reports" && <SalesReport />} 
        {normalizedPath === "/admin/history" && <TransactionHistory />} 
        {normalizedPath === "/admin/orders" && <OrderHistory />}
        {normalizedPath === "/admin/shifts" && <ShiftReports />}
        {normalizedPath === "/admin/settings/users" && <UserManagement />}
        {normalizedPath === "/admin/settings/tables" && <TableLayout />}
        {normalizedPath === "/admin/settings/profile" && <OutletProfile />}
        {normalizedPath === "/admin/settings/payments" && <MerchantBank />}
        {normalizedPath === "/admin/settings/printer" && <PrinterSettings />}
        
        {/* 🔥 JALUR ROUTING RECEIPT BUILDER */}
        {normalizedPath === "/admin/settings/receipt" && <ReceiptSettings />}
      </AdminLayout>
    );
  }

  // 5. JIKA BUKAN AREA ADMIN & BELUM LOGIN (Kasir/Waiter)
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 6. DASHBOARD UTAMA (Untuk Kasir & Waiter)
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans italic">
      <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex justify-between items-center shadow-xl not-italic relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase italic opacity-80 text-cyan-400">
              TENANT_ID: {activeTenantId}
          </span>
          <span className="text-[10px] font-medium text-gray-500">|</span>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase italic opacity-80">
            {user.username} <span className="text-blue-500">[{user.role}]</span>
          </span>
        </div>
        <button 
          onClick={handleLogout} 
          className="text-[9px] font-black bg-red-500/10 hover:bg-red-500/20 text-red-500 px-5 py-2 rounded-xl border border-red-500/20 uppercase tracking-widest transition-all"
        >
          Logout Terminal
        </button>
      </div>

      <div className="p-4 relative z-10">
        {user.role === "kasir" && <KasirHome />}
        {user.role === "waiter" && <WaiterApp />}
      </div>
    </div>
  );
}