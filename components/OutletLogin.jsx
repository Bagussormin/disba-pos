import { useState } from 'react'; // Pastikan ini ada di paling atas
import { supabase } from "../lib/supabase"; 

// HAPUS BARIS YANG INI: import { supabase } from "../supabaseClient";

export default function OutletLogin() {
  const [email, setEmail] = useState('');
  // ... sisa kode di bawahnya ...
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginOutlet = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Cek email dan password ke Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (authError) {
      alert('Login Gagal: Periksa kembali email dan password Outlet.');
      setLoading(false);
      return;
    }

    // 2. Jika sukses, ambil data tenant_id dari tabel outlet_profile
    const { data: outletData, error: outletError } = await supabase
      .from('outlet_profile')
      .select('tenant_id, name')
      .eq('email', email)
      .single();

    if (outletData) {
      // 3. INI KUNCINYA: Simpan tenant_id dan tandai sistem sudah siap
      localStorage.setItem('tenant_id', outletData.tenant_id);
      localStorage.setItem('tenant_name', outletData.name);
      localStorage.setItem('system_ready', 'true'); // Menghilangkan Landing Page selamanya di alat ini
      
      alert(`Berhasil! Tablet ini sekarang terikat ke Outlet: ${outletData.name}`);
      
      // 4. Arahkan otomatis ke halaman Login Karyawan
      window.location.href = "/login"; 
    } else {
      alert('Data Outlet tidak ditemukan di database.');
    }
    
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-4 text-white font-sans italic w-full">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-slate-700">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-400 not-italic">
          Inisialisasi Perangkat Outlet
        </h2>
        <form onSubmit={handleLoginOutlet} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email Outlet (ex: nessbarandpool@gmail.com)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-500 text-white not-italic"
            required
          />
          <input
            type="password"
            placeholder="Password Outlet"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 bg-slate-900 border border-slate-600 rounded focus:outline-none focus:border-blue-500 text-white not-italic"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition mt-2 not-italic"
          >
            {loading ? 'Mengikat Perangkat...' : 'Kunci Perangkat ke Outlet'}
          </button>
        </form>
      </div>
    </div>
  );
}