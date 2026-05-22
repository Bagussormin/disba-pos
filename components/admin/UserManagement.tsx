import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { UserPlus, Shield, Trash2, Key, Loader2, X, Save, User } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  pin: string; // 🔥 PENTING: PIN HARUS DI-HASH SEBELUM DISIMPAN DI DATABASE!
  role: string;
  tenant_id: string;
  created_at: string;
  password?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantId = localStorage.getItem("tenant_id");

  const [formData, setFormData] = useState({
    username: "",
    pin: "",
    role: "kasir"
  });

  useEffect(() => {
    if (tenantId) fetchUsers();
  }, [tenantId]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching users:", error.message);
    } else if (data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || formData.pin.length < 4) return alert("Lengkapi data!");
    setSaving(true);

    try {
      // 🔥 PENTING: DI SINI PIN HARUS DI-HASH SEBELUM DISIMPAN KE DATABASE!
      // Contoh: const hashedPassword = await bcrypt.hash(formData.pin, 10);
      // Untuk demo, kita simpan langsung, TAPI INI TIDAK AMAN UNTUK PRODUKSI.
      const { error } = await supabase.from("users").insert([{
        ...formData,
        tenant_id: tenantId,
        password: formData.pin // 🔥 RISIKO KEAMANAN: PIN disimpan langsung. HARUS DI-HASH!
      }]);

      if (!error) {
        setModalOpen(false);
        setFormData({ username: "", pin: "", role: "kasir" });
        fetchUsers();
      } else {
        alert("Gagal: " + error.message);
      }
    } catch (err: any) {
      console.error("Save User Error:", err.message);
      alert("Terjadi kesalahan saat menyimpan user.");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (confirm("Hapus akses user ini?")) {
      try {
        const { error } = await supabase.from("users").delete().eq("id", id).eq("tenant_id", tenantId);
        if (error) throw error;
        fetchUsers();
      } catch (err: any) {
        console.error("Delete User Error:", err.message);
        alert("Gagal menghapus user: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Operator <span className="text-blue-500">Security</span></h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">Daftarkan PIN Kasir & Admin Disini</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-3 transition-all active:scale-95">
          <UserPlus size={18}/> Tambah Operator
        </button>
      </div>

      {/* USER LIST GRID */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Shield size={24} />
                </div>
                <button onClick={() => deleteUser(user.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Nama Operator</p>
                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">{user.username}</h3>
                
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-600 uppercase">PIN_ACCESS</span>
                    <span className="font-mono text-blue-500 font-bold tracking-[0.3em]">****</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border ${user.role === 'admin' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-blue-500 text-blue-400 bg-blue-500/5'}`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ADD USER */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6">
          <div className="bg-[#0b1120] border border-white/10 w-full max-w-md p-10 rounded-[3.5rem] shadow-2xl relative animate-in zoom-in duration-300">
            <button onClick={() => setModalOpen(false)} className="absolute top-8 right-8 text-gray-600 hover:text-white"><X size={24}/></button>
            
            <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-blue-600 rounded-2xl"><Key size={20}/></div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">New_Protocol</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">Operator_Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-gray-600" size={16}/>
                  <input required placeholder="E.G. KASIR_01" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold uppercase outline-none focus:border-blue-500 transition-all"
                    value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">PIN_KEY (Min. 4)</label>
                  <input required type="number" placeholder="****" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em]"
                    value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">Access_Role</label>
                  <select className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase outline-none appearance-none cursor-pointer"
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="kasir">KASIR</option>
                    <option value="waiter">WAITER</option>
                    <option value="admin">ADMIN_HQ</option>
                  </select>
                </div>
              </div>

              <button disabled={saving} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all mt-4">
                {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                DEPLOY_USER
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
