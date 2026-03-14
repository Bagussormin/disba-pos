import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, Building2, CreditCard, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function MerchantBank() {
  const [banks, setBanks] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 🔥 KUNCI MASTER MULTI-OUTLET
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchBanks();
  }, [tenantId]);

  // 1. FUNGSI AMBIL DATA
  const fetchBanks = async () => {
    try {
      // 🔥 FILTER BANK PER OUTLET
      const { data, error } = await supabase
        .from("merchant_banks")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("id", { ascending: true });
      
      if (error) throw error;
      if (data) setBanks(data);
    } catch (err: any) {
      console.error("Gagal memuat data:", err.message);
      setErrorMessage("Gagal memuat data bank.");
    }
  };

  // 2. FUNGSI SIMPAN DATA
  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_number || !tenantId) {
      return alert("Minimal isi Nama Bank & No. Rekening!");
    }
    
    setLoading(true);
    setErrorMessage(null);

    try {
      // 🔥 INJEKSI IDENTITAS OUTLET KE BANK BARU
      const { error } = await supabase
        .from("merchant_banks")
        .insert([
          {
            bank_name: newBank.bank_name.toUpperCase(),
            account_number: newBank.account_number,
            account_holder: newBank.account_name.toUpperCase(), 
            is_active: true,
            tenant_id: tenantId 
          }
        ]);

      if (error) throw error;

      // Reset Form & Refresh
      setNewBank({ bank_name: "", account_number: "", account_name: "" });
      await fetchBanks();
      alert("Bank Berhasil Ditambahkan!");
      
    } catch (err: any) {
      console.error("Error Simpan:", err.message);
      alert("Gagal Simpan: " + err.message);
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. FUNGSI UPDATE STATUS
  const toggleStatus = async (id: number, currentStatus: boolean) => {
    if (!tenantId) return;
    const { error } = await supabase
      .from("merchant_banks")
      .update({ is_active: !currentStatus })
      .eq("id", id)
      .eq("tenant_id", tenantId); // 🔥 AMANKAN
    
    if (!error) fetchBanks();
  };

  // 4. FUNGSI HAPUS
  const deleteBank = async (id: number) => {
    if (!tenantId) return;
    if (confirm("Hapus akun bank ini secara permanen?")) {
      const { error } = await supabase
        .from("merchant_banks")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); // 🔥 AMANKAN
      if (!error) fetchBanks();
    }
  };

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-white font-sans">
      {/* HEADER */}
      <div className="mb-10">
        <h2 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
          <Building2 className="text-blue-500" size={32} /> 
          MERCHANT_<span className="text-blue-500">BANK</span>
        </h2>
        <p className="text-gray-500 text-[10px] font-bold tracking-[0.3em] mt-2 uppercase italic">Integrasi Pembayaran Non-Tunai Kasir | {tenantId}</p>
      </div>

      {/* ALERT JIKA ADA ERROR DATABASE */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-widest">
          <AlertCircle size={18} />
          <span>DB_ERROR: {errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* FORM INPUT (KIRI) */}
        <div className="col-span-4">
          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl sticky top-8">
            <h3 className="text-[10px] font-black mb-6 uppercase tracking-[0.2em] text-blue-400">Konfigurasi_Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-500 mb-2 block uppercase">Nama Bank / E-Wallet</label>
                <input 
                  placeholder="E.G. BCA, MANDIRI, QRIS" 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] font-black outline-none focus:border-blue-500 transition-all uppercase italic text-white"
                  value={newBank.bank_name}
                  onChange={e => setNewBank({...newBank, bank_name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-500 mb-2 block uppercase">Nomor Rekening / ID</label>
                <input 
                  placeholder="000-000-000" 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] font-mono font-bold outline-none focus:border-blue-500 transition-all text-white"
                  value={newBank.account_number}
                  onChange={e => setNewBank({...newBank, account_number: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-gray-500 mb-2 block uppercase">Atas Nama (Account Holder)</label>
                <input 
                  placeholder="NAMA PEMILIK AKUN" 
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-[11px] font-black outline-none focus:border-blue-500 transition-all uppercase italic text-white"
                  value={newBank.account_name}
                  onChange={e => setNewBank({...newBank, account_name: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAddBank} 
                disabled={loading || !tenantId}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 p-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 uppercase tracking-widest mt-4"
              >
                {loading ? "SAVING..." : <><Plus size={16}/> Simpan_Bank</>}
              </button>
            </div>
          </div>
        </div>

        {/* LIST DATA (KANAN) */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {banks.length === 0 && !loading && (
              <div className="col-span-2 py-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center opacity-20">
                <CreditCard size={48} />
                <p className="font-black text-[10px] mt-4 uppercase tracking-[0.3em]">No_Merchant_Detected</p>
              </div>
            )}
            
            {banks.map(bank => (
              <div key={bank.id} className={`group relative p-6 rounded-3xl border transition-all duration-300 ${bank.is_active ? 'bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20 shadow-xl' : 'bg-white/[0.02] border-white/5 opacity-40 grayscale'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 rounded-2xl ${bank.is_active ? 'bg-blue-600/20 text-blue-400' : 'bg-white/5 text-gray-500'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleStatus(bank.id, bank.is_active)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white">
                      {bank.is_active ? <CheckCircle2 size={16} className="text-green-500"/> : <XCircle size={16}/>}
                    </button>
                    <button onClick={() => deleteBank(bank.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-all text-gray-500 hover:text-red-500">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none italic">Verified_Merchant</p>
                  <h4 className="text-2xl font-black italic uppercase tracking-tighter">{bank.bank_name}</h4>
                  <p className="text-lg font-mono font-bold text-white/80">{bank.account_number}</p>
                  <p className="text-[9px] font-black text-gray-500 uppercase mt-2 italic">
                    {bank.account_holder || "NO_HOLDER_NAME"}
                  </p>
                </div>

                <div className="absolute bottom-6 right-6">
                  <span className={`text-[7px] font-black px-2 py-1 rounded-md uppercase tracking-tighter ${bank.is_active ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}>
                    {bank.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}