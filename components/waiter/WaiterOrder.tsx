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

// --- HELPER UNTUK IKON DINAMIS ---
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
    const { data } = await supabase.from("orders").select(`tables(name)`).eq("id", orderId).single();
    if (data) setTableName((data as any).tables?.name || "??");
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("name");
    if (data) {
      const available = data.filter(p => p.is_available !== false);
      setProducts(available);
      setCategories(["ALL", ...new Set(available.map((p: any) => p.category || "LAINNYA"))]);
    }
  };

  const fetchExistingOrder = async () => {
    const { data } = await supabase.from("order_items").select(`quantity, notes, menus(id, name, price, category)`).eq("order_id", orderId);
    if (data) {
      setCart(data.map((item: any) => ({
        product: item.menus, 
        quantity: Number(item.quantity) || 1,
        isLocked: true,
        source: item.notes === "QR_ORDER" ? 'customer' : 'waiter'
      })));
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

      executeKitchenPrint({
        tableName,
        cashierName: localStorage.getItem("username") || "WAITER",
        items: newItems.map(i => ({ name: i.product.name, qty: i.quantity, category: i.product.category, price: i.product.price }))
      });

      alert("🚀 PESANAN TERKIRIM KE DAPUR!");
      fetchExistingOrder(); 
    } catch (err: any) {
      alert("❌ ERROR: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = category === "ALL" ? products : products.filter(p => p.category === category);

  if (loadingData) return (
    <div className="fixed inset-0 bg-[#010413] flex flex-col items-center justify-center text-blue-500 gap-4 z-[9999]">
      <Loader2 className="animate-spin" size={32}/>
      <p className="text-[10px] font-black tracking-[0.5em] italic">INITIALIZING_WAITER_APP</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-[#010413] flex flex-col font-sans italic text-white uppercase overflow-hidden antialiased">
      {/* HEADER */}
      <header className="h-16 border-b border-white/[0.05] flex items-center justify-between px-6 bg-[#010413]/60 backdrop-blur-2xl z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-400 font-black text-[11px] tracking-tight hover:text-blue-300 transition-all">
          <ChevronLeft size={20} /> BACK_TO_MAP
        </button>
        <div className="flex items-center gap-5">
            {linkedHotelId && <Home size={16} className="text-emerald-500 animate-pulse"/>}
            <div className="text-right border-l border-white/10 pl-5">
              <p className="text-[14px] font-black text-white leading-none tracking-tighter">TABLE_{tableName}</p>
              <p className="text-[8px] text-gray-500 font-mono mt-1">SESSION::{orderId.substring(0,6)}</p>
            </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* CATEGORY NAV */}
        <nav className="w-[90px] border-r border-white/[0.03] flex flex-col py-5 gap-3 px-3 bg-white/[0.01] overflow-y-auto no-scrollbar">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`py-5 rounded-2xl text-[8px] font-black flex flex-col items-center gap-2.5 border transition-all duration-300 ${category === cat ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/30" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-white"}`}>
              {cat === 'ALL' ? <Grid size={18}/> : <CategoryIcon category={cat} size={18} />}
              <span className="truncate w-full text-center px-1 tracking-tighter leading-none">{cat}</span>
            </button>
          ))}
        </nav>

        {/* MAIN PRODUCT GRID */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar bg-black/20">
          {linkedHotelId && (
            <div className="mb-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Home size={20} /></div>
              <input 
                type="text" 
                placeholder="CHECK GUEST ROOM NUMBER..." 
                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-[11px] font-mono text-white outline-none focus:border-emerald-500/50 transition-all"
                value={hotelRoom}
                onChange={(e) => { setHotelRoom(e.target.value); setGuestName(""); }}
              />
              <button onClick={checkRoom} disabled={!hotelRoom || isCheckingRoom} className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[10px] font-black disabled:opacity-20 transition-all">
                {isCheckingRoom ? <Loader2 className="animate-spin" size={16}/> : "CHECK"}
              </button>
              {guestName && (
                <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                    <p className="text-[7px] font-black text-emerald-400">GUEST_FOUND</p>
                    <p className="text-[11px] font-black text-white truncate max-w-[100px]">{guestName}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pb-24">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-6 flex flex-col items-center justify-between gap-4 h-48 hover:border-blue-500/50 hover:bg-blue-500/[0.02] active:scale-95 transition-all group">
                <div className="p-4 bg-white/[0.03] rounded-full group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                    <CategoryIcon category={p.category} size={20} />
                </div>
                <span className="text-[10px] font-black text-center line-clamp-2 tracking-tight leading-tight text-white/80 group-hover:text-white">{p.name}</span>
                <span className="text-blue-500 text-[11px] font-black font-mono tracking-tighter">RP {Number(p.price).toLocaleString('id-ID')}</span>
              </button>
            ))}
          </div>
        </main>

        {/* CART ASIDE */}
        <aside className="w-[320px] bg-[#010413]/80 border-l border-white/[0.05] flex flex-col backdrop-blur-3xl">
          <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
             <h3 className="text-[11px] font-black text-gray-500 tracking-[0.2em] uppercase italic">Order_List</h3>
             <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">{cart.filter(i=>!i.isLocked).length} NEW</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className={`p-5 rounded-[2rem] border transition-all ${item.isLocked ? "bg-white/[0.01] border-transparent opacity-40" : "bg-blue-500/5 border-blue-500/20"}`}>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase tracking-tight text-white/90 leading-tight">{item.product?.name}</p>
                      <p className={`text-[7px] font-black mt-1.5 uppercase ${item.isLocked ? "text-emerald-500" : "text-blue-500 animate-pulse"}`}>
                        {item.isLocked ? "• READY_IN_KITCHEN" : "• PENDING_SUBMIT"}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-black text-white/40">{(item.quantity * (item.product?.price || 0)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                    <div className="flex items-center gap-3">
                        {!item.isLocked && <button onClick={() => removeFromCart(idx)} className="w-8 h-8 bg-white/5 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-all"><Minus size={16}/></button>}
                        <span className="text-sm font-black font-mono w-4 text-center">{item.quantity}</span>
                        {!item.isLocked && <button onClick={() => addToCart(item.product)} className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all"><Plus size={16}/></button>}
                    </div>
                    {item.isLocked && <Package size={14} className="text-emerald-500 opacity-50"/>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 bg-black/40 border-t border-white/10 space-y-6">
            <div className="flex justify-between items-center text-white uppercase italic">
               <span className="text-[10px] font-black text-gray-500 tracking-widest">SUBTOTAL:</span>
               <span className="text-2xl font-black font-mono text-blue-500">RP {cart.reduce((s, i) => s + (Number(i.product?.price || 0) * i.quantity), 0).toLocaleString('id-ID')}</span>
            </div>
            <button 
              onClick={handleSubmitOrder} 
              disabled={isSubmitting || cart.filter(i=>!i.isLocked).length === 0} 
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:opacity-30 py-5 rounded-[1.5rem] font-black text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-blue-600/30 text-white"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <><Send size={16}/> SUBMIT_ORDER</>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}