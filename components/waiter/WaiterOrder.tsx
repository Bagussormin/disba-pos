import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  ChevronLeft, Plus, Minus, Send, ShoppingCart, 
  Coffee, Utensils, Grid, Loader2, User, Package, Home, Search, Martini, Wine
} from "lucide-react";
import { executeKitchenPrint } from "../../lib/printer"; 

type Product = { id: number; name: string; price: number; category: string; is_available?: boolean };
type CartItem = { 
  product: Product; 
  quantity: number; 
  isLocked: boolean; 
  source?: 'customer' | 'waiter';
};
type Props = { orderId: string; onBack: () => void }; 

const CategoryIcon = ({ category, size = 16, className = "" }: { category: string, size?: number, className?: string }) => {
  const c = (category || "").toUpperCase();
  let IconComponent = Coffee; // Default

  if (c.includes("DRINK") || c.includes("MINUMAN")) IconComponent = Martini;
  else if (c.includes("FOOD") || c.includes("MAKANAN")) IconComponent = Utensils;
  else if (c.includes("BOTOL") || c.includes("WINE") || c.includes("ALCOHOL")) IconComponent = Wine;
  else if (c.includes("SNACK")) IconComponent = Utensils;

  return <IconComponent size={size} className={className} />;
};

export default function WaiterOrder({ orderId, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableName, setTableName] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // --- SAAS SYNC STATE ---
  const [linkedHotelId, setLinkedHotelId] = useState<string | null>(null);
  const [hotelRoom, setHotelRoom] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isCheckingRoom, setIsCheckingRoom] = useState(false);

  const tenantId = typeof window !== "undefined" ? (localStorage.getItem("tenant_id") || "DEMO_001") : "DEMO_001";

  useEffect(() => {
    if (!orderId) return;
    const initializeData = async () => {
      setLoadingData(true);
      await fetchTenantInfo(); 
      await fetchProducts();
      await fetchExistingOrder();
      await fetchOrderDetails();
      setLoadingData(false);
    };
    initializeData();
  }, [orderId]);

  const fetchTenantInfo = async () => {
    const { data } = await supabase.from("tenants").select("linked_hotel_id").eq("tenant_id", tenantId).maybeSingle();
    if (data) setLinkedHotelId(data.linked_hotel_id);
  };

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase.from("orders").select(`tables(name)`).eq("id", orderId).single();
      if (error) throw error;
      if (data) setTableName((data as any).tables?.name || "??");
    } catch (e) {
      console.warn("fetchOrderDetails failed, reading from cache");
      const cachedOrders = JSON.parse(localStorage.getItem("disba_cache_orders") || "[]");
      const currentOrder = cachedOrders.find((o: any) => o.id === orderId);
      if (currentOrder) {
        const cachedTables = JSON.parse(localStorage.getItem("disba_cache_tables") || "[]");
        const tbl = cachedTables.find((t: any) => t.id === currentOrder.table_id);
        setTableName(tbl ? tbl.name : "Meja Offline");
      } else {
        setTableName("Meja 1");
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      if (data) {
        const available = data.filter(p => p.is_available !== false);
        setProducts(available);
        setCategories(["ALL", ...new Set(available.map((p: any) => p.category || "LAINNYA"))]);
        localStorage.setItem("disba_cache_menus", JSON.stringify(available));
      }
    } catch (err) {
      console.warn("Supabase fetch products failed, loading from local cache:", err);
      const cached = JSON.parse(localStorage.getItem("disba_cache_menus") || "[]");
      if (cached.length === 0) {
        const mockMenus = [
          { id: 101, name: "Nasi Goreng Spesial", price: 25000, category: "Makanan", is_available: true },
          { id: 102, name: "Mie Goreng Jawa", price: 22000, category: "Makanan", is_available: true },
          { id: 103, name: "Ayam Goreng Mentega", price: 35000, category: "Makanan", is_available: true },
          { id: 104, name: "Es Teh Manis", price: 6000, category: "Minuman", is_available: true },
          { id: 105, name: "Kopi Susu Gula Aren", price: 18000, category: "Minuman", is_available: true },
          { id: 106, name: "Es Jeruk", price: 10000, category: "Minuman", is_available: true }
        ];
        setProducts(mockMenus);
        setCategories(["ALL", "Makanan", "Minuman"]);
        localStorage.setItem("disba_cache_menus", JSON.stringify(mockMenus));
      } else {
        setProducts(cached);
        setCategories(["ALL", ...(Array.from(new Set(cached.map((p: any) => p.category || "LAINNYA"))) as string[])]);
      }
    }
  };

  const fetchExistingOrder = async () => {
    try {
      const { data, error } = await supabase.from("order_items").select(`quantity, notes, menus(id, name, price, category)`).eq("order_id", orderId);
      if (error) throw error;
      if (data) {
        setCart(data.map((item: any) => ({
          product: item.menus, 
          quantity: Number(item.quantity) || 1,
          isLocked: true,
          source: item.notes === "QR_ORDER" ? 'customer' : 'waiter'
        })));
      }
    } catch (e) {
      console.warn("fetchExistingOrder failed, loading from local cache.");
      const cached = JSON.parse(localStorage.getItem(`disba_cache_order_items_${orderId}`) || "[]");
      setCart(cached);
    }
  };

  const checkRoom = async () => {
    if (!hotelRoom || !linkedHotelId) return;
    setIsCheckingRoom(true);
    const { data } = await supabase
      .from("hotel_rooms")
      .select("current_guest_name")
      .eq("tenant_id", linkedHotelId)
      .eq("room_number", hotelRoom)
      .eq("status", "OCCUPIED")
      .maybeSingle();

    if (data) {
      setGuestName(data.current_guest_name);
    } else {
      alert("KAMAR TIDAK DITEMUKAN / TIDAK ADA TAMU");
      setGuestName("");
    }
    setIsCheckingRoom(false);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product?.id === product.id && !i.isLocked);
      if (idx > -1) {
        const newCart = [...prev];
        newCart[idx] = { ...newCart[idx], quantity: newCart[idx].quantity + 1 };
        return newCart;
      }
      return [...prev, { product, quantity: 1, isLocked: false, source: 'waiter' }];
    });
  };

  const removeFromCart = (index: number) => {
    if (cart[index].isLocked) return;
    setCart(prev => {
      const newCart = [...prev];
      if (newCart[index].quantity > 1) {
        newCart[index] = { ...newCart[index], quantity: newCart[index].quantity - 1 };
        return newCart;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitOrder = async () => {
    const newItems = cart.filter(item => !item.isLocked && item.product);
    if (newItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderItemsData = newItems.map((item) => ({
        order_id: orderId,
        tenant_id: tenantId,
        menu_id: Number(item.product.id),
        quantity: Number(item.quantity),
        price_at_time: Number(item.product.price) || 0,
        notes: "WAITER_ORDER"
      }));

      const { error } = await supabase.from("order_items").insert(orderItemsData);
      if (error) throw error;

      try {
        executeKitchenPrint({
          tableName,
          cashierName: localStorage.getItem("username") || "WAITER",
          items: newItems.map(i => ({ name: i.product.name, qty: i.quantity, category: i.product.category, price: i.product.price }))
        });
      } catch (printErr) {
        console.warn("Print failed:", printErr);
      }

      alert("🚀 PESANAN TERKIRIM KE DAPUR!");
      fetchExistingOrder(); 
    } catch (err: any) {
      console.warn("Gagal kirim order ke Supabase, menyimpan secara offline:", err);
      
      const updatedCart = cart.map(item => ({ ...item, isLocked: true }));
      setCart(updatedCart);
      localStorage.setItem(`disba_cache_order_items_${orderId}`, JSON.stringify(updatedCart));

      // Synchronize with active orders list for cashier app
      const cashierOrders = JSON.parse(localStorage.getItem("disba_cache_orders") || "[]");
      if (!cashierOrders.some((o: any) => o.id === orderId)) {
        cashierOrders.push({
          id: orderId,
          table_id: 1,
          status: "open",
          waiter_name: "WAITER OFFLINE",
          tenant_id: tenantId
        });
        localStorage.setItem("disba_cache_orders", JSON.stringify(cashierOrders));
      }

      alert("⚠️ POS OFFLINE: Pesanan disimpan secara lokal di tablet!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = category === "ALL" ? products : products.filter(p => p.category === category);

  if (loadingData) return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center text-blue-500 gap-4 z-[9999]">
      <Loader2 className="animate-spin" size={32}/>
      <p className="text-[10px] font-bold tracking-widest uppercase">Memuat Menu Waiter...</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col font-sans text-slate-100 overflow-hidden antialiased">
      {/* HEADER */}
      <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-6 bg-slate-900/40 backdrop-blur-2xl z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-400 font-bold text-xs hover:text-blue-300 transition-colors">
          <ChevronLeft size={18} /> KEMBALI
        </button>
        <div className="flex items-center gap-4">
            {linkedHotelId && <Home size={16} className="text-emerald-500 animate-pulse"/>}
            <div className="text-right border-l border-slate-800 pl-4">
              <p className="text-sm font-extrabold text-white leading-none tracking-tight">MEJA: {tableName}</p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">SESI ID: {orderId.substring(0,8).toUpperCase()}</p>
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* CATEGORY NAV */}
        <nav className="w-[100px] border-r border-slate-800/60 flex flex-col py-4 gap-3 px-3 bg-slate-950/20 overflow-y-auto no-scrollbar">
          {categories.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)} 
              className={`py-4 rounded-2xl text-[10px] font-black flex flex-col items-center gap-2 border transition-all duration-200 ${category === cat ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900/40 border-transparent text-slate-400 hover:text-white"}`}
            >
              {cat === 'ALL' ? <Grid size={16}/> : <CategoryIcon category={cat} size={16} />}
              <span className="truncate w-full text-center px-1 text-[8px] uppercase tracking-wider">{cat}</span>
            </button>
          ))}
        </nav>

        {/* MAIN PRODUCT GRID */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar bg-slate-950/20">
          {linkedHotelId && (
            <div className="mb-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Home size={18} /></div>
              <input 
                type="text" 
                placeholder="CHECK GUEST ROOM NUMBER..." 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 transition-colors"
                value={hotelRoom}
                onChange={(e) => { setHotelRoom(e.target.value); setGuestName(""); }}
              />
              <button onClick={checkRoom} disabled={!hotelRoom || isCheckingRoom} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold disabled:opacity-20 transition-colors">
                {isCheckingRoom ? <Loader2 className="animate-spin" size={14}/> : "CHECK"}
              </button>
              {guestName && (
                <div className="px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
                    <p className="text-[7px] font-bold text-emerald-400">TAMU DITEMUKAN</p>
                    <p className="text-xs font-bold text-white truncate max-w-[120px]">{guestName}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {filtered.map((p) => (
              <button 
                key={p.id} 
                onClick={() => addToCart(p)} 
                className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col items-center justify-between gap-3 h-44 hover:border-blue-500/50 hover:bg-blue-600/[0.03] active:scale-[0.98] transition-all group"
              >
                <div className="p-3 bg-slate-950 rounded-2xl text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                    <CategoryIcon category={p.category} size={18} />
                </div>
                <span className="text-[11px] font-bold text-center line-clamp-2 text-slate-300 group-hover:text-white transition-colors">{p.name}</span>
                <span className="text-blue-400 text-xs font-bold font-mono">Rp {Number(p.price).toLocaleString('id-ID')}</span>
              </button>
            ))}
          </div>
        </main>

        {/* CART ASIDE */}
        <aside className="w-[320px] bg-slate-900/40 border-l border-slate-800/80 flex flex-col backdrop-blur-2xl">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
             <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Daftar Order</h3>
             <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{cart.filter(i=>!i.isLocked).length} BARU</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-slate-950/20">
            {cart.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-2xl border transition-all ${item.isLocked ? "bg-slate-900/10 border-transparent opacity-40" : "bg-blue-600/5 border-blue-500/20"}`}>
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-200 leading-tight">{item.product?.name}</p>
                      <p className={`text-[8px] font-bold mt-1 uppercase ${item.isLocked ? "text-emerald-500" : "text-blue-400 animate-pulse"}`}>
                        {item.isLocked ? "• Siap Kirim" : "• Belum Dikirim"}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-300">{(item.quantity * (item.product?.price || 0)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5">
                    <div className="flex items-center gap-2">
                        {!item.isLocked && <button onClick={() => removeFromCart(idx)} className="w-8 h-8 bg-slate-900 border border-slate-800 text-red-400 hover:bg-red-500/15 rounded-xl flex items-center justify-center transition-colors"><Minus size={14}/></button>}
                        <span className="text-xs font-bold font-mono w-4 text-center">{item.quantity}</span>
                        {!item.isLocked && <button onClick={() => addToCart(item.product)} className="w-8 h-8 bg-blue-600 text-white hover:bg-blue-500 rounded-xl flex items-center justify-center shadow-md transition-colors"><Plus size={14}/></button>}
                    </div>
                    {item.isLocked && <Package size={14} className="text-emerald-500 opacity-50"/>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-900/40 border-t border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center text-white">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal:</span>
               <span className="text-xl font-extrabold font-mono text-blue-400">Rp {cart.reduce((s, i) => s + (Number(i.product?.price || 0) * i.quantity), 0).toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={handleSubmitOrder} 
              disabled={isSubmitting || cart.filter(i=>!i.isLocked).length === 0} 
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:opacity-40 py-4.5 rounded-[1.4rem] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/10 text-white"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Send size={14}/> SUBMIT ORDER</>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}