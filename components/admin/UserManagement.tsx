
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  UserPlus,
  Shield,
  Trash2,
  Key,
  Loader2,
  X,
  Save,
  User,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface UserProfile {
  id: string;
  kasir: string;
  full_name: string | null;
  role: string | null;
  tenant_id: string;
  created_at: string;
}

type FormMode = "add" | "editPin";

function validateUserForm(
  username: string,
  pin: string,
  role: string
): string | null {
  const cleanUsername = username.trim();

  if (!cleanUsername) return "Nama operator tidak boleh kosong.";
  if (cleanUsername.length < 3) return "Nama operator minimal 3 karakter.";
  if (cleanUsername.length > 50) return "Nama operator maksimal 50 karakter.";

  if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanUsername)) {
    return "Nama operator hanya boleh huruf, angka, underscore, tanda hubung, dan spasi.";
  }

  if (!/^[0-9]{4,6}$/.test(pin)) {
    return "PIN harus terdiri dari 4-6 digit angka.";
  }

  if (!["admin", "manager", "kasir", "waiter", "kitchen"].includes(role)) {
    return "Role tidak valid.";
  }

  return null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    pin: "",
    role: "kasir",
  });

  const [formMode, setFormMode] = useState<FormMode>("add");
  const [selectedUserId, setSelectedUserId] = useState("");

  const tenantId =
    typeof window !== "undefined"
      ? localStorage.getItem("tenant_id")
      : null;

  useEffect(() => {
    if (tenantId) {
      void fetchUsers();
    } else {
      setLoading(false);
    }
    // fetchUsers membaca tenantId yang tersedia pada render ini.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fetchUsers = async () => {
    if (!tenantId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, kasir, full_name, role, tenant_id, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error.message);
        setFormError("Gagal memuat pengguna: " + error.message);
        return;
      }

      setUsers((data ?? []) as UserProfile[]);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setFormError("Gagal memuat pengguna.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: "",
      pin: "",
      role: "kasir",
    });
    setFormMode("add");
    setSelectedUserId("");
    setFormError(null);
    setFormSuccess(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormMode("add");
    setModalOpen(true);
  };

  const openEditPinModal = (user: UserProfile) => {
    resetForm();
    setFormMode("editPin");
    setSelectedUserId(user.id);
    setFormData({
      username: user.kasir,
      pin: "",
      role: user.role ?? "kasir",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!tenantId) {
      setFormError("Tenant ID tidak ditemukan. Harap login ulang.");
      return;
    }

    if (formMode === "add") {
      const validationError = validateUserForm(
        formData.username,
        formData.pin,
        formData.role
      );

      if (validationError) {
        setFormError(validationError);
        return;
      }
    } else {
      if (!selectedUserId) {
        setFormError("Pengguna yang akan diubah tidak ditemukan.");
        return;
      }

      if (!/^[0-9]{4,6}$/.test(formData.pin)) {
        setFormError("PIN harus terdiri dari 4-6 digit angka.");
        return;
      }
    }

    setSaving(true);

    try {
      if (formMode === "editPin") {
        const { error } = await supabase.rpc("update_user_pin", {
          p_user_id: selectedUserId,
          p_tenant_id: tenantId,
          p_new_pin: formData.pin,
        });

        if (error) {
          setFormError("Gagal mengganti PIN: " + error.message);
          return;
        }

        setFormSuccess(
          `PIN untuk "${formData.username}" berhasil diubah.`
        );
      } else {
        const { data, error } = await supabase.rpc(
          "create_user_with_hashed_credentials",
          {
            p_tenant_id: tenantId,
            p_username: formData.username.trim().toLowerCase(),
            p_pin: formData.pin,
            p_role: formData.role,
            p_password: null,
          }
        );

        if (error) {
          if (error.message?.includes("USERNAME_EXISTS")) {
            setFormError(
              "Username sudah digunakan di outlet ini. Pilih nama lain."
            );
          } else if (error.message?.includes("INVALID_PIN")) {
            setFormError("PIN tidak valid. Gunakan 4-6 digit angka.");
          } else if (error.message?.includes("INVALID_USERNAME")) {
            setFormError(
              "Username tidak valid. Gunakan 3-50 karakter."
            );
          } else if (error.message?.includes("INVALID_ROLE")) {
            setFormError("Role yang dipilih tidak valid.");
          } else {
            setFormError("Gagal mendaftarkan operator: " + error.message);
          }
          return;
        }

        if (!data || data.length === 0) {
          setFormError("Pendaftaran gagal. Silakan coba lagi.");
          return;
        }

        setFormSuccess(
          `Operator "${formData.username.toUpperCase()}" berhasil didaftarkan.`
        );
      }

      await fetchUsers();

      setFormData({
        username: "",
        pin: "",
        role: "kasir",
      });
      setFormMode("add");
      setSelectedUserId("");

      window.setTimeout(() => {
        setModalOpen(false);
        setFormError(null);
        setFormSuccess(null);
      }, 1500);
    } catch (err: any) {
      setFormError(
        "Terjadi kesalahan sistem: " +
          (err?.message || "Kesalahan tidak diketahui")
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string, username: string) => {
    if (!tenantId) {
      alert("Tenant ID tidak ditemukan. Tidak dapat menghapus pengguna.");
      return;
    }

    if (
      !confirm(
        `Hapus akses operator "${username}"? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      await fetchUsers();
    } catch (err: any) {
      alert(
        "Gagal menghapus operator: " +
          (err?.message || "Kesalahan tidak diketahui")
      );
    }
  };

  const handleModalClose = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Operator <span className="text-blue-500">Security</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">
            Kelola PIN dan akses operator
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-3 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Tambah Operator
        </button>
      </div>

      {/* ERROR MEMUAT DAFTAR */}
      {formError && !modalOpen && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          {formError}
        </div>
      )}

      {/* DAFTAR PENGGUNA */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500">
              <Shield size={40} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold">Belum ada operator terdaftar</p>
              <p className="text-xs mt-1">
                Klik "Tambah Operator" untuk mendaftarkan pengguna.
              </p>
            </div>
          )}

          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div
                  className={`p-4 rounded-2xl ${
                    user.role === "admin"
                      ? "bg-purple-500/10 text-purple-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  <Shield size={24} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditPinModal(user)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title={`Ganti PIN ${user.kasir}`}
                    aria-label={`Ganti PIN ${user.kasir}`}
                  >
                    <Key size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteUser(user.id, user.kasir)}
                    className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    title="Hapus operator"
                    aria-label={`Hapus ${user.kasir}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">
                  Nama Operator
                </p>

                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">
                  {user.full_name || user.kasir}
                </h3>

                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1 bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-600 uppercase">
                      PIN_ACCESS
                    </span>
                    <span className="font-mono text-blue-500 font-bold tracking-[0.3em]">
                      ••••
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest border ${
                      user.role === "admin"
                        ? "border-purple-500 text-purple-400 bg-purple-500/5"
                        : "border-blue-500 text-blue-400 bg-blue-500/5"
                    }`}
                  >
                    {(user.role ?? "kasir").toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL TAMBAH OPERATOR / GANTI PIN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-[#0b1120] border border-white/10 w-full max-w-md p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={saving}
              className="absolute top-6 right-6 text-gray-600 hover:text-white disabled:opacity-40"
              aria-label="Tutup formulir"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-8 pr-8">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <Key size={20} />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                {formMode === "editPin" ? "Reset_PIN" : "New_Protocol"}
              </h2>
            </div>

            {formError && (
              <div className="mb-5 p-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 flex items-start gap-2 text-sm">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 flex-shrink-0"
                />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-5 p-3 rounded-2xl border border-green-500/30 bg-green-500/10 text-green-400 flex items-start gap-2 text-sm">
                <CheckCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0"
                />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">
                  {formMode === "editPin"
                    ? "Operator yang dipilih"
                    : "Operator_Name (3-50 karakter)"}
                </label>

                <div className="relative">
                  <User
                    className="absolute left-4 top-4 text-gray-600"
                    size={16}
                  />
                  <input
                    required
                    disabled={formMode === "editPin" || saving}
                    placeholder="E.G. kasir_01"
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        username: e.target.value,
                      });
                      setFormError(null);
                    }}
                  />
                </div>
              </div>

              <div
                className={
                  formMode === "add"
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                    : ""
                }
              >
                <div>
                  <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">
                    PIN Baru (4-6 digit)
                  </label>

                  <input
                    required
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4,6}"
                    maxLength={6}
                    autoComplete="new-password"
                    placeholder="••••"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 transition-all text-center tracking-[0.5em]"
                    value={formData.pin}
                    onChange={(e) => {
                      const pin = e.target.value.replace(/[^0-9]/g, "");
                      setFormData({ ...formData, pin });
                      setFormError(null);
                    }}
                    disabled={saving}
                  />
                </div>

                {formMode === "add" && (
                  <div>
                    <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest ml-1 mb-2 block">
                      Access_Role
                    </label>

                    <select
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase outline-none appearance-none cursor-pointer"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value,
                        })
                      }
                      disabled={saving}
                    >
                      <option value="kasir">KASIR</option>
                      <option value="waiter">WAITER</option>
                      <option value="kitchen">KITCHEN</option>
                      <option value="manager">MANAGER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </div>
                )}
              </div>

              {formMode === "editPin" ? (
                <p className="text-xs text-gray-500">
                  Hanya PIN pengguna yang akan diubah. Role dan username tetap
                  seperti semula.
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Gunakan PIN 4-6 digit. Pastikan PIN diberikan hanya kepada
                  operator yang bersangkutan.
                </p>
              )}

              <button
                type="submit"
                disabled={saving || Boolean(formSuccess)}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all mt-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {formMode === "editPin"
                      ? "SIMPAN PIN BARU"
                      : "DAFTARKAN OPERATOR"}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
