import OutletLogin from './components/admin/OutletLogin'; 
import { useState, useEffect } from "react";

// Import Landing Page
import LandingPage from "./components/admin/LandingPage"; 

// Import Operasional
import KasirHome from "./components/kasir/KasirHome";
import WaiterApp from "./components/waiter/WaiterApp"; 
import Login from "./components/admin/Login";

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

// 🔥 FITUR: MANAJEMEN PAKET BUNDLING
import Paket from "./components/admin/Paket";

// IMPORT FITUR SETTINGS & LAPORAN
import SalesReport from "./components/admin/SalesReport"; 
import TransactionHistory from "./components/admin/TransactionHistory";
import RecipeManagement from "./components/admin/RecipeManagement"; 
import HPPCalculator from "./components/admin/HPPCalculator"; 

import UserManagement from "./components/admin/UserManagement"; 
import TableLayout from "./components/admin/TableLayout";       
import OutletProfile from "./components/admin/OutletProfile";   
import MerchantBank from "./components/admin/MerchantBank"; 
import PrinterSettings from "./components/admin/PrinterSettings";
import ReceiptSettings from "./components/admin/ReceiptSettings"; 

// --- IMPORT KOMPONEN KONTROL FOUNDER ---
import FounderHQ from "./components/admin/FounderHQ"; 
import ProtocolLock from "./components/admin/ProtocolLock";

export default function App() {
  const [user, setUser] = useState<null | { username: string; role: string }>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isLicenseActive, setIsLicenseActive] = useState(true);

  // --- SAKLAR KEAMANAN PERANGKAT ---
  const activeTenantId = localStorage.getItem("tenant_id");
  const isTerminalOnly = localStorage.getItem("disba_terminal_only") === "true"; // Gembok PC Kasir

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
    window.history.pushState({}, "", "/outlet-login");
    setCurrentPath("/outlet-login");
  };

  const handleLoginSuccess = (role: string) => {
    const savedUsername = localStorage.getItem("username") || "User";
    setUser({ username: savedUsername, role: role });
    
    if (role === "admin") {
      window.history.pushState({}, "", "/admin/dashboard");
      setCurrentPath("/admin/dashboard");
    } else {
      window.history.pushState({}, "", "/dashboard");
      setCurrentPath("/dashboard");
    }
  };

  const normalizedPath = currentPath.endsWith('/') && currentPath !== '/' 
    ? currentPath.slice(0, -1) 
    : currentPath;

  // 1. PRIORITAS UTAMA: FOUNDER & LISENSI
  if (normalizedPath === "/founder-hq" || normalizedPath === "/founder-console") return <FounderHQ />;
  if (!isLicenseActive) return <ProtocolLock />;

  // 2. AREA PUBLIK (MENU QR)
  if (normalizedPath.startsWith("/menu")) return <CustomerMenu />;

  // 3. JIKA ALAT BELUM TERDAFTAR (KTP TENANT KOSONG)
  if (!activeTenantId) {
    if (normalizedPath === "/outlet-login") return <OutletLogin />;
    return <LandingPage onEnterSystem={handleEnterSystem} />;
  }

  // 4. AREA ADMIN (OUTLET HQ)
  if (normalizedPath.startsWith("/admin")) {
    // PROTEKSI: Jika PC ini diset sebagai Terminal Only, tendang balik ke kasir
    if (isTerminalOnly) {
        window.history.pushState({}, "", "/dashboard");
        setCurrentPath("/dashboard");
        return null;
    }

    if (!user || user.role !== "admin") return <AdminLogin />;
    
    return (
      <AdminLayout>
        {(normalizedPath === "/admin/dashboard" || normalizedPath === "/admin") && <AdminHome />}
        {normalizedPath === "/admin/qr" && <TableQRManager />}
        {normalizedPath === "/admin/menu" && <MenuMaster />}
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
        {normalizedPath === "/admin/settings/receipt" && <ReceiptSettings />}
      </AdminLayout>
    );
  }

  // 5. PAKSA MUNCUL LOGIN JIKA BELUM ADA USER ATAU SEDANG DI HALAMAN LOGIN
  if (!user || normalizedPath === "/login") {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // 6. DASHBOARD TERMINAL (KASIR & WAITER)
  if (user.role === "kasir" || user.role === "waiter") {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans italic w-full">
        {user.role === "kasir" && <KasirHome />}
        {user.role === "waiter" && <WaiterApp />}
      </div>
    );
  }

  // 7. JARING PENGAMAN TERAKHIR: JIKA ROLE NYANGKUT (Bukan Kasir/Waiter), KEMBALI KE LOGIN
  return <Login onLoginSuccess={handleLoginSuccess} />;
}