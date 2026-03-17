import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Package, Plus, Trash2, Save, Loader2, Image as ImageIcon, Search } from "lucide-react";

export default function Paket() {
  const tenantId = localStorage.getItem("tenant_id") || "DISBA_OUTLET_001";

  // State Data
  const [normalMenus, setNormalMenus] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  
  // State Form Paket Baru
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageImage, setPackageImage] = useState("");
  const [bundleItems, setBundleItems] = useState<{ menu_id: number; name: string; quantity: number }[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Ambil Menu Normal (Bukan Paket) untuk bahan rakitan
    const { data: menus } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("category", "PAKET")
      .order("name", { ascending: true });
    if (menus) setNormalMenus(menus);

    // 2. Ambil Daftar Paket yang sudah ada
    const { data: pkgs } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("category", "PAKET")
      .order("created_at", { ascending: false });
    
    // 3. Ambil isi dari masing-masing paket
    if (pkgs) {
      const { data: items } = await supabase.from("package_items").select("*, menus(name)").eq("tenant_id", tenantId);
      
      const packagesWithItems = pkgs.map(p => ({
        ...p,
        items: items?.filter(i => i.package_id === p.id) || []
      }));
      setPackages(packagesWithItems);
    }
  };

  // --- LOGIKA PERAKITAN PAKET ---
  const addMenuToBundle = (menu: any) => {
    const existing = bundleItems.find((item) => item.menu_id === menu.id);
    if (existing) {
      setBundleItems(bundleItems.map(item => item.menu_id === menu.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setBundleItems([...bundleItems, { menu_id: menu.id, name: menu.name, quantity: 1 }]);
    }
  };

  const removeMenuFromBundle = (menuId: number) => {
    setBundleItems(bundleItems.filter(item => item.menu_id !== menuId));
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName || !packagePrice || bundleItems.length === 0) {
      alert("Nama, Harga, dan Isi Paket wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      // 1. Simpan Paket ke tabel Menus (Agar muncul di HP Tamu)
      const { data: newMenu, error: menuErr } = await supabase.from("menus").insert({
        tenant_id: tenantId,
        name: packageName,
        price: Number(packagePrice),
        category: "PAKET",
        image_url: packageImage || null
      }).select().single();

      if (menuErr) throw menuErr;

      // 2. Simpan isi paket ke tabel package_items
      const insertItems = bundleItems.map(item => ({
        tenant_id: tenantId,
        package_id: newMenu.id,
        menu_id: item.menu_id,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase.from("package_items").insert(insertItems);
      if (itemsErr) throw itemsErr;

      // Reset Form
      setPackageName("");
      setPackagePrice("");
      setPackageImage("");
      setBundleItems([]);
      fetchData();
      alert("Paket Bundling Berhasil Dibuat!");
    } catch (err: any) {
      alert("Gagal menyimpan paket: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm("Yakin ingin menghapus paket ini?")) return;
    await supabase.from("menus").delete().eq("id", id).eq("tenant_id", tenantId);
    // (Isi paket di package_items otomatis terhapus karena ON DELETE CASCADE di SQL)
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl"><Package size={32} /></div>
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Manajemen Paket</h1>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Buat Bundling & Promo Otomatis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ==================================================== */}
        {/* KIRI: FORM BUILDER PAKET BARU                        */}
        {/* ==================================================== */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Plus className="text-purple-500"/> RAKIT PAKET BARU</h2>
          
          <form onSubmit={handleSavePackage} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Nama Paket</label>
              <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="Contoh: Paket Buka Puasa Berdua" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Harga Jual (Rp)</label>
                <input type="number" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold font-mono focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="50000" required />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Link Foto (Opsional)</label>
                <input type="text" value={packageImage} onChange={(e) => setPackageImage(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="https://..." />
              </div>
            </div>

            {/* AREA PEMILIHAN MENU (KERANJANG BUNDLING) */}
            <div className="mt-8 pt-6 border-t border-dashed">
              <label className="text-xs font-black text-purple-600 uppercase tracking-widest mb-4 block">1. Pilih Isi Paket:</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border bg-gray-50 rounded-xl">
                {normalMenus.map(menu => (
                  <button type="button" key={menu.id} onClick={() => addMenuToBundle(menu)} className="text-left bg-white border p-2 rounded-lg text-xs font-bold hover:border-purple-500 hover:text-purple-600 transition-all flex justify-between items-center">
                    <span className="truncate pr-2">{menu.name}</span>
                    <Plus size={14}/>
                  </button>
                ))}
              </div>
            </div>

            {/* KERANJANG ISI PAKET */}
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl min-h-[100px]">
              <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-3 block">2. Komposisi Bundling:</label>
              {bundleItems.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic text-center py-4">Belum ada menu yang dipilih</p>
              ) : (
                <div className="space-y-2">
                  {bundleItems.map(item => (
                    <div key={item.menu_id} className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm text-xs font-bold">
                      <span className="text-purple-700">{item.quantity}x <span className="text-gray-700">{item.name}</span></span>
                      <button type="button" onClick={() => removeMenuFromBundle(item.menu_id)} className="text-red-500 hover:bg-red-50 p-1 rounded-md"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20}/> SIMPAN PAKET</>}
            </button>
          </form>
        </div>

        {/* ==================================================== */}
        {/* KANAN: DAFTAR PAKET AKTIF                            */}
        {/* ==================================================== */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col h-[80vh]">
          <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Package className="text-blue-500"/> PAKET AKTIF ({packages.length})</h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Search size={48} className="mb-4 opacity-20"/>
                <p className="text-sm font-bold uppercase tracking-widest">Belum ada paket bundling</p>
              </div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-all bg-gray-50 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center overflow-hidden border">
                        {pkg.image_url ? <img src={pkg.image_url} className="w-full h-full object-cover"/> : <ImageIcon className="text-purple-400" size={20}/>}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-sm uppercase">{pkg.name}</h3>
                        <p className="text-purple-600 font-mono font-bold text-xs">Rp {Number(pkg.price).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-300 hover:text-red-500 bg-white p-2 rounded-lg border shadow-sm transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                  </div>
                  
                  {/* Tampilkan Isi Paket */}
                  <div className="bg-white p-3 rounded-xl border border-dashed border-gray-200">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Isi Paket:</p>
                    <div className="space-y-1">
                      {pkg.items.map((i: any, idx: number) => (
                        <p key={idx} className="text-[10px] font-bold text-gray-600">
                          <span className="text-purple-500">{i.quantity}x</span> {i.menus?.name || 'Menu Terhapus'}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}