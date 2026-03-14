import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, Edit2, Image as ImageIcon, X, Loader2, Upload, Tag } from "lucide-react";

interface MenuItem {
  id: number | null;
  name: string;
  price: number | string;
  category: string;
  image_url: string;
  tenant_id?: string; 
}

interface Category {
  id: number;
  name: string;
  tenant_id?: string;
}

export default function MenuMaster() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // 🔥 KUNCI MASTER MULTI-OUTLET (Aman dari Next.js Error)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const [formData, setFormData] = useState<MenuItem>({
    id: null,
    name: "",
    price: "",
    category: "",
    image_url: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (tenantId) {
      fetchMenus();
      fetchCategories();
    }
  }, [tenantId]);

  // --- DATA FETCHING DENGAN FILTER TENANT ---
  const fetchMenus = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenantId) // 🔒 HANYA TARIK MENU MILIK OUTLET INI
      .order("category", { ascending: true });
    
    if (data) setMenus(data);
    if (error) console.error("Error fetching products:", error);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId) // 🔒 HANYA TARIK KATEGORI MILIK OUTLET INI
      .order("name", { ascending: true });

    if (data) {
      setCategories(data);
      if (data.length > 0 && !formData.id) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    }
  };

  // --- HANDLERS DENGAN INJEKSI TENANT ---
  const handleAddCategory = async () => {
    if (!newCatName || !tenantId) return;
    const { error } = await supabase
      .from("categories")
      .insert([{ 
        name: newCatName.toUpperCase(),
        tenant_id: tenantId // 🔒 SIMPAN KATEGORI ATAS NAMA OUTLET INI
      }]);
      
    if (!error) {
      setNewCatName("");
      fetchCategories();
    }
  };

  const deleteCategory = async (id: number) => {
    if (!tenantId) return;
    if (confirm("Hapus kategori ini?")) {
      await supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId); // 🔒 PASTIKAN HANYA BISA HAPUS MILIK SENDIRI
      fetchCategories();
    }
  };

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    // Tambahkan nama outlet di nama file agar rapi di storage Supabase
    const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('menu-items').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return alert("Sesi tidak valid. Harap login ulang.");
    setLoading(true);

    let finalImageUrl = formData.image_url;
    if (imageFile) {
      const uploadedUrl = await handleImageUpload(imageFile);
      if (uploadedUrl) finalImageUrl = uploadedUrl;
    }

    const payload = { 
      name: formData.name.toUpperCase(),
      price: Number(formData.price), 
      category: formData.category.toUpperCase(),
      image_url: finalImageUrl,
      tenant_id: tenantId // 🔒 INJEKSI IDENTITAS OUTLET SAAT SIMPAN MENU
    };

    if (formData.id) {
      await supabase.from("products").update(payload).eq("id", formData.id).eq("tenant_id", tenantId);
    } else {
      await supabase.from("products").insert([payload]);
    }

    closeModal();
    fetchMenus();
    setLoading(false);
  };

  const handleDeleteMenu = async (id: number) => {
    if (!tenantId) return;
    if (confirm("Hapus menu ini?")) {
      await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenantId);
      fetchMenus();
    }
  };

  const editMenu = (menu: MenuItem) => {
    setFormData(menu);
    setPreviewUrl(menu.image_url);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, name: "", price: "", category: categories[0]?.name || "", image_url: "" });
    setImageFile(null);
    setPreviewUrl(null);
  };

  // --- UI RENDER TAMPILAN ---
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 text-white bg-[#020617] min-h-screen italic uppercase font-sans">
      
      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5 shadow-lg">
        <div>
          <h1 className="text-2xl font-black text-blue-500 tracking-tighter">MENU_MASTER</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest">Outlet: {tenantId || "MEMUAT..."}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCatModalOpen(true)} disabled={!tenantId} className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-white/10">
            <Tag size={14} /> Kategori
          </button>
          <button onClick={() => setIsModalOpen(true)} disabled={!tenantId} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
            <Plus size={14} /> Tambah Menu
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && !isModalOpen && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      )}

      {/* GRID MENU */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all">
              {/* IMAGE AREA */}
              <div className="h-32 bg-black/50 relative flex justify-center items-center overflow-hidden">
                {menu.image_url ? (
                  <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110" />
                ) : (
                  <ImageIcon size={30} className="text-gray-700" />
                )}
                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[8px] font-black text-blue-400 border border-white/10">
                  {menu.category}
                </span>
              </div>
              
              {/* DETAIL AREA */}
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-black text-xs text-white line-clamp-1 truncate" title={menu.name}>{menu.name}</h3>
                <p className="text-blue-400 font-mono font-bold text-sm mt-1 mb-3">Rp {Number(menu.price).toLocaleString('id-ID')}</p>
                
                <div className="mt-auto flex gap-2">
                  <button onClick={() => editMenu(menu)} className="flex-1 bg-white/10 hover:bg-blue-600 hover:text-white py-1.5 rounded-lg flex justify-center items-center transition-all text-gray-400">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDeleteMenu(menu.id!)} className="flex-1 bg-white/10 hover:bg-red-600 hover:text-white py-1.5 rounded-lg flex justify-center items-center transition-all text-gray-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {menus.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500 text-sm">
              Belum ada menu di outlet ini.
            </div>
          )}
        </div>
      )}

      {/* --- MODAL FORM MENU --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-black text-white mb-6 tracking-tighter">{formData.id ? "EDIT_MENU" : "TAMBAH_MENU_BARU"}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* NAMA MENU */}
              <div>
                <label className="text-[10px] font-black text-gray-400 tracking-widest mb-1 block">NAMA PRODUK</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" placeholder="Contoh: Green Thailand Milk Tea" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* HARGA */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 tracking-widest mb-1 block">HARGA (RP)</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500 outline-none" placeholder="0" />
                </div>
                {/* KATEGORI */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 tracking-widest mb-1 block">KATEGORI</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none appearance-none">
                    <option value="" disabled className="bg-gray-900">Pilih...</option>
                    {categories.map(c => <option key={c.id} value={c.name} className="bg-gray-900">{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* UPLOAD FOTO */}
              <div>
                <label className="text-[10px] font-black text-gray-400 tracking-widest mb-1 block">FOTO MENU (OPSIONAL)</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-500 transition-all bg-white/5 relative">
                  <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}/>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-20 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <Upload size={24} className="mb-2" />
                      <span className="text-[10px] font-bold">Klik / Tarik gambar ke sini</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SUBMIT */}
              <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-black py-4 rounded-xl text-xs flex justify-center items-center gap-2 mt-4 transition-all">
                {loading ? <Loader2 className="animate-spin" size={16} /> : "SIMPAN MENU"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL KATEGORI --- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f172a] rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
            <h2 className="text-xl font-black text-white mb-6 tracking-tighter">KELOLA_KATEGORI</h2>
            
            <div className="flex gap-2 mb-6">
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Kategori baru..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
              <button onClick={handleAddCategory} className="bg-blue-600 px-4 rounded-xl font-black text-xs hover:bg-blue-500">TAMBAH</button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center bg-white/5 border border-white/5 p-3 rounded-xl">
                  <span className="text-xs font-bold">{c.name}</span>
                  <button onClick={() => deleteCategory(c.id)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-center text-xs text-gray-500 italic">Belum ada kategori.</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}