import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import OutletLogin from './components/admin/OutletLogin'; 
import React, { useState, useEffect } from "react";

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
  const [isLicenseActive, setIsLicenseActive] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // --- SAKLAR KEAMANAN PERANGKAT ---
  const activeTenantId = localStorage.getItem("tenant_id");
  const isTerminalOnly = localStorage.getItem("disba_terminal_only") === "true"; // Gembok PC Kasir

  useEffect(() => {
    // Cek Sesi Login Staff & Admin
    const isAdminAuth = localStorage.getItem("is_admin") === "true";
    const savedRole = localStorage.getItem("role");
    const savedUser = localStorage.getItem("username");
    const licenseStatus = localStorage.getItem("disba_license_active") !== "false";

    setIsLicenseActive(licenseStatus);
    const isSupreme = savedUser === "SUPREME_FOUNDER";

    if (isAdminAuth || isSupreme) {
      setUser({ username: savedUser || "Supreme Admin", role: "admin" });
    } else if (savedRole && savedUser) {
      setUser({ username: savedUser, role: savedRole });
    }
  }, []);

  const handleEnterSystem = () => {
    navigate("/outlet-login");
  };

  const handleLoginSuccess = (role: string) => {
    const savedUsername = localStorage.getItem("username") || "User";
    setUser({ username: savedUsername, role: role });
    
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  // 1. PRIORITAS UTAMA: FOUNDER & LISENSI
  const isSupreme = localStorage.getItem("username") === "SUPREME_FOUNDER";
  
  // Hanya kunci jika lisensi mati DAN user bukan Supreme Founder DAN bukan di halaman Central
  if (!isLicenseActive && !isSupreme && location.pathname !== "/founder-hq" && location.pathname !== "/founder-console") {
    return <ProtocolLock />;
  }

  // 2. JIKA ALAT BELUM TERDAFTAR (KTP TENANT KOSONG)
  if (!activeTenantId) {
    return (
      <Routes>
        <Route path="/outlet-login" element={<OutletLogin />} />
        <Route path="/founder-hq" element={<FounderHQ />} />
        <Route path="/founder-console" element={<FounderHQ />} />
        <Route path="*" element={<LandingPage onEnterSystem={handleEnterSystem} />} />
      </Routes>
    );
  }

  // PROTEKSI ADMIN
  const requireAdmin = (element: React.ReactNode) => {
    if (isTerminalOnly) return <Navigate to="/dashboard" />;
    if (!user || user.role !== "admin") return <AdminLogin />;
    return <AdminLayout>{element}</AdminLayout>;
  };

  // PROTEKSI KASIR/WAITER
  const requireStaff = (element: React.ReactNode) => {
    if (!user || (user.role !== "kasir" && user.role !== "waiter" && user.role !== "admin")) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans italic w-full">
        {element}
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/founder-hq" element={<FounderHQ />} />
      <Route path="/founder-console" element={<FounderHQ />} />
      <Route path="/menu/*" element={<CustomerMenu />} />

      {/* ADMIN ROUTES */}
      <Route path="/admin/dashboard" element={requireAdmin(<AdminHome />)} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
      <Route path="/admin/qr" element={requireAdmin(<TableQRManager />)} />
      <Route path="/admin/menu" element={requireAdmin(<MenuMaster />)} />
      <Route path="/admin/paket" element={requireAdmin(<Paket />)} />
      <Route path="/admin/recipes" element={requireAdmin(<RecipeManagement />)} />
      <Route path="/admin/hpp-calculator" element={requireAdmin(<HPPCalculator />)} />
      <Route path="/admin/inventory" element={requireAdmin(<InventoryApp />)} />
      <Route path="/admin/reports" element={requireAdmin(<SalesReport />)} />
      <Route path="/admin/history" element={requireAdmin(<TransactionHistory />)} />
      <Route path="/admin/orders" element={requireAdmin(<OrderHistory />)} />
      <Route path="/admin/shifts" element={requireAdmin(<ShiftReports />)} />
      <Route path="/admin/settings/users" element={requireAdmin(<UserManagement />)} />
      <Route path="/admin/settings/tables" element={requireAdmin(<TableLayout />)} />
      <Route path="/admin/settings/profile" element={requireAdmin(<OutletProfile />)} />
      <Route path="/admin/settings/payments" element={requireAdmin(<MerchantBank />)} />
      <Route path="/admin/settings/printer" element={requireAdmin(<PrinterSettings />)} />
      <Route path="/admin/settings/receipt" element={requireAdmin(<ReceiptSettings />)} />

      {/* STAFF ROUTES */}
      <Route path="/dashboard" element={requireStaff(
        user?.role === "kasir" ? <KasirHome /> : <WaiterApp />
      )} />
      <Route path="/history" element={requireStaff(<TransactionHistory />)} />
      
      {/* OTHER */}
      <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
      <Route path="*" element={<Navigate to={user ? (user.role === "admin" ? "/admin/dashboard" : "/dashboard") : "/login"} />} />
    </Routes>
  );
}