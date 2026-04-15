import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, ShoppingBag, Search } from "lucide-react";

export default function CustomerMenu({ tableId: propsTableId }: { tableId?: string }) {
  const searchParams = new URLSearchParams(window.location.search);
  
  // 🛡️ SAAS ENGINE: Identitas murni dari URL
  const tenantId = searchParams.get("tenant"); 
  const urlTableId = searchParams.get("table");
  const activeTableId = propsTableId || urlTableId;

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [tableName, setTableName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  // =========================================================================
  // 🛰️ SYNC ENGINE (Multi-Tenant Aware)
  // =========================================================================
  const syncOrder = async () => {
    if (!activeTableId || !tenantId) return;

    try {
      const trackedOrderId = activeOrderId || localStorage.getItem(`disba_order_${tenantId}_${activeTableId}`);

      if (trackedOrderId) {
        const { data: trackedOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', trackedOrderId)
          .eq('tenant_id', tenantId)
          .single();
        
        if (trackedOrder && trackedOrder.status === 'completed') {
          setPaymentCompleted(true);
          localStorage.removeItem(`disba_order_${tenantId}_${activeTableId}`);
          return; 
        }
      }

      // Cari order aktif milik tenant ini di meja ini
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, status')
        .eq('table_id', Number(activeTableId))
        .eq('tenant_id', tenantId)
        .eq('status', 'open')
        .order('id', { ascending: false }) 
        .limit(1);

      const currentOrder = ordersData?.[0]; 

      if (currentOrder) {
        setActiveOrderId(currentOrder.id.toString());
        localStorage.setItem(`disba_order_${tenantId}_${activeTableId}`, currentOrder.id.toString());
        
        const { data: items } = await supabase
          .from('order_items')
          .select('*, menus(name)')
          .eq('order_id', currentOrder.id);

        if (items) {
          setOrderedItems(items.map(i => ({
            name: i.menus?.name || 'Menu',
            quantity: i.quantity,
            price_at_time: i.price_at_time
          })));
        }
      } else {
        setActiveOrderId(null);
        setOrderedItems([]);
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
    }
  };

  useEffect(() => {
    if (!activeTableId || !tenantId) {
      setIsError(true);
      return;
    }

    // Ambil Data Meja spesifik tenant
    supabase.from("tables").select("name").eq("id", Number(activeTableId)).eq("tenant_id", tenantId).single()
      .then(({data}) => { if (data) setTableName(data.name); else setIsError(true); });

    // Ambil Menu spesifik tenant
    supabase.from("menus").select("*").eq("tenant_id", tenantId).eq("is_available", true).order("category", { ascending: true })
      .then(({data}) => { if (data) setMenuItems(data); });

    syncOrder();
    const interval = setInterval(syncOrder, 4000); 
    return () => clearInterval(interval);
  }, [activeTableId, tenantId]);

  const calculateTotalOrdered = () => orderedItems.reduce((acc, curr) => acc + (curr.quantity * curr.price_at_time), 0);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
  };

  const submitOrder = async () => {
    if (cart.length === 0 || loading || !activeTableId || !tenantId) return;
    setLoading(true);

    try {
      const numericTableId = Number(activeTableId);
      let orderIdToUse = activeOrderId;

      // 🛡️ Logic pembuatan order yang aman untuk SaaS
      if (!orderIdToUse) {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({ 
            table_id: numericTableId, 
            tenant_id: tenantId, 
            status: "open", 
            total_price: cart.reduce((a, b) => a + (b.qty * b.price), 0) 
          })
          .select()
          .single();

        if (orderError) throw orderError;
        
        if (newOrder) {
          orderIdToUse = newOrder.id.toString();
          setActiveOrderId(orderIdToUse);
          localStorage.setItem(`disba_order_${tenantId}_${activeTableId}`, orderIdToUse!);
        } else {
          throw new Error("Gagal menginisialisasi pesanan.");
        }
      }

      // Map item keranjang ke orderIdToUse yang sudah valid
      const orderItemsData = cart.map((item) => ({
        order_id: orderIdToUse, 
        menu_id: item.id, 
        tenant_id: tenantId, 
        quantity: item.qty, 
        price_at_time: item.price, 
        notes: ""
      }));
      
      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsData);
      if (itemsError) throw itemsError;

      await supabase.from("tables").update({ status: "occupied" }).eq("id", numericTableId).eq("tenant_id", tenantId);

      setIsSuccess(true);
      setCart([]); 
      await syncOrder(); 
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (e: any) { 
      alert("Gagal mengirim pesanan: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center uppercase italic">
        <div className="max-w-xs border border-red-500/20 p-10 rounded-[3rem] bg-red-500/5">
          <h2 className="text-2xl font-black text-red-500 mb-2 tracking-tighter">INVALID_SCAN</h2>
          <p className="text-gray-500 text-[9px] font-black tracking-widest leading-loose uppercase">QR_CODE_TIDAK_DIKENALI_OLEH_SISTEM_DISBA</p>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
        <div className="max-w-xs w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tighter">SUCCESS_STORY</h2>
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-loose mb-10 italic">
            TRANSAKSI_SELESAI_TERIMAKASIH_ATAS_KUNJUNGAN_ANDA
          </p>
          <div className="bg-white/5 border border-white/10 px-6 py-5 rounded-2xl w-full border-dashed">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-relaxed italic">SESSION_CLOSED</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans uppercase italic relative pb-40 no-scrollbar overflow-x-hidden">
      
      <header className="mb-10 pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-blue-500 leading-none">DISBA_MENU</h1>
          <p className="text-[9px] font-black text-gray-500 tracking-[0.4em] mt-2 italic uppercase">TABLE: {tableName || "IDENTIFYING..."}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
           <Search size={16} />
        </div>
      </header>

      {isSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-[9px] font-black text-emerald-500 tracking-[0.2em] italic">ORDER_SENT_SUCCESSFULLY</p>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar sticky top-0 bg-[#020617]/95 backdrop-blur-md z-40 py-2">
        <button onClick={() => setSelectedCategory("SEMUA")} className={`px-6 py-3 rounded-2xl text-[9px] font-black border transition-all ${selectedCategory === "SEMUA" ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/5 border-white/10 text-gray-500"}`}>SEMUA</button>
        {Array.from(new Set(menuItems.map((i) => i.category))).map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-3 rounded-2xl text-[9px] font-black border whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white/5 border-white/10 text-gray-500"}`}>{cat}</button>
        ))}
      </div>

      <div className="grid gap-5">
        {menuItems.filter((item) => selectedCategory === "SEMUA" || item.category === selectedCategory).map((item) => {
          const itemInCart = cart.find((c) => c.id === item.id);
          return (
            <div key={item.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-[2.5rem] flex gap-5 items-center group active:scale-95 transition-all">
              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-black flex-shrink-0 border border-white/5 shadow-2xl">
                {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon size={30}/></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-xs truncate tracking-tighter mb-1 text-white">{item.name}</h3>
                <p className="text-blue-500 text-sm font-black font-mono">RP {Number(item.price).toLocaleString('id-ID')}</p>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                {itemInCart ? (
                  <div className="flex flex-col items-center bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 flex items-center justify-center text-gray-500"><Minus size={16}/></button>
                    <span className="text-xs font-black font-mono py-1">{itemInCart.qty}</span>
                    <button onClick={() => addToCart(item)} className="w-10 h-10 flex items-center justify-center text-blue-500"><Plus size={16}/></button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(item)} className="bg-white text-black w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-xl active:bg-blue-600 active:text-white transition-all">
                    <Plus size={24} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {orderedItems.length > 0 && (
        <div className="mt-16 p-8 border border-white/10 border-dashed rounded-[3rem] bg-white/[0.01]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-black text-blue-500 tracking-[0.2em] italic uppercase">ACTIVE_ORDER_</h3>
            <span className="text-[8px] text-gray-600 font-black tracking-widest uppercase italic">ID: {activeOrderId?.substring(0,6)}</span>
          </div>

          <div className="space-y-6">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex gap-4">
                  <span className="text-[10px] font-black text-blue-500">{item.quantity}X</span>
                  <span className="text-[10px] font-black text-white/70 uppercase">{item.name}</span>
                </div>
                <span className="text-[10px] font-black font-mono text-white">{(item.quantity * item.price_at_time).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>

          <div className="pt-8 mt-8 border-t border-white/5 flex justify-between items-baseline text-white">
            <span className="text-[9px] text-gray-500 font-black italic">BILL_TOTAL</span>
            <span className="text-3xl font-black italic tracking-tighter font-mono">RP {calculateTotalOrdered().toLocaleString('id-ID')}</span>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-8 px-6 z-[100] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-blue-600 rounded-[2.5rem] p-5 flex justify-between items-center shadow-2xl shadow-blue-600/40">
            <div className="ml-4">
              <p className="text-[8px] font-black text-white/60 tracking-[0.2em] mb-1 italic uppercase">{cart.reduce((a, b) => a + b.qty, 0)} ITEMS_IN_CART</p>
              <p className="font-black text-2xl tracking-tighter text-white font-mono leading-none">RP {cart.reduce((a, b) => a + b.qty * b.price, 0).toLocaleString('id-ID')}</p>
            </div>
            <button onClick={submitOrder} disabled={loading} className="bg-white text-blue-600 px-10 py-5 rounded-3xl font-black text-[10px] flex items-center gap-3 active:scale-95 transition-all shadow-xl">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><ShoppingBag size={18}/> ORDER_NOW</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}