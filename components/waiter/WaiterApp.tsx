import { useState } from "react";
import WaiterHome from "./WaiterHome";
import WaiterOrder from "./WaiterOrder"; // Pastikan nama file sesuai (WaiterOrder atau OrderEntry)
import { LogOut } from "lucide-react";

export default function WaiterApp() {
  const [activeBill, setActiveBill] = useState<number | null>(null);

  const handleLogOut = () => {
    if (window.confirm("KELUAR DARI SESI WAITER?")) {
      // Menghapus sesi spesifik tanpa merusak 'system_ready'
      if (typeof window !== "undefined") {
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("is_admin");
        
        // 🔥 TAMBAHAN: Hapus Identitas Toko agar bersih saat dipakai orang lain
        localStorage.removeItem("tenant_id");
        localStorage.removeItem("printer_ip"); 
        
        // Paksa ke halaman login staff
        window.location.href = "/login";
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] font-sans relative flex flex-col">
      
      {/* KONTEN UTAMA */}
      <div className="flex-1">
        {activeBill ? (
          <WaiterOrder
            billId={activeBill}
            onBack={() => setActiveBill(null)}
          />
        ) : (
          <WaiterHome 
            onOpenBill={(id) => setActiveBill(id)} 
          />
        )}
      </div>

      {/* SATU-SATUNYA TOMBOL LOGOUT (MELAYANG DI BAWAH) */}
      <div className="fixed bottom-4 right-4 z-[99999]">
        <button 
          onClick={handleLogOut}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 hover:border-red-500/50 px-3 py-2 rounded-xl transition-all group shadow-2xl"
        >
          <span className="text-[8px] font-black text-gray-400 group-hover:text-red-500 uppercase tracking-[0.2em] italic">
            Terminate_Sess
          </span>
          <LogOut size={12} className="text-gray-400 group-hover:text-red-500" />
        </button>
      </div>

    </div>
  );
}