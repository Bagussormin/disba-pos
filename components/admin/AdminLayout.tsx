import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Membaca URL saat ini untuk menentukan menu mana yang sedang aktif
  const activePath = window.location.pathname;

  // Daftar Menu Utama
  const menuItems = [
    { name: "DASHBOARD", path: "/admin/dashboard", icon: "📊" },
    { name: "MENU MASTER", path: "/admin/menu", icon: "🍔" },
    { name: "QR TABLES", path: "/admin/qr", icon: "📱" },
    { name: "INVENTORY", path: "/admin/inventory", icon: "📦" },
    { name: "RESEP & PAKET", path: "/admin/recipes", icon: "⚖️" },
    { name: "HISTORY", path: "/admin/history", icon: "📜" },
    { name: "SHIFT", path: "/admin/shifts", icon: "⏰" },
  ];

  // Tambahan Menu Pengaturan (Tahap 1)
  const settingItems = [
    { name: "MANAJEMEN USER", path: "/admin/settings/users", icon: "👤" },
    { name: "LAYOUT MEJA", path: "/admin/settings/tables", icon: "🪑" },
    { name: "PROFIL OUTLET", path: "/admin/settings/profile", icon: "🏪" },
    { name: "MERCHANT BANK", path: "/admin/settings/payments", icon: "💳" },
  ];

  return (
    <div className="flex min-h-screen bg-[#020617] text-white font-sans uppercase">
      {/* SIDEBAR CONTAINER */}
      <div className="w-64 bg-white/[0.02] border-r border-white/5 p-6 flex flex-col gap-8 shadow-2xl overflow-y-auto">
        {/* LOGO DISBA POS */}
        <div>
          <h1 className="text-xl font-black italic tracking-tighter">
            DISBA <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-[8px] text-gray-500 font-bold tracking-[0.3em] mt-1">
            ENTERPRISE EDITION
          </p>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="flex flex-col gap-1">
          <p className="text-[8px] text-blue-500 font-black tracking-widest mb-2 opacity-50">MAIN MENU</p>
          {menuItems.map((item) => (
            // Mengubah <button> menjadi <a> agar perpindahan halaman berjalan mulus
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

          {/* SETTINGS SECTION (Tahap 1) */}
          <div className="mt-6 flex flex-col gap-1">
            <p className="text-[8px] text-blue-500 font-black tracking-widest mb-2 opacity-50">CONFIGURATION</p>
            {settingItems.map((item) => (
              // Mengubah <button> menjadi <a>
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
          </div>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-[10px] font-black tracking-widest text-gray-400 italic uppercase">
              ADMIN TERMINAL / {activePath.split('/').pop()?.replace("-", " ") || "DASHBOARD"}
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