import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  ChevronLeft, Plus, Minus, Send, ShoppingCart, 
  Coffee, Utensils, Grid, Loader2, User, Package 
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

export default function WaiterOrder({ orderId, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableName, setTableName] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // 🔥 Sync dengan Tenant ID
  const tenantId = typeof window !== "undefined" ? (localStorage.getItem("tenant_id") || "NES_HOUSE_001") : "NES_HOUSE_001";

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
  }, [orderId]);

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
      // 🔥 PEMBERSIHAN DATA (CLEANING PAYLOAD)
      const orderItemsData = newItems.map((item) => ({
        order_id: orderId, // Pastikan ini UUID yang valid
        tenant_id: tenantId,
        menu_id: Number(item.product.id), // Paksa jadi Number
        quantity: Number(item.quantity), // Paksa jadi Number
        price_at_time: Number(item.product.price) || 0, // Paksa jadi Number
        notes: "WAITER_ORDER"
      }));

      // 🔥 INSERT KE DATABASE
      const { error } = await supabase.from("order_items").insert(orderItemsData);
      
      if (error) {
        console.error("Supabase Error Detail:", error);
        throw error;
      }

      // 🖨️ PRINTER DAPUR
      executeKitchenPrint({
        tableName,
        cashierName: localStorage.getItem("username") || "WAITER",
        items: newItems.map(i => ({ name: i.product.name, qty: i.quantity, category: i.product.category, price: i.product.price }))
      });

      alert("🚀 PESANAN BERHASIL TERKIRIM!");
      fetchExistingOrder(); 
    } catch (err: any) {
      alert("❌ GAGAL: " + (err.details || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = category === "ALL" ? products : products.filter(p => p.category === category);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col font-sans italic text-white uppercase overflow-hidden">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl">
        <button onClick={onBack} className="flex items-center gap-2 text-blue-500 font-black text-[10px] tracking-tighter">
          <ChevronLeft size={18} /> BACK_TO_MAP
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-blue-500 tracking-widest italic uppercase">Table {tableName}</p>
          <p className="text-[7px] text-gray-500 font-mono italic">ORD_ID: {orderId.substring(0,8)}</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-20 border-r border-white/5 flex flex-col py-3 gap-2 px-2 bg-black/20 overflow-y-auto no-scrollbar">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`py-4 rounded-2xl text-[7px] font-black flex flex-col items-center gap-2 border transition-all ${category === cat ? "bg-blue-600 border-blue-400" : "bg-white/5 border-transparent text-gray-500"}`}>
              {cat === 'ALL' ? <Grid size={16}/> : <Coffee size={16}/>}
              <span className="truncate w-full text-center px-1">{cat}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 p-3 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-20">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-4 flex flex-col items-center justify-between h-36 hover:border-blue-500 active:scale-95 transition-all shadow-xl">
                <span className="text-[9px] font-black text-center line-clamp-2 italic leading-tight">{p.name}</span>
                <span className="text-blue-500 text-[10px] font-black font-mono">RP {Number(p.price).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </main>

        <aside className="w-72 bg-black/60 border-l border-white/5 flex flex-col backdrop-blur-2xl">
          <div className="p-4 border-b border-white/5">
             <h3 className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Bill_Summary</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-[1.5rem] border ${item.isLocked ? "bg-white/5 border-transparent opacity-50" : "bg-blue-600/10 border-blue-500/30 shadow-lg"}`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-[9px] font-black uppercase tracking-tighter italic">{item.product?.name}</p>
                    <p className="text-[7px] text-blue-500 font-black mt-1 uppercase italic">{item.isLocked ? "SENT_TO_KITCHEN" : "PENDING_ORDER"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!item.isLocked && <button onClick={() => removeFromCart(idx)} className="w-7 h-7 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center"><Minus size={14}/></button>}
                    <span className="text-xs font-black">{item.quantity}</span>
                    {!item.isLocked && <button onClick={() => addToCart(item.product)} className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center"><Plus size={14}/></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-black/40 border-t border-white/10 space-y-4">
            <div className="flex justify-between text-base font-black italic text-white uppercase tracking-tighter pt-2 border-t border-white/5">
               <span>Total_Bill</span>
               <span className="text-blue-500 text-xl font-mono">RP {cart.reduce((s, i) => s + (Number(i.product?.price || 0) * i.quantity), 0).toLocaleString()}</span>
            </div>
            <button onClick={handleSubmitOrder} disabled={isSubmitting || cart.filter(i=>!i.isLocked).length === 0} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-blue-600/20">
              {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <><Send size={14}/> SEND_ORDER_NOW</>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}