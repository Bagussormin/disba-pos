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

// IMPORT FITUR SETTINGS & LAPORAN
import SalesReport from "./components/admin/SalesReport"; 
import TransactionHistory from "./components/admin/TransactionHistory";
import RecipeManagement from "./components/RecipeManagement"; 

import UserManagement from "./components/admin/UserManagement"; 
import TableLayout from "./components/admin/TableLayout";       
import OutletProfile from "./components/admin/OutletProfile";   
import MerchantBank from "./components/admin/MerchantBank"; 

// --- IMPORT KOMPONEN KONTROL FOUNDER ---
import FounderDashboard from "./components/FounderDashboard";
import ProtocolLock from "./components/ProtocolLock";

export default function App() {
  const [user, setUser] = useState<null | { username: string; role: string }>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // --- STATE KONTROL LISENSI ---
  const [isLicenseActive, setIsLicenseActive] = useState(true);

  // 1. MONITORING NAVIGASI & SESI
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    
    // Cek Sesi Login & Lisensi
    const isAdminAuth = localStorage.getItem("is_admin") === "true";
    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("username");
    const licenseStatus = localStorage.getItem("disba_license_active") !== "false";

    // Set Status Lisensi dari LocalStorage (Bisa dikontrol via Founder Dashboard)
    setIsLicenseActive(licenseStatus);

    if (isAdminAuth) {
      setUser({ username: "Supreme Admin", role: "admin" });
    } else if (savedRole && savedUser) {
      setUser({ username: savedUser, role: savedRole });
    }

    // AUTO-LOCK LOGIC: Berdasarkan Tanggal (NES House: 1 Tahun)
    const expiryDate = new Date("2027-03-03");
    const today = new Date();
    if (today > expiryDate) {
      setIsLicenseActive(false);
      localStorage.setItem("disba_license_active", "false");
    }

    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  // 2. HANDLER LOGIN & LOGOUT (Multi-Tenant Ready)
  const handleLoginSuccess = (role: string) => {
    const savedUsername = localStorage.getItem("username") || "User";
    
    // Mendaftarkan Tenant ID secara otomatis (NES House sebagai Pilot Project)
    localStorage.setItem("tenant_id", "NES_HOUSE_001");
    localStorage.setItem("tenant_name", "NES House Cold Brew");

    setUser({ username: savedUsername, role: role });
    window.history.pushState({}, "", "/dashboard");
    setCurrentPath("/dashboard");
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = "/"; 
  };

  const navigateToLogin = () => {
    window.history.pushState({}, "", "/login");
    setCurrentPath("/login");
  };

  // --- LOGIKA RENDER (SISTEM TINGKAT TINGGI) ---

  // A. PINTU RAHASIA FOUNDER (Akses Utama Kamu)
  if (currentPath === "/founder-console") {
    return <FounderDashboard />;
  }

  // B. GERBANG PROTOKOL (Lockdown jika lisensi mati)
  if (!isLicenseActive) {
    return <ProtocolLock />;
  }

  // C. LANDING PAGE
  if (currentPath === "/" && !user) {
    return <LandingPage onEnterSystem={navigateToLogin} />;
  }

  // D. AREA PELANGGAN (QR MENU)
  if (currentPath.includes("/menu/")) {
    const pathParts = currentPath.split("/");
    const menuIndex = pathParts.indexOf("menu");
    const tableId = pathParts[menuIndex + 1] || "unknown";
    return <CustomerMenu tableId={tableId} />;
  }

  // E. AREA ADMIN OUTLET
  if (currentPath.startsWith("/admin")) {
    if (user?.role !== "admin") {
      return <AdminLogin />;
    }
    
    return (
      <AdminLayout>
        {(currentPath === "/admin/dashboard" || currentPath === "/admin") && <AdminHome />}
        {currentPath === "/admin/qr" && <TableQRManager />}
        {currentPath === "/admin/menu" && <MenuMaster />}
        {currentPath === "/admin/recipes" && <RecipeManagement />}
        {currentPath === "/admin/inventory" && <InventoryApp />}

        {currentPath === "/admin/reports" && <SalesReport />} 
        {currentPath === "/admin/history" && <TransactionHistory />} 
        {currentPath === "/admin/orders" && <OrderHistory />}
        {currentPath === "/admin/shifts" && <ShiftReports />}

        {currentPath === "/admin/settings/users" && <UserManagement />}
        {currentPath === "/admin/settings/tables" && <TableLayout />}
        {currentPath === "/admin/settings/profile" && <OutletProfile />}
        {currentPath === "/admin/settings/payments" && <MerchantBank />}
      </AdminLayout>
    );
  }

  // F. PROTEKSI LOGIN
  if (!user || currentPath === "/login") {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // G. DASHBOARD OPERASIONAL (KASIR/WAITER)
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans italic">
      <div className="p-4 bg-white/5 backdrop-blur-md border-b border-white/10 flex justify-between items-center shadow-xl not-italic">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
          <span className="text-[10px] font-black tracking-[0.2em] uppercase italic opacity-80 text-cyan-400">
             {localStorage.getItem("tenant_name") || "DISBA_CLIENT"}
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

      <div className="p-4">
        {user.role === "kasir" && <KasirHome />}
        {user.role === "waiter" && <WaiterApp />}
        {user.role === "admin" && <AdminHome />}
      </div>
    </div>
  );
}