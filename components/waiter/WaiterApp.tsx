import { useState } from "react";
import WaiterHome from "./WaiterHome";
import WaiterOrder from "./WaiterOrder";
import { LogOut } from "lucide-react";

export default function WaiterApp() {
  const [activeBill, setActiveBill] = useState<number | null>(null);

  const handleLogOut = () => {
    if (window.confirm("KELUAR?")) {
      localStorage.clear();
      window.location.href = "/";
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

      {/* TOMBOL LOGOUT KECIL DI BAWAH */}
      <div className="fixed bottom-2 right-2 z-[99999]">
        <button 
          onClick={handleLogOut}
          className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/5 hover:border-red-500/30 px-2 py-1 rounded-md transition-all group opacity-40 hover:opacity-100"
        >
          <span className="text-[7px] font-black text-gray-500 group-hover:text-red-500 uppercase tracking-widest">Logout_Sess</span>
          <LogOut size={9} className="text-gray-500 group-hover:text-red-500" />
        </button>
      </div>

    </div>
  );
}