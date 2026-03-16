import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, Lock, ShoppingBag } from "lucide-react";

export default function CustomerMenu({ tableId: propsTableId }: { tableId?: string }) {
  // --- TANGKAP URL ---
  const searchParams = new URLSearchParams(window.location.search);
  const urlTenantId = searchParams.get("tenant");
  const urlTableId = searchParams.get("table");

  const activeTableId = propsTableId || urlTableId;
  const tenantId = urlTenantId || "DISBA_OUTLET_001"; 

  // --- STATE UTAMA ---
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableStatus, setTableStatus] = useState("available");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // 🔥 STATE BARU: Deteksi Pembayaran Selesai
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  // --- STATE PESANAN ---
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  // 1. SINKRONISASI AWAL & LISTENER STATUS MEJA
  useEffect(() => {
    if (!activeTableId) {
      setIsError(true);
      return;
    }

    fetchMenuAndTable();
    fetchExistingOrder();

    const tableChannel = supabase.channel(`table-${tenantId}-${activeTableId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${activeTableId}` }, 
        (payload) => {
          const newStatus = payload.new.status.toLowerCase();
          setTableStatus(newStatus);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(tableChannel); };
  }, [activeTableId, tenantId]);

  // 2. LISTENER REALTIME PESANAN & STATUS ORDER (FIX LAYAR TERTUTUP)
  useEffect(() => {
    if (activeOrderId) {
      fetchOrderedItems();
      const orderChannel = supabase.channel(`orders-items-${activeOrderId}`)
        // Pantau penambahan item
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${activeOrderId}` }, 
          () => fetchOrderedItems()
        )
        // 🔥 RADAR BARU: Pantau jika Kasir menutup Bill (Status Order -> Completed)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
          (payload) => {
            if (payload.new.status === 'completed') {
              setPaymentCompleted(true); // Kunci Layar Tamu!
            }
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(orderChannel); };
    }
  }, [activeOrderId]);

  // --- FUNCTIONS DATA ---
  const fetchMenuAndTable = async () => {
    try {
      const { data: table } = await supabase
        .from("tables")
        .select("name, status")
        .eq("id", Number(activeTableId))
        .eq("tenant_id", tenantId)
        .single();
      
      if (table) {
        setTableName(table.name); 
        setTableStatus(table.status.toLowerCase());
      } else {
        setIsError(true);
      }

      const { data: menuData } = await supabase
        .from("menus") 
        .select("*")
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true });
        
      if (menuData) setMenuItems(menuData);
    } catch (err) {
      setIsError(true);
    }
  };

  const fetchExistingOrder = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("table_id", Number(activeTableId))
      .eq("tenant_id", tenantId)
      .eq("status", "pending") 
      .maybeSingle();
    
    if (data) setActiveOrderId(data.id);
  };

  const fetchOrderedItems = async () => {
    if (!activeOrderId) return;
    const { data } = await supabase
      .from("order_items")
      .select("*, menus(name)")
      .eq("order_id", activeOrderId)
      .order("created_at", { ascending: false });
    
    if (data) {
        const formatted = data.map(item => ({
            name: item.menus?.name || "Menu",
            quantity: item.quantity,
            price_at_time: item.price_at_time,
            status: 'pending'
        }));
        setOrderedItems(formatted);
    }
  };

  const calculateTotalOrdered = () => {
    return orderedItems.reduce((acc, curr) => acc + (curr.quantity * curr.price_at_time), 0);
  };

  // --- LOGIKA KERANJANG ---
  const addToCart = (item: any) => {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      setCart(cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const submitOrder = async () => {
    if (cart.length === 0 || loading || !activeTableId) return;
    setLoading(true);

    try {
      const numericTableId = Number(activeTableId);
      let currentOrderId = activeOrderId;

      if (!currentOrderId) {
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            table_id: numericTableId,
            tenant_id: tenantId,
            status: "pending",
            total_price: cart.reduce((a, b) => a + b.qty * b.price, 0)
          })
          .select().single();
        
        if (orderErr) throw orderErr;
        currentOrderId = newOrder.id;
        setActiveOrderId(currentOrderId);
      }

      const orderItemsData = cart.map((item) => ({
        order_id: currentOrderId,
        menu_id: item.id,
        tenant_id: tenantId,
        quantity: item.qty,
        price_at_time: item.price,
        notes: ""
      }));

      const { error: itemErr } = await supabase.from("order_items").insert(orderItemsData);
      if (itemErr) throw itemErr;

      await supabase.from("tables").update({ status: "occupied" }).eq("id", numericTableId);

      setIsSuccess(true);
      setCart([]);
      fetchOrderedItems();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (e: any) {
      alert("Gagal mengirim pesanan: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 🔥 UI GATING (LAYAR KUNCI & PENUTUP)
  // =========================================================================
  
  if (isError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center uppercase italic">
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-red-500 mb-2">QR_NOT_VALID</h2>
          <p className="text-gray-500 text-[10px] font-bold tracking-widest leading-loose">Silakan scan ulang QR Code di meja Anda atau hubungi staf kami.</p>
        </div>
      </div>
    );
  }

  // 🔥 LAYAR 1: KETIKA TRANSAKSI SUDAH SELESAI DIBAYAR OLEH KASIR
  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center animate-in zoom-in duration-500">
        <div className="max-w-xs">
          <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tighter">Transaksi_<span className="text-emerald-500">Selesai</span></h2>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-loose">
            Terima kasih atas kunjungan Anda.<br/>Pesanan telah berhasil dibayar.
          </p>
        </div>
      </div>
    );
  }

  // 🔥 LAYAR 2: KETIKA KASIR SEDANG MEMBUKA PREVIEW BILL (MEJA TERKUNCI SEMENTARA)
  const isLocked = tableStatus === "payment" || tableStatus === "closed";
  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center animate-in fade-in">
        <div className="max-w-xs">
          <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Lock className="text-orange-500" size={32} />
          </div>
          <h2 className="text-xl font-black uppercase italic text-white mb-2 tracking-tighter">Sesi_Terkunci_</h2>
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
            Meja Anda sedang dalam proses pembayaran di Kasir.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER MENU UTAMA
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans pb-40 uppercase italic">
      
      {/* HEADER */}
      <header className="mb-8 pt-4 text-center">
        <h1 className="text-3xl font-black italic tracking-tighter">
          {tenantId.split('_')[0]} <span className="text-blue-500">MENU_</span>
        </h1>
        <div className="flex justify-center items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <p className="text-[10px] font-black text-gray-400 tracking-widest">
            MEJA: <span className="text-white">{tableName || "---"}</span>
          </p>
        </div>
      </header>

      {/* SUCCESS NOTIF */}
      {isSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-[10px] font-black text-emerald-500 tracking-widest">ORDER_SENT!_SILAKAN_TUNGGU</p>
        </div>
      )}

      {/* CATEGORY SCROLLER */}
      <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar sticky top-0 bg-[#020617]/80 backdrop-blur-md z-40 py-2">
        <button
          onClick={() => setSelectedCategory("SEMUA")}
          className={`px-6 py-2 rounded-full text-[10px] font-black border transition-all ${
            selectedCategory === "SEMUA" ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"
          }`}
        >
          SEMUA
        </button>
        {Array.from(new Set(menuItems.map((i) => i.category))).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2 rounded-full text-[10px] font-black border whitespace-nowrap transition-all ${
              selectedCategory === cat ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* MENU LIST */}
      <div className="grid gap-4">
        {menuItems
          .filter((item) => selectedCategory === "SEMUA" || item.category === selectedCategory)
          .map((item) => {
            const itemInCart = cart.find((c) => c.id === item.id);
            return (
              <div key={item.id} className="bg-white/[0.03] border border-white/5 p-3 rounded-[2rem] flex gap-4 items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 flex items-center justify-center border border-white/5">
                  {item.image_url ? (
                    <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <ImageIcon className="opacity-20 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[11px] truncate tracking-tight">{item.name}</h3>
                  <p className="text-blue-500 text-sm font-black mt-1 font-mono">RP {Number(item.price).toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                  {itemInCart && (
                    <>
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white"><Minus size={14}/></button>
                      <span className="text-xs font-black w-4 text-center font-mono">{itemInCart.qty}</span>
                    </>
                  )}
                  <button 
                    onClick={() => addToCart(item)} 
                    className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg active:bg-blue-600 active:text-white transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ORDER SUMMARY (BILL YANG SUDAH MASUK) */}
      {orderedItems.length > 0 && (
        <div className="mt-12 p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
          <h3 className="text-[9px] font-black text-blue-500 tracking-[0.2em] mb-4">PESANAN_AKTIF_</h3>
          <div className="space-y-3">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-bold border-b border-white/5 pb-2">
                <span className="text-gray-300">{item.quantity}X {item.name}</span>
                <span className="font-mono">{(item.quantity * item.price_at_time).toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-4 flex justify-between items-end border-t border-white/10 mt-2">
                <span className="text-[9px] text-gray-500 font-black tracking-widest">TOTAL_TAGIHAN</span>
                <span className="text-xl font-black text-blue-500 font-mono tracking-tighter">RP {calculateTotalOrdered().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT BAR (KERANJANG) */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 px-4 z-50">
          <div className="bg-blue-600 rounded-[2rem] p-4 flex justify-between items-center shadow-[0_10px_40px_rgba(37,99,235,0.3)] animate-in slide-in-from-bottom duration-500">
            <div className="ml-4">
              <p className="text-[8px] font-black opacity-70 tracking-[0.2em] mb-0.5">{cart.reduce((a, b) => a + b.qty, 0)} ITEMS_IN_BAG</p>
              <p className="font-black text-xl tracking-tighter text-white font-mono">RP {cart.reduce((a, b) => a + b.qty * b.price, 0).toLocaleString()}</p>
            </div>
            <button 
              onClick={submitOrder} 
              disabled={loading} 
              className="bg-white text-blue-600 px-8 py-4 rounded-[1.5rem] font-black text-[10px] flex items-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><ShoppingBag size={14}/> ORDER_NOW</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}