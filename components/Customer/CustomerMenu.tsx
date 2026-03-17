import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, ShoppingBag } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // --- STATE PESANAN ---
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  // =========================================================================
  // 🛡️ SINKRONISASI DATA PESANAN (RADAR UTAMA)
  // =========================================================================
  const syncOrder = async () => {
    if (!activeTableId) return;

    try {
      // 1. Cari Order Pending di database untuk meja ini
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('table_id', Number(activeTableId))
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }) // Ambil yang terbaru jika ada ganda
        .limit(1);

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        return;
      }

      const currentOrder = ordersData?.[0]; 

      if (currentOrder) {
        // Ada pesanan! Simpan ID-nya dan tarik detail itemnya
        setActiveOrderId(currentOrder.id.toString());
        
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*, menus(name)')
          .eq('order_id', currentOrder.id)
          .order('created_at', { ascending: true });

        if (itemsError) {
             console.error("Error fetching order items:", itemsError);
             return;
        }

        if (items) {
          setOrderedItems(items.map(i => ({
            name: i.menus?.name || 'Menu',
            quantity: i.quantity,
            price_at_time: i.price_at_time
          })));
        }
      } else {
        // Jika Kasir sudah tekan bayar (Tidak ada order pending), BERSIHKAN LAYAR!
        setActiveOrderId(null);
        setOrderedItems([]);
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data:", err);
    }
  };

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    if (!activeTableId) {
      setIsError(true);
      return;
    }

    // Tarik daftar menu dan nama meja
    supabase.from("tables").select("name").eq("id", Number(activeTableId)).single()
      .then(({data}) => { if (data) setTableName(data.name); else setIsError(true); });

    supabase.from("menus").select("*").eq("tenant_id", tenantId).order("category", { ascending: true })
      .then(({data}) => { if (data) setMenuItems(data); });

    // Mulai Radar: Tarik data pesanan langsung saat web dibuka, lalu cek tiap 3 detik
    syncOrder();
    const interval = setInterval(syncOrder, 3000); 
    
    return () => clearInterval(interval);
  }, [activeTableId, tenantId]);

  const calculateTotalOrdered = () => orderedItems.reduce((acc, curr) => acc + (curr.quantity * curr.price_at_time), 0);

  // --- LOGIKA KERANJANG ---
  const addToCart = (item: any) => {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) setCart(cart.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
  };

  const submitOrder = async () => {
    if (cart.length === 0 || loading || !activeTableId) return;
    setLoading(true);

    try {
      const numericTableId = Number(activeTableId);
      let orderIdToUse = activeOrderId;

      // Jika meja ini kosong (belum ada bill pending), BUAT BILL BARU
      if (!orderIdToUse) {
        const { data: newOrder, error } = await supabase.from("orders").insert({ 
          table_id: numericTableId, tenant_id: tenantId, status: "pending", total_price: cart.reduce((a, b) => a + b.qty * b.price, 0) 
        }).select().single();
        if (error) throw error;
        orderIdToUse = newOrder.id.toString();
        setActiveOrderId(orderIdToUse); // Set state agar tidak buat bill ganda
      }

      // Masukkan item keranjang ke dalam Bill (yang baru atau yang sudah ada)
      const orderItemsData = cart.map((item) => ({
        order_id: orderIdToUse, menu_id: item.id, tenant_id: tenantId, quantity: item.qty, price_at_time: item.price, notes: ""
      }));
      
      const { error: insertError } = await supabase.from("order_items").insert(orderItemsData);
      if(insertError) throw insertError;
      
      // Update status meja
      await supabase.from("tables").update({ status: "occupied" }).eq("id", numericTableId);

      setIsSuccess(true);
      setCart([]); 
      
      // 🔥 LANGSUNG TARIK DATA DARI DATABASE AGAR "PESANAN ANDA" MUNCUL!
      await syncOrder(); 
      
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (e: any) { 
        alert("Gagal mengirim pesanan: " + e.message); 
    } finally { 
        setLoading(false); 
    }
  };


  // =========================================================================
  // 🔥 RENDER UI
  // =========================================================================
  
  if (isError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center uppercase italic">
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-red-500 mb-2">QR_NOT_VALID</h2>
          <p className="text-gray-500 text-[10px] font-bold tracking-widest leading-loose">Silakan scan ulang QR Code di meja Anda.</p>
        </div>
      </div>
    );
  }

  // LAYAR MENU UTAMA
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans uppercase italic relative pb-32">
      
      {/* HEADER */}
      <header className="mb-8 pt-4 text-left">
        <h1 className="text-3xl font-black italic tracking-tighter">{tenantId.split('_')[0]} <span className="text-blue-500">MENU_</span></h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <p className="text-[10px] font-black text-gray-400 tracking-widest">MEJA: <span className="text-white">{tableName || "---"}</span></p>
        </div>
      </header>

      {/* SUCCESS NOTIF */}
      {isSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-[10px] font-black text-emerald-500 tracking-widest">ORDER_SENT!_SILAKAN_TUNGGU</p>
        </div>
      )}

      {/* KATEGORI */}
      <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-40 py-2">
        <button onClick={() => setSelectedCategory("SEMUA")} className={`px-6 py-2 rounded-full text-[10px] font-black border transition-all ${selectedCategory === "SEMUA" ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"}`}>SEMUA</button>
        {Array.from(new Set(menuItems.map((i) => i.category))).map((cat) => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black border whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"}`}>{cat}</button>
        ))}
      </div>

      {/* DAFTAR MENU */}
      <div className="grid gap-4">
        {menuItems.filter((item) => selectedCategory === "SEMUA" || item.category === selectedCategory).map((item) => {
            const itemInCart = cart.find((c) => c.id === item.id);
            return (
              <div key={item.id} className="bg-white/[0.03] border border-white/5 p-3 rounded-[2rem] flex gap-4 items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/50 flex-shrink-0 flex items-center justify-center border border-white/5">
                  {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} /> : <ImageIcon className="opacity-20 text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[11px] truncate tracking-tight">{item.name}</h3>
                  <p className="text-blue-500 text-sm font-black mt-1 font-mono">RP {Number(item.price).toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
                  {itemInCart && (
                    <>
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white"><Minus size={14}/></button>
                      <span className="text-xs font-black w-4 text-center font-mono">{itemInCart.qty}</span>
                    </>
                  )}
                  <button onClick={() => addToCart(item)} className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg active:bg-blue-600 active:text-white transition-all"><Plus size={20} /></button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ========================================================== */}
      {/* 🔥 DESAIN LEGENDARIS DISBA: PESANAN ANDA (TAMPIL DI BAWAH) */}
      {/* ========================================================== */}
      {orderedItems.length > 0 && (
        <div className="mt-12 p-6 bg-transparent border border-white/10 border-dashed rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4">
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[11px] font-black text-blue-400 italic tracking-[0.1em]">PESANAN_ANDA_</h3>
            <span className="bg-white/5 px-3 py-1.5 rounded-lg text-[9px] text-gray-500 font-black tracking-widest uppercase border border-white/5">
              BILL #{activeOrderId ? activeOrderId.substring(0, 4) : '00'}
            </span>
          </div>

          <div className="space-y-0">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="border-b border-white/5 py-4 last:border-0 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-3">
                    <span className="text-[11px] font-black text-blue-500">{item.quantity}X</span>
                    <span className="text-[11px] font-bold text-white/90 uppercase tracking-wide">{item.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white font-mono">
                    {(item.quantity * item.price_at_time).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="inline-block border border-orange-500/50 text-orange-500 text-[8px] font-black px-2 py-0.5 rounded-full tracking-widest">
                    PENDING
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex justify-between items-end">
            <span className="text-[10px] text-gray-500 font-black italic tracking-[0.1em]">TOTAL_TAGIHAN_</span>
            <span className="text-3xl font-black text-blue-500 italic tracking-tighter font-mono">
              RP {calculateTotalOrdered().toLocaleString('id-ID')}
            </span>
          </div>
          
        </div>
      )}

      {/* TOMBOL KERANJANG (DI BAWAH) */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 px-4 z-40">
          <div className="bg-blue-600 rounded-[2rem] p-4 flex justify-between items-center shadow-[0_10px_40px_rgba(37,99,235,0.3)] animate-in slide-in-from-bottom duration-500">
            <div className="ml-4">
              <p className="text-[8px] font-black opacity-70 tracking-[0.2em] mb-0.5">{cart.reduce((a, b) => a + b.qty, 0)} ITEMS_IN_BAG</p>
              <p className="font-black text-xl tracking-tighter text-white font-mono">RP {cart.reduce((a, b) => a + b.qty * b.price, 0).toLocaleString('id-ID')}</p>
            </div>
            <button onClick={submitOrder} disabled={loading} className="bg-white text-blue-600 px-8 py-4 rounded-[1.5rem] font-black text-[10px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={16} /> : <><ShoppingBag size={14}/> ORDER_NOW</>}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}