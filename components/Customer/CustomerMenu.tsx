import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, Lock, ShoppingBag, Receipt, X } from "lucide-react";

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
  
  // 🔥 STATE MODAL BILL
  const [showBillModal, setShowBillModal] = useState(false);
  
  // --- STATE PESANAN ---
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  const localOrderKey = `disba_order_${activeTableId}`;

  // =========================================================================
  // 🛡️ FUNGSI AUTO-RESET (SAPU BERSIH) SAAT KASIR BAYAR
  // =========================================================================
  const handleResetMenu = () => {
    if (activeTableId) localStorage.removeItem(localOrderKey);
    setActiveOrderId(null);
    setOrderedItems([]);
    setCart([]);
    setShowBillModal(false);
  };

  // =========================================================================
  // 🛡️ RADAR SINKRONISASI (CEK TIAP 3 DETIK)
  // =========================================================================
  const syncData = async () => {
    if (!activeTableId) return;

    // 1. Cek Status Meja
    const { data: table } = await supabase.from("tables").select("name, status").eq("id", Number(activeTableId)).eq("tenant_id", tenantId).single();
    if (table) {
      setTableName(table.name);
      setTableStatus(table.status.toLowerCase());
    }

    // 2. Cek Order Terakhir di Meja Ini
    const { data: latestOrder } = await supabase
      .from("orders")
      .select("id, status")
      .eq("table_id", Number(activeTableId))
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestOrder) {
      if (latestOrder.status === 'pending') {
        setActiveOrderId(latestOrder.id);
        localStorage.setItem(localOrderKey, latestOrder.id.toString()); 

        // Tarik detail pesanan agar tamu tahu tagihannya
        const { data: items } = await supabase.from("order_items").select("*, menus(name)").eq("order_id", latestOrder.id).order("created_at", { ascending: true });
        if (items) {
          setOrderedItems(items.map(item => ({
            name: item.menus?.name || "Menu",
            quantity: item.quantity,
            price_at_time: item.price_at_time,
          })));
        }
      } else if (latestOrder.status === 'completed') {
        // 🔥 JIKA KASIR SUDAH TEKAN BAYAR: KOSONGKAN HP TAMU!
        const savedId = localStorage.getItem(localOrderKey);
        if (savedId === latestOrder.id.toString() || activeOrderId === latestOrder.id.toString()) {
          handleResetMenu();
        }
      }
    }
  };

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    if (!activeTableId) {
      setIsError(true);
      return;
    }

    // Tarik daftar menu
    supabase.from("menus").select("*").eq("tenant_id", tenantId).order("category", { ascending: true })
      .then(({data}) => { if (data) setMenuItems(data); });

    // Mulai Radar Polling 3 Detik
    syncData();
    const interval = setInterval(syncData, 3000); 
    return () => clearInterval(interval);
  }, [activeTableId, tenantId]);

  // --- REALTIME LISTENER KHUSUS ORDER ---
  useEffect(() => {
    if (!activeOrderId) return;
    const orderChannel = supabase.channel(`orders-items-${activeOrderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${activeOrderId}` }, 
        () => syncData()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` },
        (payload) => {
          if (payload.new.status === 'completed') {
             // 🔥 JIKA KASIR SUDAH TEKAN BAYAR: KOSONGKAN HP TAMU SEKARANG JUGA!
             handleResetMenu();
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(orderChannel); };
  }, [activeOrderId]);

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
        localStorage.setItem(localOrderKey, currentOrderId.toString());
      }

      const orderItemsData = cart.map((item) => ({
        order_id: currentOrderId, menu_id: item.id, tenant_id: tenantId, quantity: item.qty, price_at_time: item.price, notes: ""
      }));

      await supabase.from("order_items").insert(orderItemsData);
      await supabase.from("tables").update({ status: "occupied" }).eq("id", numericTableId);

      setIsSuccess(true);
      setCart([]);
      
      await syncData(); // Langsung update daftar pesanan di HP tamu
      
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (e: any) { alert("Gagal mengirim pesanan"); } finally { setLoading(false); }
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

  // LAYAR KUNCI SEMENTARA (KASIR SEDANG BAYAR / CEK BILL)
  if (tableStatus === "payment" || tableStatus === "closed") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center animate-in fade-in">
        <div className="max-w-xs">
          <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Lock className="text-orange-500" size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2 tracking-tighter uppercase italic">Sesi_Terkunci_</h2>
          <p className="text-[9px] font-bold text-gray-500 tracking-[0.2em] leading-relaxed uppercase">
            Meja sedang dalam proses pembayaran di Kasir.
          </p>
        </div>
      </div>
    );
  }

  // LAYAR MENU UTAMA
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans uppercase italic relative pb-40">
      
      {/* 🧾 TOMBOL MELAYANG: LIHAT BILL (HANYA MUNCUL JIKA ADA PESANAN) */}
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

      {/* 🔥 DAFTAR TAGIHAN DI BAWAH MENU (AGAR TAMU SIAP-SIAP BAYAR) */}
      {orderedItems.length > 0 && (
        <div className="mt-12 p-5 bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
          {/* Latar Belakang Biru Tipis */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          
          <h3 className="text-[10px] font-black text-blue-500 tracking-[0.2em] mb-5 flex items-center gap-2">
            <Receipt size={14} /> TAGIHAN_SEMENTARA_
          </h3>
          <div className="space-y-4">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[10px] font-bold border-b border-white/5 pb-3">
                <span className="text-gray-300">{item.quantity}X {item.name}</span>
                <span className="font-mono text-white">{(item.quantity * item.price_at_time).toLocaleString()}</span>
              </div>
            ))}
            <div className="pt-2 flex justify-between items-end border-t border-white/10 mt-2 bg-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                <div className="flex flex-col">
                  <span className="text-[8px] text-blue-400 font-black tracking-widest mb-1">TOTAL_BILL_SAAT_INI</span>
                  <span className="text-[9px] text-gray-500 font-bold lowercase tracking-widest">*Belum termasuk PPN & Servis</span>
                </div>
                <span className="text-2xl font-black text-white font-mono tracking-tighter">RP {calculateTotalOrdered().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOMBOL KERANJANG (DI BAWAH) */}
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

      {/* 🧾 MODAL DIGITAL BILL (STRUK POP-UP BESAR) */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] p-4 flex flex-col justify-end">
          <div className="bg-[#0b1120] border border-white/10 rounded-[2.5rem] w-full max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] rounded-t-[2.5rem]">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600/20 p-3 rounded-full border border-blue-500/30"><Receipt size={24} className="text-blue-500" /></div>
                <div>
                  <h2 className="text-lg font-black italic tracking-tighter">TAGIHAN_SAYA_</h2>
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
                <span className="text-[10px] font-black text-gray-500 tracking-[0.2em]">TOTAL_TAGIHAN_SEMENTARA</span>
                <span className="text-3xl font-black italic text-white font-mono tracking-tighter">RP {calculateTotalOrdered().toLocaleString()}</span>
              </div>
              <div className="text-[9px] font-black text-orange-400 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 text-center tracking-widest uppercase flex items-center justify-center gap-2">
                <Lock size={12}/> Silakan ke kasir untuk memproses tagihan
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}