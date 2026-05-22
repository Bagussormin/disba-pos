import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Users, Plus, Search, Phone, Mail, Star, TrendingUp,
  X, Save, Loader2, Edit2, Gift, ShoppingBag, Calendar, Trash2
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: "BRONZE" | "GOLD" | "PLATINUM";
  total_spent: number;
  visit_count: number;
  last_visit?: string;
  tenant_id: string;
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    points: 0,
    tier: "BRONZE"
  });

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchCustomers();
  }, [tenantId]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("total_spent", { ascending: false });
    if (data) setCustomers(data as Customer[]);
    if (error) console.error("Error fetching customers:", error.message);
    setLoading(false);
  };

  const openModal = (customer?: any) => {
    if (customer) {
      setSelectedCustomer(customer);
      setForm({ 
        name: customer.name, 
        phone: customer.phone || "", 
        email: customer.email || "", 
        points: customer.points || 0,
        tier: customer.tier || "BRONZE" 
      });
    } else {
      setSelectedCustomer(null);
      setForm({ name: "", phone: "", email: "", points: 0, tier: "BRONZE" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      const payload = { ...form, tenant_id: tenantId };
      if (selectedCustomer) {
        await supabase.from("customers").update(payload).eq("id", selectedCustomer.id).eq("tenant_id", tenantId);
      } else {
        await supabase.from("customers").insert(payload);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus pelanggan ini?")) return;
    await supabase.from("customers").delete().eq("id", id).eq("tenant_id", tenantId);
    fetchCustomers();
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totalPoints = customers.reduce((a, c) => a + (c.points || 0), 0);
  const totalSpent = customers.reduce((a, c) => a + (Number(c.total_spent) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-white uppercase italic font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-black text-blue-500 tracking-tighter">CRM_PELANGGAN</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">Customer Relationship & Loyalty Management</p>
        </div>
        <button onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <Plus size={16} /> Tambah Pelanggan
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pelanggan", val: customers.length, icon: <Users size={18} />, color: "blue" },
          { label: "Total Poin Beredar", val: totalPoints.toLocaleString(), icon: <Star size={18} />, color: "yellow" },
          { label: "Total Belanja", val: `Rp ${(totalSpent / 1000000).toFixed(1)}M`, icon: <TrendingUp size={18} />, color: "emerald" },
          { label: "Rata-rata Visit", val: (customers.reduce((a, c) => a + (c.visit_count || 0), 0) / (customers.length || 1)).toFixed(1) + "x", icon: <ShoppingBag size={18} />, color: "purple" },
        ].map(({ label, val, icon, color }) => (
          <div key={label} className={`bg-white/[0.03] border border-${color}-500/20 p-5 rounded-2xl`}>
            <div className={`text-${color}-400 mb-3`}>{icon}</div>
            <p className="text-[8px] font-black text-gray-500 tracking-widest uppercase">{label}</p>
            <p className={`text-xl font-black text-${color}-400 mt-1`}>{val}</p>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Cari nama atau nomor HP..."
          className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-2xl outline-none focus:border-blue-500 text-sm font-bold not-italic"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
      ) : (
        <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left p-4 text-[9px] font-black text-gray-500 tracking-widest">PELANGGAN</th>
                <th className="text-left p-4 text-[9px] font-black text-gray-500 tracking-widest">KONTAK</th>
                <th className="text-center p-4 text-[9px] font-black text-yellow-500 tracking-widest">POIN</th>
                <th className="text-right p-4 text-[9px] font-black text-emerald-500 tracking-widest">TOTAL BELANJA</th>
                <th className="text-center p-4 text-[9px] font-black text-gray-500 tracking-widest">KUNJUNGAN</th>
                <th className="text-center p-4 text-[9px] font-black text-gray-500 tracking-widest">TERAKHIR</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-600 text-xs font-black">Belum ada pelanggan terdaftar</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-all group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-400 text-sm">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{c.name}</p>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${
                          c.tier === 'GOLD' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          c.tier === 'PLATINUM' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {c.tier || 'BRONZE'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-mono text-gray-300">{c.phone}</p>
                    {c.email && <p className="text-[9px] text-gray-600">{c.email}</p>}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-black text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-lg border border-yellow-500/20">
                      {(c.points || 0).toLocaleString()} pts
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-black font-mono text-emerald-400">Rp {Number(c.total_spent || 0).toLocaleString()}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs font-black text-white">{c.visit_count || 0}x</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[9px] text-gray-500">
                      {c.last_visit ? new Date(c.last_visit).toLocaleDateString('id-ID') : "-"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openModal(c)}
                        className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(c.id)}
                        className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[6000] p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-gray-500 hover:text-white">
              <X size={22} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-blue-500" size={24} />
              <h2 className="text-lg font-black italic">{selectedCustomer ? "Edit Pelanggan" : "Pelanggan Baru"}</h2>
            </div>

            <form onSubmit={handleSave} className="space-y-4 not-italic">
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 uppercase">Nama Lengkap *</label>
                <input required className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-blue-500"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama pelanggan..." />
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 uppercase">No. HP (Kunci Unik) *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 text-gray-600" size={16} />
                  <input required className="w-full bg-white/5 border border-white/10 p-4 pl-11 rounded-2xl font-bold text-white outline-none focus:border-blue-500 font-mono"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 uppercase">Email (Opsional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-4 text-gray-600" size={16} />
                  <input type="email" className="w-full bg-white/5 border border-white/10 p-4 pl-11 rounded-2xl font-bold text-white outline-none focus:border-blue-500 lowercase"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-gray-500 block mb-2 uppercase">Membership Tier</label>
                <select className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none"
                  value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
                  <option value="BRONZE" className="bg-slate-900">BRONZE</option>
                  <option value="GOLD" className="bg-slate-900">GOLD</option>
                  <option value="PLATINUM" className="bg-slate-900">PLATINUM</option>
                </select>
              </div>
              {selectedCustomer && (
                <div>
                  <label className="text-[9px] font-black text-yellow-500 block mb-2 uppercase flex items-center gap-1"><Gift size={10} /> Poin Bonus (Manual Adjustment)</label>
                  <input type="number" min="0" className="w-full bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl font-bold text-yellow-400 outline-none text-center text-xl"
                    value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
                </div>
              )}
              <button disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/20 transition-all">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> SIMPAN</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
