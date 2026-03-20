import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Plus, Minus, Send, ShoppingCart, Coffee, Utensils, Grid, Loader2, User, Package } from "lucide-react";

// 🔥 TAMBAHAN: Tipe data untuk menampung isi bundling
type BundleItem = { name: string; qty: number };
type Product = { id: number; name: string; price: number; category: string; is_available?: boolean; bundle_items?: BundleItem[] };
type CartItem = { 
  product: Product; 
  quantity: number; 
  isLocked: boolean; 
  source?: 'customer' | 'waiter';
  status?: string;
};
type Props = { orderId: string; onBack: () => void }; 

export default function WaiterOrder({ orderId, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableName, setTableName] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DISBA_OUTLET_001" : "DISBA_OUTLET_001";

  useEffect(() => {
    if (!orderId) return;

    const initializeData = async () => {
      setLoadingData(true);
      await fetchProducts();
      await fetchExistingOrder();
      await fetchOrderDetails();
      setLoadingData(false);
    };
    initializeData();

    const channel = supabase.channel(`sync-order-${orderId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, 
        () => fetchExistingOrder()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    const { data } = await supabase.from("orders").select(`tables(name)`).eq("id", orderId).single();
    if (data) setTableName((data as any).tables?.name || "??");
  };

  const fetchProducts = async () => {
    // 1. Ambil semua menu
    const { data: menuData } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("name");
    // 2. Ambil isi paket (bundling)
    const { data: pkgItems } = await supabase.from("package_items").select(`package_id, quantity, menus!package_items_menu_id_fkey(name)`).eq("tenant_id", tenantId);

    if (menuData) {
      const availableProducts = menuData.filter(p => p.is_available !== false);
      
      // 🔥 PENGGABUNGAN (ANTI-ERROR TYPE): Kita gunakan (i: any) agar TypeScript diam
      const productsWithBundles = availableProducts.map((p: any) => {
        if (p.category === "PAKET") {
          const items = pkgItems?.filter((i: any) => i.package_id === p.id).map((i: any) => {
            // Pelindung Ganda: Handle jika Supabase mengirim Objek ATAU Array
            const menuName = Array.isArray(i.menus) ? i.menus[0]?.name : i.menus?.name;
            
            return {
              qty: i.quantity || 1,
              name: menuName || "Menu"
            };
          }) || [];
          
          return { ...p, bundle_items: items };
        }
        return p;
      });

      setProducts(productsWithBundles);
      const uniqueCategories = ["ALL", ...new Set(availableProducts.map((p: any) => p.category || "LAINNYA"))];
      setCategories(uniqueCategories as string[]);
    }
  };

  const fetchExistingOrder = async () => {
    // 🔥 Ambil juga data paket saat me-load pesanan yang sudah ada
    const { data } = await supabase
      .from("order_items")
      .select(`quantity, notes, menus (id, name, price, category)`)
      .eq("order_id", orderId);

    if (data) {
      const existingItems = data.map((item: any) => ({
        product: item.menus, 
        quantity: item.quantity || 1,
        isLocked: true,
        source: item.notes === "QR_ORDER" ? 'customer' : 'waiter'
      }));
      setCart(prev => {
        const unsentItems = prev.filter(i => !i.isLocked);
        return [...existingItems, ...unsentItems];
      });
    }
  };

  const addToCart = (product: Product) => {
    if (!product) return; 
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product?.id === product.id && !item.isLocked);
      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += 1;
        return newCart;
      }
      return [...prev, { product, quantity: 1, isLocked: false, source: 'waiter' }];
    });
  };

  const removeFromCart = (index: number) => {
    if (cart[index].isLocked) return;
    setCart((prev) => {
      const newCart = [...prev];
      if (newCart[index].quantity > 1) {
        newCart[index].quantity -= 1;
        return newCart;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitOrder = async () => {
    const newItems = cart.filter(item => !item.isLocked && item.product != null);
    if (newItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderItemsData = newItems.map((item) => ({
        order_id: orderId, // Ini yang tadi error jika tipenya beda di DB!
        tenant_id: tenantId,
        menu_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price || 0,
        notes: "WAITER_ORDER"
      }));

      const { error } = await supabase.from("order_items").insert(orderItemsData);
      if (error) throw error;
      
      alert("Pesanan Berhasil Dikirim ke Dapur!");
      
      // Kunci item yang baru saja dikirim agar tidak bisa dihapus lagi oleh waiter
      setCart(prev => prev.map(item => ({ ...item, isLocked: true })));
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = category === "ALL" 
    ? products 
    : products.filter(p => (p.category || "LAINNYA") === category);
  
  const totalLocked = cart.filter(i => i.isLocked).reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
  const totalNew = cart.filter(i => !i.isLocked).reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col font-sans italic text-white overflow-hidden uppercase">
      {/* HEADER */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-500 font-black text-xs tracking-tighter active:scale-90 transition-all">
          <ChevronLeft size={20} /> FLOOR MAP
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-blue-500 leading-none tracking-[0.2em]">TABLE {tableName}</p>
          <p className="text-[7px] text-gray-500 font-mono mt-1">ID: {orderId.substring(0,8)}</p>
        </div>
      </header>

      {loadingData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-blue-500 gap-4">
           <Loader2 className="animate-spin" size={32} />
           <p className="text-[10px] font-black tracking-widest">MEMUAT MENU & BUNDLING...</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR KATEGORI */}
          <nav className="w-20 border-r border-white/5 flex flex-col py-3 gap-2 px-2 overflow-y-auto no-scrollbar bg-black/20">
            {categories.map((cat, index) => (
              <button
                key={index}
                onClick={() => setCategory(cat)}
                className={`py-4 rounded-2xl text-[8px] font-black transition-all flex flex-col items-center gap-2 border ${
                  category === cat ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20" : "bg-white/[0.03] border-white/5 text-gray-500"
                }`}
              >
                {cat === 'ALL' ? <Grid size={16}/> : cat === 'PAKET' ? <Package size={16}/> : <Coffee size={16}/>}
                <span className="truncate w-full text-center px-1">{cat}</span>
              </button>
            ))}
          </nav>

          {/* MAIN AREA MENU */}
          <main className="flex-1 p-3 overflow-y-auto no-scrollbar relative">
            {filteredProducts.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center p-8">
                 <Utensils size={48} className="mb-4" />
                 <p className="text-sm font-black tracking-widest">KATEGORI KOSONG</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-20">
                {filteredProducts.map((product) => (
                  <button
                    key={product?.id}
                    onClick={() => addToCart(product)}
                    className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-4 flex flex-col items-center justify-between hover:border-blue-500 transition-all active:scale-95 shadow-xl h-36 group relative overflow-hidden"
                  >
                    {/* Badge Paket */}
                    {product?.category === "PAKET" && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-[6px] px-2 py-0.5 rounded-bl-lg font-black tracking-widest">PROMO</div>
                    )}
                    
                    <div className="flex flex-col items-center w-full mt-2">
                      <span className="text-[9px] font-black text-center leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {product?.name || "TANPA NAMA"}
                      </span>
                      
                      {/* 🔥 TAMPILAN ISI BUNDLING (Hanya muncul kalau ada isinya) */}
                      {product?.bundle_items && product.bundle_items.length > 0 && (
                        <div className="mt-1.5 w-full flex flex-col items-center gap-0.5">
                          {product.bundle_items.map((b, i) => (
                            <span key={i} className="text-[6px] text-gray-400 font-bold tracking-widest leading-none bg-black/30 px-1.5 py-0.5 rounded border border-white/5 w-full text-center truncate">
                              {b.qty}X {b.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className="text-blue-500 text-[10px] font-black font-mono mt-auto pt-2">
                      Rp {Number(product?.price || 0).toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </main>

          {/* ASIDE ORDER LIST */}
          <aside className="w-72 bg-black/60 border-l border-white/5 flex flex-col backdrop-blur-2xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-[10px] font-black tracking-widest text-gray-500">BILL SEMENTARA</h3>
              <span className="bg-blue-600/20 text-blue-400 text-[8px] font-black px-2 py-1 rounded-full border border-blue-500/20">
                {cart.length} ITEMS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
              {cart.map((item, idx) => (
                <div key={idx} className={`p-3 rounded-3xl border transition-all ${
                  item.isLocked ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-blue-600/10 border-blue-500/30 shadow-lg"
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                          {item.source === 'customer' && <User size={10} className="text-orange-500" />}
                          <p className={`text-[9px] font-black truncate uppercase ${!item.product ? 'text-red-500' : ''}`}>
                            {item.product?.name || "❌ MENU TERHAPUS"}
                          </p>
                      </div>

                      {/* 🔥 TAMPILAN ISI BUNDLING DI KERANJANG */}
                      {item.product?.bundle_items && item.product.bundle_items.length > 0 && (
                        <div className="mb-1.5 border-l border-white/10 pl-2 ml-1">
                           {item.product.bundle_items.map((b, i) => (
                             <p key={i} className="text-[6px] text-gray-400 font-bold leading-tight">
                               + {b.qty}x {b.name}
                             </p>
                           ))}
                        </div>
                      )}

                      <p className={`text-[7px] font-black ${item.isLocked ? "text-gray-600" : "text-blue-500"}`}>
                        {item.isLocked ? "SUDAH DI DAPUR" : "BELUM DIKIRIM"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!item.isLocked && (
                        <button onClick={() => removeFromCart(idx)} className="w-7 h-7 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center"><Minus size={14}/></button>
                      )}
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      {!item.isLocked && item.product && (
                        <button onClick={() => addToCart(item.product)} className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center"><Plus size={14}/></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 bg-black/40 border-t border-white/10 space-y-4">
              <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-black text-gray-600">
                      <span>EXISTING ORDER</span>
                      <span>RP {totalLocked.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[8px] font-black text-blue-500">
                      <span>ORDER BARU</span>
                      <span>+ RP {totalNew.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-base font-black italic text-white border-t border-white/5 pt-2">
                      <span>TOTAL</span>
                      <span className="text-blue-500">RP {(totalLocked + totalNew).toLocaleString('id-ID')}</span>
                  </div>
              </div>
              
              <button 
                onClick={handleSubmitOrder}
                disabled={cart.filter(i => !i.isLocked).length === 0 || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-black py-4 rounded-2xl text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : "KIRIM KE DAPUR"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}