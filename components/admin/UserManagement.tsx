import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase"; // Sesuaikan path config supabase Anda
import { UserPlus, Trash2, ShieldCheck, User, Lock, Loader2 } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "waiter"
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from("profiles").insert([formData]);

    if (error) {
      alert("Gagal menambah user: " + error.message);
    } else {
      setFormData({ username: "", password: "", full_name: "", role: "waiter" });
      fetchUsers();
    }
    setSaving(false);
  };

  const deleteUser = async (id: string) => {
    if (confirm("Hapus user ini?")) {
      await supabase.from("profiles").delete().eq("id", id);
      fetchUsers();
    }
  };

  return (
    <div className="space-y-8 font-sans italic">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORM INPUT USER */}
        <div className="lg:col-span-1">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 backdrop-blur-md">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
              <UserPlus className="text-blue-500" size={20} /> Registrasi Staff
            </h2>
            
            <form onSubmit={handleAddUser} className="space-y-4 not-italic">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-500" size={16} />
                  <input 
                    required
                    type="text" 
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">Username</label>
                  <input 
                    required
                    type="text" 
                    placeholder="budi_pos"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase()})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">Role</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-blue-500 outline-none appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="waiter" className="bg-slate-900">WAITER</option>
                    <option value="kasir" className="bg-slate-900">KASIR</option>
                    <option value="admin" className="bg-slate-900">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 mb-1 block">PIN / Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-gray-500" size={16} />
                  <input 
                    required
                    type="password" 
                    placeholder="••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold focus:border-blue-500 outline-none"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <button 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-900/20 transition-all uppercase text-xs mt-4 flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : "Simpan User Baru"}
              </button>
            </form>
          </div>
        </div>

        {/* DAFTAR USER */}
        <div className="lg:col-span-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest italic">Staff Terdaftar</h2>
              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full font-black uppercase">{users.length} Total</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-gray-500 uppercase border-b border-white/5">
                    <th className="p-6">Nama & Username</th>
                    <th className="p-6">Role</th>
                    <th className="p-6">Password</th>
                    <th className="p-6 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6">
                        <p className="font-black text-sm uppercase">{user.full_name}</p>
                        <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">@{user.username}</p>
                      </td>
                      <td className="p-6">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase italic ${
                          user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 
                          user.role === 'kasir' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-6 font-mono text-xs text-gray-500 group-hover:text-white">
                        {user.password.replace(/./g, '*')}
                      </td>
                      <td className="p-6 text-center">
                        <button 
                          onClick={() => deleteUser(user.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}