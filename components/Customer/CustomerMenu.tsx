import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, Lock, ShoppingBag, Receipt, X, RefreshCcw } from "lucide-react";

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
  
  // 🔥 STATE MODAL BILL & KUNCI LAYAR
  const [showBillModal, setShowBillModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  // --- STATE PESANAN ---
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  // 1. SINKRONISASI AWAL
  useEffect(() => {
    if (!activeTableId) {
      setIsError(true);
      return;
    }
    fetchMenuAndTable();
    fetchExistingOrder(); // 🔥 Akan membaca dari memori HP

    const tableChannel = supabase.channel(`table-${tenantId}-${activeTableId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${activeTableId}` }, 
        (payload) => setTableStatus(payload.new.status.toLowerCase())
      ).subscribe();

    return () => { supabase.removeChannel(tableChannel); };
  }, [activeTableId, tenantId]);

  // 2. RADAR PENJAGA (POLLING 3 DETIK & REALTIME) - ANTI HP TIDUR
  useEffect(() => {
    if (!activeOrderId) return;
    
    fetchOrderedItems();

    // 🔥 SAPU RANJAU: Cek paksa ke database setiap 3 detik!
    const pollInterval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', activeOrderId).single();
      if (data?.status === 'completed') {
        setPaymentCompleted(true);
      }
    }, 3000);

    // Realtime Listener
    const orderChannel = supabase.channel(`orders-items-${activeOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${activeOrderId}` }, 
        () => fetchOrderedItems()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
        (payload) => {
          if (payload.new.status === 'completed') setPaymentCompleted(true);
        }
      ).subscribe();

    return () => { 
      clearInterval(pollInterval);
      supabase.removeChannel(orderChannel); 
    };
  }, [activeOrderId]);

  // --- FUNCTIONS DATA ---
  const fetchMenuAndTable = async () => {
    try {
      const { data: table } = await supabase.from("tables").select("name, status").eq("id", Number(activeTableId)).eq("tenant_id", tenantId).single();
      if (table) {
        setTableName(table.name); 
        setTableStatus(table.status.toLowerCase());
      } else setIsError(true);

      const { data: menuData } = await supabase.from("menus").select("*").eq("tenant_id", tenantId).order("category", { ascending: true });
      if (menuData) setMenuItems(menuData);
    } catch (err) { setIsError(true); }
  };

  // 🔥 INGATAN GAJAH: Baca memori HP tamu
  const fetchExistingOrder = async () => {
    const localKey = `disba_order_${activeTableId}`;
    const savedOrderId = localStorage.getItem(localKey);

    // Jika HP ini ingat pernah pesan
    if (savedOrderId) {
      const { data } = await supabase.from("orders").select("status").eq("id", savedOrderId).single();
      if (data) {
        setActiveOrderId(savedOrderId);
        if (data.status === "completed") setPaymentCompleted(true);
        return; // Jangan lanjut cari, pakai ingatan ini
      } else {
        localStorage.removeItem(localKey); // Order sudah dihapus dari database
      }
    }

    // Jika memori kosong, cari order pending di meja ini
    const { data } = await supabase.from("orders").select("id").eq("table_id", Number(activeTableId)).eq("tenant_id", tenantId).eq("status", "pending").maybeSingle();
    if (data) {
      setActiveOrderId(data.id);
      localStorage.setItem(localKey, data.id); // Tanam ke memori HP
    }
  };

  const fetchOrderedItems = async () => {
    if (!activeOrderId) return;
    const { data } = await supabase.from("order_items").select("*, menus(name)").eq("order_id", activeOrderId).order("created_at", { ascending: true });
    if (data) {
        const formatted = data.map(item => ({
            name: item.menus?.name || "Menu",
            quantity: item.quantity,
            price_at_time: item.price_at_time,
        }));
        setOrderedItems(formatted);
    }
  };

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
      let currentOrderId = activeOrderId;

      if (!currentOrderId) {
        const { data: newOrder, error } = await supabase.from("orders").insert({ 
          table_id: numericTableId, tenant_id: tenantId, status: "pending", total_price: cart.reduce((a, b) => a + b.qty * b.price, 0) 
        }).select().single();
        
        if (error) throw error;
        currentOrderId = newOrder.id;
        setActiveOrderId(currentOrderId);
        localStorage.setItem(`disba_order_${activeTableId}`, currentOrderId); // 🔥 TANAM INGATAN
      }

      const orderItemsData = cart.map((item) => ({
        order_id: currentOrderId, menu_id: item.id, tenant_id: tenantId, quantity: item.qty, price_at_time: item.price, notes: ""
      }));

      await supabase.from("order_items").insert(orderItemsData);
      await supabase.from("tables").update({ status: "occupied" }).eq("id", numericTableId);

      setIsSuccess(true);
      setCart([]);
      await fetchOrderedItems(); 
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (e: any) { alert("Gagal mengirim pesanan"); } finally { setLoading(false); }
  };

  const handleStartNewOrder = () => {
    localStorage.removeItem(`disba_order_${activeTableId}`);
    setPaymentCompleted(false);
    setActiveOrderId(null);
    window.location.reload();
  };

  // =========================================================================
  // 🔥 RENDER MASTER (GATING SYSTEM)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans uppercase italic relative">
      
      {/* 1. LAYAR ERROR */}
      {isError ? (
        <div className="flex h-[80vh] items-center justify-center text-center">
          <div className="max-w-xs">
            <h2 className="text-2xl font-black text-red-500 mb-2">QR_NOT_VALID</h2>
            <p className="text-gray-500 text-[10px] font-bold tracking-widest leading-loose">Silakan scan ulang QR Code di meja Anda.</p>
          </div>
        </div>
      ) : 
      
      // 2. LAYAR KUNCI PERMANEN (PEMBAYARAN SELESAI)
      paymentCompleted ? (
        <div className="flex h-[80vh] flex-col items-center justify-center text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="text-emerald-500" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase italic text-white mb-3 tracking-tighter">Transaksi_<span className="text-emerald-500">Selesai</span></h2>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] leading-loose mb-10">
            Terima kasih atas kunjungan Anda.<br/>Pesanan telah lunas.
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowBillModal(true)} className="flex items-center justify-center gap-2 text-[10px] font-black text-white bg-blue-600 px-8 py-4 rounded-2xl shadow-lg active:scale-95 transition-all tracking-[0.1em]">
              <Receipt size={16}/> Lihat_Struk_Digital
            </button>
            <button onClick={handleStartNewOrder} className="flex items-center justify-center gap-2 text-[9px] font-black text-gray-600 hover:text-white transition-colors tracking-[0.2em] bg-white/5 px-6 py-3 rounded-xl border border-white/10">
              <RefreshCcw size={12}/> Pesan_Lagi
            </button>
          </div>
        </div>
      ) : 
      
      // 3. LAYAR KUNCI SEMENTARA (KASIR SEDANG BAYAR)
      (tableStatus === "payment" || tableStatus === "closed") ? (
        <div className="flex h-[80vh] items-center justify-center text-center animate-in fade-in">
          <div className="max-w-xs">
            <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Lock className="text-orange-500" size={32} />
            </div>
            <h2 className="text-xl font-black text-white mb-2 tracking-tighter">Sesi_Terkunci_</h2>
            <p className="text-[9px] font-bold text-gray-500 tracking-[0.2em] leading-relaxed">
              Meja sedang dalam proses pembayaran di Kasir.
            </p>
          </div>
        </div>
      ) : 
      
      // 4. LAYAR MENU NORMAL
      (
        <div className="pb-40">
          {orderedItems.length > 0 && (
            <button onClick={() => setShowBillModal(true)} className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all animate-in slide-in-from-top">
              <div className="relative">
                <Receipt className="text-blue-500" size={24} />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse"></div>
              </div>
              <div className="flex flex-col items-start pr-2">
                <span className="text-[8px] font-black text-gray-400 tracking-widest">LIHAT BILL</span>
                <span className="text-xs font-black text-white font-mono">Rp {calculateTotalOrdered().toLocaleString()}</span>
              </div>
            </button>
          )}

          <header className="mb-8 pt-4 text-left">
            <h1 className="text-3xl font-black italic tracking-tighter">{tenantId.split('_')[0]} <span className="text-blue-500">MENU_</span></h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black text-gray-400 tracking-widest">MEJA: <span className="text-white">{tableName || "---"}</span></p>
            </div>
          </header>

          {isSuccess && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <p className="text-[10px] font-black text-emerald-500 tracking-widest">ORDER_SENT!_SILAKAN_TUNGGU</p>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-40 py-2">
            <button onClick={() => setSelectedCategory("SEMUA")} className={`px-6 py-2 rounded-full text-[10px] font-black border transition-all ${selectedCategory === "SEMUA" ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"}`}>SEMUA</button>
            {Array.from(new Set(menuItems.map((i) => i.category))).map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-full text-[10px] font-black border whitespace-nowrap transition-all ${selectedCategory === cat ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-500"}`}>{cat}</button>
            ))}
          </div>

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
                      <p className="text-blue-500 text-sm font-black mt-1 font-mono">RP {Number(item.price).toLocaleString()}</p>
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

          {cart.length > 0 && (
            <div className="fixed inset-x-0 bottom-6 px-4 z-40">
              <div className="bg-blue-600 rounded-[2rem] p-4 flex justify-between items-center shadow-[0_10px_40px_rgba(37,99,235,0.3)] animate-in slide-in-from-bottom duration-500">
                <div className="ml-4">
                  <p className="text-[8px] font-black opacity-70 tracking-[0.2em] mb-0.5">{cart.reduce((a, b) => a + b.qty, 0)} ITEMS_IN_BAG</p>
                  <p className="font-black text-xl tracking-tighter text-white font-mono">RP {cart.reduce((a, b) => a + b.qty * b.price, 0).toLocaleString()}</p>
                </div>
                <button onClick={submitOrder} disabled={loading} className="bg-white text-blue-600 px-8 py-4 rounded-[1.5rem] font-black text-[10px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <><ShoppingBag size={14}/> ORDER_NOW</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL DIGITAL BILL (Bisa dibuka di layar menu ATAU layar Selesai) */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] p-4 flex flex-col justify-end">
          <div className="bg-[#0b1120] border border-white/10 rounded-[2.5rem] w-full max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] rounded-t-[2.5rem]">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600/20 p-3 rounded-full border border-blue-500/30"><Receipt size={24} className="text-blue-500" /></div>
                <div>
                  <h2 className="text-lg font-black italic tracking-tighter">DIGITAL_BILL_</h2>
                  <p className="text-[9px] text-gray-500 font-bold tracking-[0.2em] mt-1">MEJA: <span className="text-white">{tableName}</span></p>
                </div>
              </div>
              <button onClick={() => setShowBillModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {orderedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/[0.03]">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-black text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/20">{item.quantity}X</span>
                    <span className="text-[12px] font-black text-white/90 uppercase">{item.name}</span>
                  </div>
                  <span className="text-[12px] font-mono font-black italic">{(item.quantity * item.price_at_time).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-[#020617] border-t border-white/10 rounded-b-[2.5rem]">
              <div className="flex justify-between items-end mb-4">
                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em]">{paymentCompleted ? 'TOTAL_DIBAYAR' : 'ESTIMASI_TAGIHAN'}</span>
                <span className="text-3xl font-black italic text-white font-mono tracking-tighter">RP {calculateTotalOrdered().toLocaleString()}</span>
              </div>
              {!paymentCompleted && (
                <div className="text-[9px] font-black text-orange-400 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 text-center tracking-widest uppercase flex items-center justify-center gap-2">
                  <Lock size={12}/> Silakan ke kasir untuk melakukan pembayaran
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}