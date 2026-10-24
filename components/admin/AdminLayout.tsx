
import React from "react";
import { useTenant } from "../../hooks/useTenant";
import { LogOut, MonitorSmartphone } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mencegah error jika window tidak tersedia
  const activePath =
    typeof window !== "undefined" ? window.location.pathname : "";

  const storedTenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("tenant_id")
      : "UNKNOWN_OUTLET";

  const { tenantId } = useTenant();
  const displayTenantId = tenantId || storedTenantId;

  // Menu utama
  const menuItems = [
    { name: "DASHBOARD", path: "/admin/dashboard", icon: "📊" },
    { name: "MENU MASTER", path: "/admin/menu", icon: "🍔" },
    { name: "QR TABLES", path: "/admin/qr", icon: "📱" },
    { name: "INVENTORY", path: "/admin/inventory", icon: "📦" },
    { name: "PAKET", path: "/admin/paket", icon: "🎁" },
    { name: "RESEP", path: "/admin/recipes", icon: "⚖️" },
    { name: "KALKULATOR HPP", path: "/admin/hpp-calculator", icon: "🧮" },
    { name: "PELANGGAN (CRM)", path: "/admin/customers", icon: "👥" },
    { name: "HISTORY", path: "/admin/history", icon: "📜" },
    { name: "SHIFT", path: "/admin/shifts", icon: "⏰" },
  ];

  // KDS
  const kdsLink = {
    name: "KITCHEN DISPLAY (KDS)",
    path: "/kitchen",
    icon: "👨‍🍳",
  };

  // Menu pengaturan
  const settingItems = [
    { name: "MANAJEMEN USER", path: "/admin/settings/users", icon: "👤" },
    { name: "LAYOUT MEJA", path: "/admin/settings/tables", icon: "🪑" },
    { name: "PROFIL OUTLET", path: "/admin/settings/profile", icon: "🏪" },
    { name: "MERCHANT BANK", path: "/admin/settings/payments", icon: "💳" },
    { name: "PRINTER", path: "/admin/settings/printer", icon: "🖨️" },
    { name: "RECEIPT BUILDER", path: "/admin/settings/receipt", icon: "🧾" },
  ];

  // LOGOUT ADMIN OUTLET / FOUNDER IMPERSONATION
  const handleLogOut = () => {
    if (typeof window === "undefined") return;

    if (!window.confirm("Keluar dari Sistem Backoffice?")) return;

    const isFounderImpersonating =
      localStorage.getItem("access_mode") === "founder_impersonate" &&
      localStorage.getItem("supreme_auth") === "true";

    // Hapus sesi Admin Outlet
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("is_admin");

    if (isFounderImpersonating) {
      // Bersihkan konteks outlet yang sedang dibuka
      localStorage.removeItem("tenant_id");
      localStorage.removeItem("tenant_name");
      localStorage.removeItem("access_mode");

      // Pulihkan penanda identitas Founder untuk alur aplikasi saat ini
      localStorage.setItem("role", "founder");
      localStorage.setItem("username", "Bagus");

      window.location.href = "/founder";
      return;
    }

    // Logout normal pengguna outlet.
    // tenant_id sengaja dipertahankan sesuai perilaku sebelumnya.
    localStorage.removeItem("access_mode");
    window.location.href = "/login";
  };

  // KUNCI PC KASIR
  const handleLockdown = () => {
    if (typeof window === "undefined") return;

    const confirmLock = window.confirm(
      "⚠️ PERINGATAN STRATEGIS!\n\n" +
        "Anda akan mengunci laptop ini sebagai TERMINAL KASIR. " +
        "Setelah dikunci, perangkat ini TIDAK AKAN BISA lagi " +
        "mengakses area Admin/Backoffice.\n\nLanjutkan?"
    );

    if (!confirmLock) return;

    localStorage.setItem("disba_terminal_only", "true");
    localStorage.removeItem("is_admin");

    window.alert(
      "✅ PERANGKAT TERKUNCI! Mengarahkan kembali ke Login Kasir..."
    );

    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-white font-sans uppercase">
      {/* SIDEBAR */}
      <div className="w-64 bg-white/[0.02] border-r border-white/5 flex flex-col shadow-2xl overflow-y-auto">
        {/* LOGO DAN INFO TENANT */}
        <div className="p-6 pb-2">
          <h1 className="text-xl font-black italic tracking-tighter">
            DISBA <span className="text-blue-500">POS</span>
          </h1>

          <p className="text-[8px] text-gray-500 font-bold tracking-[0.3em] mt-1">
            ENTERPRISE EDITION
          </p>

          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg">
            <p className="text-[7px] text-blue-400 font-black tracking-widest">
              ACTIVE TENANT:
            </p>
            <p className="text-[10px] font-black text-white truncate">
              {displayTenantId}
            </p>
          </div>
        </div>

        {/* NAVIGASI */}
        <nav className="flex flex-col gap-1 flex-1 p-6 pt-2">
          <p className="text-[8px] text-blue-500 font-black tracking-widest mb-2 opacity-50">
            MAIN MENU
          </p>

          {menuItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[10px] font-black transition-all duration-300 ${
                activePath === item.path
                  ? "bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] scale-105"
                  : "hover:bg-white/5 text-gray-500 hover:text-gray-300"
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.name}
            </a>
          ))}

          {/* PENGATURAN */}
          <div className="mt-4 flex flex-col gap-1">
            <p className="text-[8px] text-blue-500 font-black tracking-widest mb-2 opacity-50">
              CONFIGURATION
            </p>

            {settingItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[10px] font-black transition-all duration-300 ${
                  activePath === item.path
                    ? "bg-blue-600 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] scale-105"
                    : "hover:bg-white/5 text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.name}
              </a>
            ))}

            {/* KDS */}
            <a
              href={kdsLink.path}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-[10px] font-black text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 mt-2 transition-all"
            >
              <span className="text-sm">{kdsLink.icon}</span>
              {kdsLink.name}
              <span className="ml-auto text-[7px] bg-orange-500/20 px-1.5 py-0.5 rounded-full">
                BARU
              </span>
            </a>
          </div>
        </nav>

        {/* LOGOUT DAN KUNCI PC */}
        <div className="mt-auto p-6 border-t border-white/5 space-y-2">
          <button
            type="button"
            onClick={handleLogOut}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white py-3 rounded-xl transition-all text-[10px] font-black"
          >
            <LogOut size={14} /> LOGOUT
          </button>

          <button
            type="button"
            onClick={handleLockdown}
            className="w-full flex flex-col items-center justify-center py-3 bg-white/5 hover:bg-orange-500 border border-white/10 hover:border-orange-500 text-gray-400 hover:text-white rounded-xl transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <MonitorSmartphone
                size={14}
                className="group-hover:text-white text-orange-500"
              />
              <span className="text-[10px] font-black tracking-widest">
                KUNCI PC KASIR
              </span>
            </div>

            <span className="text-[7px] font-bold opacity-60 italic tracking-wider">
              CEGAH AKSES KE ADMIN
            </span>
          </button>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-black tracking-widest text-gray-400 italic uppercase">
              ADMIN TERMINAL /{" "}
              {activePath.split("/").pop()?.replace("-", " ") || "DASHBOARD"}
            </span>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-auto p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
