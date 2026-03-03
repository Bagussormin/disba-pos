import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, Edit2, Image as ImageIcon, X, Loader2, Upload, Tag } from "lucide-react";

// 1. TAMBAHKAN INTERFACE INI AGAR TYPESCRIPT TIDAK ERROR
interface MenuItem {
  id: number | null;
  name: string;
  price: number | string;
  category: string;
  image_url: string;
  tenant_id?: string; // Tanda tanya berarti opsional
}

interface Category {
  id: number;
  name: string;
  tenant_id?: string;
}

export default function MenuMaster() {
  // 2. GUNAKAN INTERFACE PADA STATE
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Ambil Tenant ID dari LocalStorage
  const tenantId = localStorage.getItem("tenant_id") || "GLOBAL";

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
    fetchMenus();
    fetchCategories();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId) // Pastikan kolom ini ada di Supabase
      .order("category", { ascending: true });
    
    if (data) setMenus(data);
    if (error) console.error("Error fetching menus:", error);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (data) {
      setCategories(data);
      if (data.length > 0 && !formData.id) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    const { error } = await supabase
      .from("categories")
      .insert([{ 
        name: newCatName.toUpperCase(), 
        tenant_id: tenantId 
      }]);
      
    if (!error) {
      setNewCatName("");
      fetchCategories();
    }
  };

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('menu-items').upload(fileName, file);
    if (error) return null;
    const { data } = supabase.storage.from('menu-items').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      tenant_id: tenantId 
    };

    if (formData.id) {
      await supabase.from("menus").update(payload).eq("id", formData.id).eq("tenant_id", tenantId);
    } else {
      await supabase.from("menus").insert([payload]);
    }

    closeModal();
    fetchMenus();
    setLoading(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ id: null, name: "", price: "", category: categories[0]?.name || "", image_url: "" });
    setImageFile(null);
    setPreviewUrl(null);
  };

  const deleteCategory = async (id: number) => {
    if (confirm("Hapus kategori ini?")) {
      await supabase.from("categories").delete().eq("id", id).eq("tenant_id", tenantId);
      fetchCategories();
    }
  };

  const handleDeleteMenu = async (id: number) => {
    if (confirm("Hapus menu ini?")) {
      await supabase.from("menus").delete().eq("id", id).eq("tenant_id", tenantId);
      fetchMenus();
    }
  };

  // --- LANJUT KE BAGIAN RETURN JSX (TAMPILAN) ---
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 text-white">
        {/* Sisa kode tampilan kamu yang sudah rapi */}
        {/* ... Paste kembali bagian return dari MenuMaster lama kamu ... */}
    </div>
  );
}