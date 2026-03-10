import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Image as ImageIcon, Loader2, Plus, Minus, CheckCircle2, Lock } from "lucide-react";

export default function CustomerMenu({ tableId: propsTableId }: { tableId?: string }) {
  // --- TANGKAP URL MANUAL (VANILLA JS, BEBAS CRASH) ---
  const searchParams = new URLSearchParams(window.location.search);
  const urlTenantId = searchParams.get("tenant");
  const urlTableId = searchParams.get("table");

  // Fallback jika masih ada yang scan pakai format path lama (/menu/26)
  const pathParts = window.location.pathname.split("/");
  const pathTableId = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

  // Penentuan ID Meja & Outlet
  const activeTableId = propsTableId || urlTableId || pathTableId;
  const tenantId = urlTenantId || "NES_HOUSE_001"; // Default fallback

  // --- STATE UTAMA ---
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableStatus, setTableStatus] = useState("available");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // --- STATE PESANAN ---
  const [activeBillId, setActiveBillId] = useState<number | null>(null);
  const [orderedItems, setOrderedItems] = useState<any[]>([]);

  // 1. SINKRONISASI AWAL & LISTENER STATUS MEJA
  useEffect(() => {
    if (!activeTableId) {
      setIsError(true);
      return;
    }

    fetchMenuAndTable();
    fetchExistingBill();

    const tableChannel = supabase.channel(`table-${tenantId}-${activeTableId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'tables', filter: `id=eq.${activeTableId}` }, 
        (payload) => {
          const newStatus = payload.new.status.toLowerCase();
          if (newStatus === "closed" || newStatus === "payment") {
            setTableStatus("closed");
            supabase.removeChannel(tableChannel); 
          } else {
            setTableStatus(newStatus);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(tableChannel); };
  }, [activeTableId, tenantId]);

  // 2. LISTENER REALTIME PESANAN
  useEffect(() => {
    if (activeBillId) {
      fetchOrderedItems();
      const orderChannel = supabase.channel(`orders-${activeBillId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'order_items', filter: `bill_id=eq.${activeBillId}` }, 
          () => fetchOrderedItems()
        )
        .subscribe();

      return () => { supabase.removeChannel(orderChannel); };
    }
  }, [activeBillId]);

  // --- FUNCTIONS DATA ---
  const fetchMenuAndTable = async () => {
    try {
      // 1. MENCARI NAMA MEJA BERDASARKAN ID
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

      // 2. MENGAMBIL DAFTAR MENU (🔥 SUDAH DIKEMBALIKAN KE TABEL "menus")
      const { data: menuData } = await supabase
        .from("menus") 
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_available", true) // 🔥 Sembunyikan menu yang sedang kosong
        .order("category", { ascending: true });
        
      if (menuData) setMenuItems(menuData);
    } catch (err) {
      console.error("Load error:", err);
      setIsError(true);
    }
  };

  const fetchExistingBill = async () => {
    const { data } = await supabase
      .from("open_bills")
      .select("id")
      .eq("table_id", Number(activeTableId))
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .maybeSingle();
    
    if (data) setActiveBillId(data.id);
  };

  const fetchOrderedItems = async () => {
    if (!activeBillId) return;
    const { data } = await supabase
      .from("order_items")
      .select("name, quantity, price_at_order, status")
      .eq("bill_id", activeBillId)
      .order("created_at", { ascending: false });
    if (data) setOrderedItems(data);
  };

  const calculateTotalOrdered = () => {
    return orderedItems.reduce((acc, curr) => acc + (curr.quantity * curr.price_at_order), 0);
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
      let currentBillId = activeBillId;

      if (!currentBillId) {
        const { data: newBill, error: billErr } = await supabase
          .from("open_bills")
          .insert({
            table_id: numericTableId,
            tenant_id: tenantId,
            status: "open",
            order_source: "customer",
            guest_name: `Tamu ${tableName || activeTableId}`
          })
          .select().single();
        if (billErr) throw billErr;
        currentBillId = newBill.id;
        setActiveBillId(currentBillId);
      }

      const orderData = cart.map((item) => ({
        bill_id: currentBillId,
        product_id: item.id,
        tenant_id: tenantId,
        name: item.name,
        quantity: item.qty,
        price_at_order: item.price,
        status: "pending",
        created_at: new Date().toISOString()
      }));

      const { error: itemErr } = await supabase.from("order_items").insert(orderData);
      if (itemErr) throw itemErr;

      await supabase.from("tables").update({ status: "open" }).eq("id", numericTableId).eq("tenant_id", tenantId);

      setIsSuccess(true);
      setCart([]);
      fetchOrderedItems();
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI GATING (ERROR SCREEN) ---
  if (isError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-red-500 mb-2">QR TIDAK VALID</h2>
          <p className="text-gray-400 text-xs">Silakan scan QR Code yang ada di meja Anda, atau hubungi pelayan kami.</p>
        </div>
      </div>
    );
  }

  // --- UI GATING (LOCK SCREEN) ---
  const isLocked = tableStatus === "closed" || tableStatus === "payment";

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-8 text-center">
        <div className="max-w-xs animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]">
            <Lock className="text-red-500" size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white">
            Meja <span className="text-red-500">Terkunci</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] leading-relaxed mb-8">
            Meja ini sedang dalam proses penyelesaian transaksi. Terima kasih.
          </p>
          <p className="text-[9px] font-black text-blue-500 uppercase italic">{tenantId.replace(/_/g, " ")} SYSTEM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans pb-44">
      {/* HEADER DINAMIS SESUAI OUTLET */}
      <header className="mb-8 pt-4 text-center">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">
          {tenantId.replace(/_/g, " ").split(" ")[0]} <span className="text-blue-500">MENU</span>
        </h1>
        <div className="flex justify-center items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            TABLE: <span className="text-white">{tableName || "Loading..."}</span>
          </p>
        </div>
      </header>

      {/* NOTIFIKASI SUKSES */}
      {isSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-[10px] font-black text-emerald-500 uppercase italic">Pesanan Terkirim!</p>
        </div>
      )}

      {/* CATEGORY FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar sticky top-0 bg-[#020617] z-40 py-2">
        <button
          onClick={() => setSelectedCategory("SEMUA")}
          className={`px-6 py-2 rounded-full text-[10px] font-black border transition-all ${
            selectedCategory === "SEMUA" ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-400"
          }`}
        >
          SEMUA
        </button>
        {Array.from(new Set(menuItems.map((i) => i.category))).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-6 py-2 rounded-full text-[10px] font-black border whitespace-nowrap transition-all ${
              selectedCategory === cat ? "bg-blue-600 border-blue-600" : "bg-white/5 border-white/10 text-gray-400"
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
              <div key={item.id} className="bg-white/[0.03] border border-white/10 p-3 rounded-[2rem] flex gap-4 items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[11px] uppercase italic tracking-tight truncate">{item.name}</h3>
                  <p className="text-blue-500 text-sm font-black mt-0.5">RP {Number(item.price).toLocaleString('id-ID')}</p>
                </div>
                
                {/* TOMBOL KONTROL */}
                <div className="flex items-center gap-2 bg-black/60 p-1 rounded-[1.5rem] border border-white/10 relative z-30">
                  {itemInCart && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} 
                        className="w-10 h-10 flex items-center justify-center text-gray-500 active:text-white active:bg-white/10 rounded-full"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{itemInCart.qty}</span>
                    </>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); addToCart(item); }} 
                    className="bg-white text-black w-10 h-10 rounded-xl flex items-center justify-center font-black active:scale-90 active:bg-blue-500 active:text-white transition-all shadow-lg"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* ORDER SUMMARY */}
      {orderedItems.length > 0 && (
        <div className="mt-12 p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 italic">Pesanan_Anda_</h3>
            <span className="text-[8px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">BILL #{activeBillId}</span>
          </div>
          <div className="space-y-4">
            {orderedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-blue-400">{item.quantity}X</span>
                    <span className="text-[10px] font-black uppercase text-white/90">{item.name}</span>
                  </div>
                  <span className={`text-[7px] w-fit px-2 py-0.5 rounded-full font-black uppercase border ${
                    item.status === 'pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-white">
                  {(item.quantity * item.price_at_order).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
            <span className="text-[10px] font-black italic uppercase text-gray-400">Total_Tagihan_</span>
            <span className="text-2xl font-black italic text-blue-500">
              RP {calculateTotalOrdered().toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}

      {/* FOOTER KERANJANG */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 px-4 pointer-events-none z-[100]">
          <div className="bg-blue-600 rounded-[2.5rem] p-4 flex justify-between items-center shadow-2xl pointer-events-auto animate-in slide-in-from-bottom">
            <div className="ml-4">
              <p className="text-[8px] font-black opacity-70 uppercase tracking-widest">{cart.reduce((a, b) => a + b.qty, 0)} Items</p>
              <p className="font-black text-xl italic tracking-tighter">RP {cart.reduce((a, b) => a + b.qty * b.price, 0).toLocaleString('id-ID')}</p>
            </div>
            <button 
              onClick={submitOrder} 
              disabled={loading} 
              className="bg-white text-blue-600 px-8 py-4 rounded-[1.8rem] font-black text-[10px] uppercase flex items-center gap-2 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : "ORDER_NOW"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}