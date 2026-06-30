import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { UserPlus, Shield, Trash2, Key, Loader2, X, Save, User, AlertTriangle, CheckCircle } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  role: string;
  tenant_id: string;
  created_at: string;
}

// Validasi form sebelum submit
function validateUserForm(username: string, pin: string, role: string): string | null {
  if (!username.trim()) return "Nama operator tidak boleh kosong.";
  if (username.length < 3) return "Nama operator minimal 3 karakter.";
  if (username.length > 50) return "Nama operator maksimal 50 karakter.";
  if (!/^[a-zA-Z0-9_\- ]+$/.test(username)) return "Nama operator hanya boleh huruf, angka, underscore, dan spasi.";

  if (!pin) return "PIN tidak boleh kosong.";
  if (!/^\d{4,6}$/.test(pin)) return "PIN harus berupa 4-6 digit angka saja.";

  if (!['admin', 'kasir', 'waiter', 'kitchen'].includes(role)) return "Role tidak valid.";

  return null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

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
      .select("id, username, role, tenant_id, created_at")
      .eq("tenant_id", tenantId) // ✅ Tenant isolation
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
    setFormError(null);
    setFormSuccess(null);

    // Validasi form sebelum kirim ke server
    const validationError = validateUserForm(formData.username, formData.pin, formData.role);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!tenantId) {
      setFormError("Tenant ID tidak ditemukan. Harap login ulang.");
      return;
    }

    setSaving(true);

    try {
      // ✅ SECURE: Hashing PIN dilakukan di server via pgcrypto (bukan bcrypt di browser)
      // RPC function create_user_with_hashed_credentials menangani hashing & validasi
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_user_with_hashed_credentials',
        {
          p_tenant_id: tenantId,
          p_username: formData.username.trim().toLowerCase(),
          p_pin: formData.pin,
          p_role: formData.role,
          p_password: null // Hanya admin yang butuh password terpisah
        }
      );

      if (rpcError) {
        // Tangani error spesifik dari server
        if (rpcError.message?.includes('USERNAME_EXISTS')) {
          setFormError("Username sudah digunakan di outlet ini. Pilih nama lain.");
        } else if (rpcError.message?.includes('INVALID_PIN')) {
          setFormError("PIN tidak valid. Gunakan 4-6 digit angka.");
        } else if (rpcError.message?.includes('INVALID_USERNAME')) {
          setFormError("Username tidak valid (minimal 3, maksimal 50 karakter).");
        } else {
          setFormError("Gagal mendaftarkan operator: " + rpcError.message);
        }
        return;
      }

      if (!rpcData || rpcData.length === 0) {
        setFormError("Gagal mendaftarkan operator. Coba lagi.");
        return;
      }

      setFormSuccess(`Operator "${formData.username.toUpperCase()}" berhasil didaftarkan!`);
      setFormData({ username: "", pin: "", role: "kasir" });
      fetchUsers();

      // Auto-close modal setelah 1.5 detik
      setTimeout(() => {
        setModalOpen(false);
        setFormSuccess(null);
      }, 1500);

    } catch (err: any) {
      setFormError("Terjadi kesalahan sistem: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (!tenantId) return alert("Tenant ID tidak ditemukan. Tidak dapat menghapus user.");

    // Konfirmasi penghapusan
    if (!confirm(`Hapus akses operator "${username}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); // ✅ Tenant isolation saat delete

      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert("Gagal menghapus operator: " + (err.message || "Unknown error"));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFormError(null);
    setFormSuccess(null);
    setFormData({ username: "", pin: "", role: "kasir" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Operator <span className="text-blue-500">Security</span></h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">Daftarkan PIN Kasir & Admin Disini</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-3 transition-all active:scale-95"
        >
          <UserPlus size={18} /> Tambah Operator
        </button>
      </div>

      {/* USER LIST GRID */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-500">
              <Shield size={40} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold">Belum ada operator terdaftar</p>
              <p className="text-xs mt-1">Klik "Tambah Operator" untuk mendaftarkan kasir/waiter</p>
            </div>
          )}
          {users.map((user) => (
            <div key={user.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  <Shield size={24} />
                </div>
                <button
                  onClick={() => deleteUser(user.id, user.username)}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                  title="Hapus operator"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Nama Operator</p>
                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">{user.username}</h3>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-600 uppercase">PIN_ACCESS</span>
                    <span className="font-mono text-blue-500 font-bold tracking-[0.3em]">••••</span>
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
            <button onClick={handleModalClose} className="absolute top-8 right-8 text-gray-600 hover:text-white">
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-600 rounded-2xl"><Key size={20} /></div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">New_Protocol</h2>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="mb-5 p-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-start gap-2 text-sm">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Success */}
            {formSuccess && (
              <div className="mb-5 p-3 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-400 flex items-start gap-2 text-sm">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">
                  Operator_Name <span className="text-gray-500">(3-50 karakter, alfanumerik)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-gray-600" size={16} />
                  <input
                    required
                    placeholder="E.G. kasir_01"
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                    value={formData.username}
                    onChange={e => { setFormData({ ...formData, username: e.target.value }); setFormError(null); }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">
                    PIN_Key <span className="text-gray-500">(4-6 digit)</span>
                  </label>
                  <input
                    required
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4,6}"
                    maxLength={6}
                    placeholder="••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em]"
                    value={formData.pin}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, pin: val });
                      setFormError(null);
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">Access_Role</label>
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase outline-none appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="kasir">KASIR</option>
                    <option value="waiter">WAITER</option>
                    <option value="kitchen">KITCHEN</option>
                    <option value="admin">ADMIN_HQ</option>
                  </select>
                </div>
              </div>

              <p className="text-[9px] text-gray-600 mt-2">
                🔐 PIN akan di-hash menggunakan enkripsi bcrypt di server. Tidak ada plaintext yang tersimpan.
              </p>

              <button
                disabled={saving}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all mt-4"
              >
                {saving ? <><Loader2 className="animate-spin" size={18} /> Mendaftarkan...</> : <><Save size={18} /> DEPLOY_USER</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
