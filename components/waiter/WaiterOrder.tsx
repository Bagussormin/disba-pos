import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Plus, Minus, Send, ShoppingCart, Coffee, Utensils, Grid, Loader2, User } from "lucide-react";

type Product = { id: number; name: string; price: number; category: string };
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

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DISBA_OUTLET_001" : "DISBA_OUTLET_001";

  useEffect(() => {
    if (!orderId) return;

    const initializeData = async () => {
      await fetchProducts();
      await fetchExistingOrder();
      await fetchOrderDetails();
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
    const { data } = await supabase
      .from("orders")
      .select(`tables(name)`)
      .eq("id", orderId)
      .single();
    if (data) setTableName((data as any).tables?.name || "??");
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("menus") 
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_available", true)
      .order("name");

    if (data) {
      setProducts(data);
      // 🔥 ANTI-CRASH: Jika ada menu yang tidak punya kategori, jangan biarkan null!
      const uniqueCategories = ["ALL", ...new Set(data.map((p: any) => p.category || "LAINNYA"))];
      setCategories(uniqueCategories as string[]);
    }
  };

  const fetchExistingOrder = async () => {
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
        order_id: orderId,
        tenant_id: tenantId,
        menu_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price || 0,
        notes: "WAITER_ORDER"
      }));

      const { error } = await supabase.from("order_items").insert(orderItemsData);
      if (error) throw error;
      
      alert("Order Berhasil Ditambahkan!");
      await fetchExistingOrder();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 ANTI-CRASH: Amankan filter kategori
  const filteredProducts = category === "ALL" 
    ? products 
    : products.filter(p => (p.category || "LAINNYA") === category);
  
  // 🔥 ANTI-CRASH: Amankan kalkulasi harga dari ancaman null
  const totalLocked = cart.filter(i => i.isLocked).reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);
  const totalNew = cart.filter(i => !i.isLocked).reduce((sum, item) => sum + ((item.product?.price || 0) * item.quantity), 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col font-sans italic text-white overflow-hidden uppercase">
      {/* HEADER */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-500 font-black text-xs tracking-tighter active:scale-90 transition-all">
          <ChevronLeft size={20} /> FLOOR_MAP
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-blue-500 leading-none tracking-[0.2em]">TABLE_{tableName}</p>
          <p className="text-[7px] text-gray-500 font-mono mt-1">ID: {orderId.substring(0,8)}</p>
        </div>
      </header>

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
              {cat === 'ALL' ? <Grid size={16}/> : <Coffee size={16}/>}
              <span className="truncate w-full text-center px-1">{cat}</span>
            </button>
          ))}
        </nav>

        {/* MAIN AREA MENU */}
        <main className="flex-1 p-3 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-20">
            {filteredProducts.map((product) => (
              <button
                key={product?.id}
                onClick={() => addToCart(product)}
                className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-500 transition-all active:scale-95 shadow-xl h-28"
              >
                <span className="text-[9px] font-black text-center leading-tight line-clamp-2">
                  {product?.name || "TANPA NAMA"}
                </span>
                <span className="text-blue-500 text-[10px] font-black font-mono">
                  {/* 🔥 ANTI-CRASH: Paksa jadi angka 0 jika null, baru di-localeString */}
                  {Number(product?.price || 0).toLocaleString('id-ID')}
                </span>
              </button>
            ))}
          </div>
        </main>

        {/* ASIDE ORDER LIST */}
        <aside className="w-72 bg-black/60 border-l border-white/5 flex flex-col backdrop-blur-2xl">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-[10px] font-black tracking-widest text-gray-500">CURRENT_BILL</h3>
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
                        {/* 🔥 ANTI-CRASH: Deteksi Menu Terhapus */}
                        <p className={`text-[9px] font-black truncate uppercase ${!item.product ? 'text-red-500' : ''}`}>
                          {item.product?.name || "❌ MENU TERHAPUS"}
                        </p>
                    </div>
                    <p className={`text-[7px] font-black ${item.isLocked ? "text-gray-600" : "text-blue-500"}`}>
                      {item.isLocked ? "PRINTED / ON PROCESS" : "WAITING TO SEND"}
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
                    <span>SUBTOTAL_EXISTING</span>
                    <span>RP {totalLocked.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[8px] font-black text-blue-500">
                    <span>NEW_ADDITIONS</span>
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
              {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : "SEND_TO_KITCHEN"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}