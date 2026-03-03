import React, { useState } from 'react';
import { 
  Users, Calendar, Power, ShieldCheck, PlusCircle, 
  X, LayoutDashboard, Database, Key, CheckCircle2 
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  owner: string;
  adminEmail: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  plan: string;
}

export default function FounderDashboard() {
  // 1. STATE MANAGEMENT
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: "DISBA-001",
      name: "NES House Cold Brew",
      owner: "Renni",
      adminEmail: "admin@neshouse",
      startDate: "2026-03-03",
      endDate: "2027-03-03",
      isActive: true,
      plan: "Imperial Full Suite"
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', owner: '', duration: '1' });

  // 2. HANDLER: TOGGLE AKTIVASI (KILL-SWITCH)
  const toggleStatus = (id: string) => {
    setTenants(tenants.map(t => {
      if (t.id === id) {
        const newStatus = !t.isActive;
        // Simpan ke LocalStorage agar App.tsx bisa membaca status terbaru
        localStorage.setItem("disba_license_active", String(newStatus));
        return { ...t, isActive: newStatus };
      }
      return t;
    }));
  };

  // 3. HANDLER: REGISTER KLIEN BARU (AUTO-GENERATE ADMIN)
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newClient.name.toLowerCase().replace(/\s+/g, '');
    const start = new Date();
    const end = new Date();
    end.setFullYear(start.getFullYear() + parseInt(newClient.duration));

    const freshTenant: Tenant = {
      id: `DISBA-00${tenants.length + 1}`,
      name: newClient.name,
      owner: newClient.owner,
      adminEmail: `admin@${slug}`,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      isActive: true,
      plan: "Imperial Full Suite"
    };

    setTenants([...tenants, freshTenant]);
    setIsModalOpen(false);
    setNewClient({ name: '', owner: '', duration: '1' });
    alert(`Klien Berhasil Didaftarkan!\nMaster Admin: ${freshTenant.adminEmail}\nPass: disba123`);
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-white font-sans italic selection:bg-blue-500">
      
      {/* HEADER SECTION */}
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Imperial<span className="text-blue-500">_Founder_</span>Console
            </h1>
          </div>
          <p className="text-[9px] tracking-[0.5em] text-gray-500 font-bold uppercase">
            Master_Control_Protocol // Node: 0.1.A // Active_Clients: {tenants.length}
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          <PlusCircle size={18}/> Deploy_New_Client
        </button>
      </header>

      {/* DASHBOARD STATS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total_Revenue</p>
            <Database size={14} className="text-blue-500 opacity-50" />
          </div>
          <p className="text-3xl font-black italic">Rp. 12.500.000</p>
        </div>
      </div>

      {/* CLIENT LIST TABLE */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="p-8 border-b border-white/5 flex items-center gap-4 bg-white/[0.01]">
          <LayoutDashboard size={20} className="text-blue-500" />
          <h2 className="text-lg font-black uppercase tracking-tight italic">Active_Tenant_Registry</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 bg-white/[0.03]">
              <tr>
                <th className="p-8">Tenant_Identity</th>
                <th className="p-8">Master_Admin</th>
                <th className="p-8">Contract_Period</th>
                <th className="p-8">Status</th>
                <th className="p-8 text-right">Protocol_Switch</th>
              </tr>
            </thead>
            <tbody className="not-italic">
              {tenants.map((client) => (
                <tr key={client.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="font-black text-xl text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">
                        {client.name}
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">ID: {client.id} // OWNER: {client.owner}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2 text-xs font-mono text-blue-300 bg-blue-500/5 px-3 py-1 rounded-lg w-fit">
                      <Key size={12}/> {client.adminEmail}
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <Calendar size={14} className="text-blue-500 opacity-50"/>
                      <span>{client.startDate} <span className="text-gray-700 mx-1">/</span> <span className="text-white font-bold">{client.endDate}</span></span>
                    </div>
                  </td>
                  <td className="p-8">
                    {client.isActive ? (
                      <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest italic">
                        <CheckCircle2 size={14}/> Online_Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
                        <Power size={14}/> System_Locked
                      </div>
                    )}
                  </td>
                  <td className="p-8 text-right">
                    <button 
                      onClick={() => toggleStatus(client.id)}
                      className={`p-4 rounded-2xl transition-all ${client.isActive ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'}`}
                    >
                      <Power size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Deploy_New_Tenant</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleRegister} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Outlet_Business_Name</label>
                <input 
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 transition-all italic"
                  placeholder="E.g. CAFE MERDEKA"
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Owner_Identity</label>
                <input 
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 transition-all italic"
                  placeholder="E.g. MR. JOHN DOE"
                  onChange={(e) => setNewClient({...newClient, owner: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">License_Duration (YEARS)</label>
                <select 
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 transition-all italic"
                  onChange={(e) => setNewClient({...newClient, duration: e.target.value})}
                >
                  <option value="1" className="bg-[#0f172a]">1 Year Protocol</option>
                  <option value="2" className="bg-[#0f172a]">2 Year Protocol</option>
                  <option value="5" className="bg-[#0f172a]">5 Year Protocol</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] shadow-xl shadow-blue-900/40 transition-all mt-4"
              >
                Execute_Deployment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}