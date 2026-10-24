
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./components/admin/LandingPage";
import OutletLogin from "./components/admin/OutletLogin";
import Login from "./components/admin/Login";
import FounderHQ from "./components/admin/FounderHQ";
import InventoryApp from "./components/admin/InventoryApp";
import AdminLayout from "./components/admin/AdminLayout";
import AdminHome from "./components/admin/AdminHome";
import MenuMaster from "./components/admin/MenuMaster";
import TableQRManager from "./components/admin/TableQRManager";
import KasirHome from "./components/kasir/KasirHome";
import WaiterApp from "./components/waiter/WaiterApp";
import ProtocolLock from "./components/admin/ProtocolLock";
import Paket from "./components/admin/Paket";
import RecipeManagement from "./components/admin/RecipeManagement";
import HPPCalculator from "./components/admin/HPPCalculator";
import MarketingApp from "./components/admin/MarketingApp";
import OrderHistory from "./components/admin/OrderHistory";
import ShiftReports from "./components/admin/ShiftReports";
import UserManagement from "./components/admin/UserManagement";
import TableLayout from "./components/admin/TableLayout";
import OutletProfile from "./components/admin/OutletProfile";
import MerchantBank from "./components/admin/MerchantBank";
import PrinterSettings from "./components/admin/PrinterSettings";
import ReceiptSettings from "./components/admin/ReceiptSettings";

const MANAGER_ALLOWED_TENANT = "BINSARMA_WINE";

type AuthState = {
  isFounder: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isBinsarmaManager: boolean;
  isKasir: boolean;
  isWaiter: boolean;
  hasTenantId: boolean;
  licenseActive: boolean;
  defaultRoute: string;
};

export default function App() {
  const [ready, setReady] = useState(false);

  const [auth, setAuth] = useState<AuthState>({
    isFounder: false,
    isAdmin: false,
    isManager: false,
    isBinsarmaManager: false,
    isKasir: false,
    isWaiter: false,
    hasTenantId: false,
    licenseActive: true,
    defaultRoute: "/outlet-login",
  });

  useEffect(() => {
    const username = (localStorage.getItem("username") || "")
      .trim()
      .toUpperCase();

    const role = (localStorage.getItem("role") || "")
      .trim()
      .toLowerCase();

    const supreme = localStorage.getItem("supreme_auth") === "true";

    const tenantId = (localStorage.getItem("tenant_id") || "").trim();

    const normalizedTenantId = tenantId.toUpperCase();

    console.log("AUTH CHECK", {
      username,
      role,
      supreme,
      tenantId,
    });

    // Roles ditentukan berdasarkan role yang tersimpan.
    const isAdmin = role === "admin";
    const isManager = role === "manager";
    const isKasir = role === "kasir";
    const isWaiter = role === "waiter";

    // Manager tidak boleh dianggap Founder hanya karena supreme_auth=true.
    // Flag supreme tetap didukung untuk akun Founder non-Manager.
    const isFounder =
      !isManager &&
      (supreme ||
        role === "founder" ||
        role === "supreme_founder");

    const hasTenantId = Boolean(tenantId);

    // Manager hanya boleh mengakses tenant BINSARMA_WINE.
    const isBinsarmaManager =
      isManager &&
      normalizedTenantId === MANAGER_ALLOWED_TENANT;

    let defaultRoute = "/outlet-login";

    if (isFounder) {
      defaultRoute = "/founder";
    } else if (isAdmin && hasTenantId) {
      defaultRoute = "/admin/dashboard";
    } else if (isBinsarmaManager) {
      defaultRoute = "/admin/dashboard";
    } else if (isKasir && hasTenantId) {
      defaultRoute = "/dashboard";
    } else if (isWaiter && hasTenantId) {
      defaultRoute = "/dashboard";
    }

    setAuth({
      isFounder,
      isAdmin,
      isManager,
      isBinsarmaManager,
      isKasir,
      isWaiter,
      hasTenantId,
      licenseActive: true,
      defaultRoute,
    });

    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  if (!auth.licenseActive && !auth.isFounder) {
    return <ProtocolLock />;
  }

  // Akses backoffice outlet.
  // Admin memerlukan tenant ID.
  // Manager hanya boleh masuk ke BINSARMA_WINE.
  const canAccessOutletAdmin =
    (auth.isAdmin && auth.hasTenantId) ||
    (auth.isBinsarmaManager && auth.hasTenantId);

  // Helper agar semua halaman admin memakai pemeriksaan akses yang sama.
  const outletAdminPage = (page: React.ReactNode) =>
    canAccessOutletAdmin ? (
      <AdminLayout>{page}</AdminLayout>
    ) : (
      <Navigate to={auth.defaultRoute} replace />
    );

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/landing" element={<LandingPage />} />

      {/* Founder HQ */}
      <Route
        path="/founder"
        element={
          auth.isFounder ? (
            <FounderHQ />
          ) : (
            <Navigate to={auth.defaultRoute} replace />
          )
        }
      />

      {/* Backoffice outlet */}
      <Route
        path="/admin/qr"
        element={outletAdminPage(<TableQRManager />)}
      />

      <Route
        path="/admin/inventory"
        element={outletAdminPage(<InventoryApp />)}
      />

      <Route
        path="/admin/paket"
        element={outletAdminPage(<Paket />)}
      />

      <Route
        path="/admin/recipes"
        element={outletAdminPage(<RecipeManagement />)}
      />

      <Route
        path="/admin/hpp-calculator"
        element={outletAdminPage(<HPPCalculator />)}
      />

      <Route
        path="/admin/customers"
        element={outletAdminPage(<MarketingApp />)}
      />

      <Route
        path="/admin/history"
        element={outletAdminPage(<OrderHistory />)}
      />

      <Route
        path="/admin/shifts"
        element={outletAdminPage(<ShiftReports />)}
      />

      {/* Pengaturan outlet */}
      <Route
        path="/admin/settings/users"
        element={outletAdminPage(<UserManagement />)}
      />

      <Route
        path="/admin/settings/tables"
        element={outletAdminPage(<TableLayout />)}
      />

      <Route
        path="/admin/settings/profile"
        element={outletAdminPage(<OutletProfile />)}
      />

      <Route
        path="/admin/settings/payments"
        element={outletAdminPage(<MerchantBank />)}
      />

      <Route
        path="/admin/settings/printer"
        element={outletAdminPage(<PrinterSettings />)}
      />

      <Route
        path="/admin/settings/receipt"
        element={outletAdminPage(<ReceiptSettings />)}
      />

      {/* Root admin: jangan biarkan pengguna tanpa akses masuk ke dashboard */}
      <Route
        path="/admin"
        element={
          canAccessOutletAdmin ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <Navigate to={auth.defaultRoute} replace />
          )
        }
      />

      <Route
        path="/admin/dashboard"
        element={outletAdminPage(<AdminHome />)}
      />

      <Route
        path="/admin/menu"
        element={outletAdminPage(<MenuMaster />)}
      />

      {/* Kasir dan waiter */}
      <Route
        path="/dashboard"
        element={
          auth.isKasir && auth.hasTenantId ? (
            <KasirHome />
          ) : auth.isWaiter && auth.hasTenantId ? (
            <WaiterApp />
          ) : (
            <Navigate to={auth.defaultRoute} replace />
          )
        }
      />

      {/* Login */}
      <Route path="/login" element={<Login />} />

      <Route path="/outlet-login" element={<OutletLogin />} />

      {/* Rute tidak dikenal */}
      <Route
        path="*"
        element={<Navigate to={auth.defaultRoute} replace />}
      />
    </Routes>
  );
}
