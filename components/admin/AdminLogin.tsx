import React, { useState } from "react";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const SECRET_PIN = "9999"; 

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (pin === SECRET_PIN) {
      // Set session di LocalStorage
      localStorage.setItem("is_admin", "true");
      localStorage.setItem("role", "admin");
      localStorage.setItem("username", "Supreme Admin");
      
      // Navigasi manual (Tanpa useNavigate)
      window.location.href = "/admin/dashboard"; 
    } else {
      alert("ACCESS DENIED! PIN INCORRECT.");
      setPin("");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-sans text-white">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl text-center backdrop-blur-sm">
        <h1 className="text-4xl font-black italic uppercase mb-2 tracking-tighter">
          ADMIN <span className="text-blue-500">HQ</span>
        </h1>
        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.5em] mb-10">
          Restricted Area
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="password" 
            placeholder="****"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-4xl font-black text-blue-500 outline-none focus:border-blue-500 transition-all placeholder:opacity-20"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          <button 
            type="submit" 
            className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-600/20"
          >
            Authorize System
          </button>
        </form>
      </div>
    </div>
  );
}