import { useState } from "react";
import KasirHome from "./kasir/KasirHome";
import WaiterHome from "./waiter/WaiterHome";
import Login from "./Login"; 

export default function Layout() {
  const [user, setUser] = useState<null | { username: string; role: string }>(() => {
    // Opsional: Cek localStorage saat refresh agar tidak logout otomatis
    const savedUser = localStorage.getItem("user_session");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLoginSuccess = (role: string) => {
    const savedUsername = localStorage.getItem("username") || "User";
    const userData = { username: savedUsername, role: role };
    setUser(userData);
    localStorage.setItem("user_session", JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  // Jika belum login, tampilkan layar Login
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen bg-[#020617] text-white font-sans flex flex-col overflow-hidden">
      {/* Mini Header Operasional - GLOBAL LOGOUT */}
      <header className="h-[50px] px-6 bg-white/[0.02] border-b border-white/10 flex justify-between items-center backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase italic opacity-70">
              TERMINAL_{user.username} 
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase">
            {user.role}
          </span>
        </div>

        <button 
          onClick={handleLogout} 
          className="group flex items-center gap-2 text-[9px] font-black text-red-500/60 hover:text-red-500 transition-all uppercase tracking-widest"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">Exit_System</span>
          <div className="px-3 py-1.5 rounded-lg border border-red-500/20 group-hover:border-red-500/40 bg-red-500/5 group-hover:bg-red-500/10">
            Logout
          </div>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {user.role === "kasir" && <KasirHome />}
        {user.role === "waiter" && (
          /* Pastikan WaiterHome mengisi 100% tinggi sisa main */
          <WaiterHome />
        )}
      </main>
    </div>
  );
}