import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Plus, Minus, Send, ShoppingCart, Coffee, Utensils, Grid } from "lucide-react";

type Product = { id: number; name: string; price: number; category: string };
type CartItem = { product: Product; quantity: number; isLocked: boolean };
type Props = { billId: number; onBack: () => void };

export default function WaiterOrder({ billId, onBack }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("ALL");
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableName, setTableName] = useState("");

  // 🔒 KUNCI MULTI-OUTLET (Aman dari Next.js Error)
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "NES_HOUSE_001" : "NES_HOUSE_001";

  useEffect(() => {
    const initializeData = async () => {
      await fetchProducts();
      await fetchExistingOrder();
      await fetchTableName();
    };
    initializeData();
  }, [billId]);

  const fetchTableName = async () => {
    const { data } = await supabase
      .from("open_bills")
      .select("tables(name)")
      .eq("id", billId)
      .eq("tenant_id", tenantId) // 🔥 Keamanan ekstra
      .single();
    if (data) setTableName((data as any).tables.name);
  };

  const fetchProducts = async () => {
    // 🔥 UBAH DARI "products" KE "menus" DAN TAMBAH FILTER TENANT
    const { data } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_available", true) // 🔥 Sembunyikan menu kosong
      .order("name");

    if (data) {
      setProducts(data);
      const uniqueCategories = ["ALL", ...new Set(data.map((p: Product) => p.category))];
      setCategories(uniqueCategories);
    }
  };

  const fetchExistingOrder = async () => {
    // 🔥 SINKRONKAN JUGA PENGAMBILAN DATA EXISTING KE TABEL "menus"
    const { data, error } = await supabase
      .from("order_items")
      .select(`quantity, menus (id, name, price, category)`) // 🔥 Ubah products jadi menus
      .eq("bill_id", billId)
      .eq("tenant_id", tenantId); // 🔥 Keamanan ekstra

    if (error) return;

    if (data && data.length > 0) {
      const existingCart = data.map((item: any) => ({
        product: item.menus, // 🔥 Ubah item.products jadi item.menus
        quantity: item.quantity,
        isLocked: true 
      }));
      setCart(existingCart);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id && !item.isLocked);
      if (existingIdx > -1) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += 1;
        return newCart;
      }
      return [...prev, { product, quantity: 1, isLocked: false }];
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

  // 🔥 PERBAIKAN PRINTER DINAMIS
  const sendToPrinter = async (newItems: CartItem[]) => {
    try {
      const targetIp = typeof window !== "undefined" ? localStorage.getItem("printer_ip") || "127.0.0.1" : "127.0.0.1";
      
      await fetch(`http://${targetIp}:4000/print-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_name: tableName || billId.toString(),
          items: newItems.map(item => ({
            name: item.product.name,
            qty: item.quantity,
            category: item.product.category
          }))
        })
      });
    } catch (err) {
      console.warn("Printer offline");
    }
  };

  const handleSubmitOrder = async () => {
    const newItems = cart.filter(item => !item.isLocked);
    if (newItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const orderData = newItems.map((item) => ({
        bill_id: billId,
        tenant_id: tenantId, // 🔥 Wajib ikut dikirim agar tidak ditolak Supabase
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_order: item.product.price,
        status: "pending"
      }));

      const { error } = await supabase
        .from("order_items")
        .insert(orderData)
        .select();
      
      if (error) throw error;

      // Jalankan printer
      sendToPrinter(newItems).catch(e => console.log(e));
      
      // LOGIKA UTAMA: Ubah semua item di keranjang menjadi 'locked' (sudah diproses)
      // Ini akan membuat tampilan keranjang langsung terupdate tanpa pindah halaman
      setCart(prev => prev.map(item => ({ ...item, isLocked: true })));
      
      alert("Pesanan Berhasil Dikirim!");

    } catch (err: any) {
      alert("Gagal mengirim: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = category === "ALL" ? products : products.filter(p => p.category === category);
  const totalLocked = cart.filter(i => i.isLocked).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalNew = cart.filter(i => !i.isLocked).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const grandTotal = totalLocked + totalNew;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617] flex flex-col font-sans italic text-white overflow-hidden uppercase">
      <header className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/20 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-500 font-black text-[9px] tracking-tighter hover:bg-white/5 px-2 py-1 rounded-lg transition-all">
          <ChevronLeft size={14} /> FLOOR
        </button>
        <div className="text-right">
          <p className="text-[9px] font-black text-white leading-none tracking-widest">MEJA_{tableName || "..."}</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-20 border-r border-white/5 flex flex-col py-2 gap-1 px-1 overflow-y-auto no-scrollbar bg-black/40">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`py-3 rounded-xl text-[8px] font-black transition-all flex flex-col items-center gap-1 border ${
                category === cat ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/20" : "bg-white/[0.02] border-white/5 text-gray-500 opacity-60"
              }`}
            >
              {cat === 'ALL' ? <Grid size={12}/> : cat === 'FOOD' || cat === 'NUSANTARA' ? <Utensils size={12}/> : <Coffee size={12}/>}
              <span className="truncate w-full text-center px-1 uppercase">{cat}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 p-2 overflow-y-auto no-scrollbar bg-gradient-to-b from-transparent to-black/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pb-16">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-2 flex flex-col items-center justify-center gap-1 hover:bg-blue-600/10 hover:border-blue-500/50 transition-all active:scale-95 h-20 shadow-lg overflow-hidden"
              >
                <span className="text-[8px] font-black text-center leading-tight tracking-tight text-white group-hover:text-blue-400 px-1 line-clamp-2 uppercase">
                  {product.name}
                </span>
                <span className="text-blue-500 text-[8px] font-black mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                  {(product.price/1000).toFixed(0)}K
                </span>
              </button>
            ))}
          </div>
        </main>

        <aside className="w-64 bg-black/60 border-l border-white/10 flex flex-col shadow-2xl backdrop-blur-xl">
          <div className="p-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
                <ShoppingCart size={14} />
                <h3 className="text-[8px] font-black tracking-widest uppercase">ORDER_LIST</h3>
            </div>
            <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded">
              {cart.filter(i => !i.isLocked).length} NEW
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
            {cart.map((item, idx) => (
              <div key={idx} className={`p-2.5 rounded-2xl border transition-all ${
                item.isLocked ? "bg-black/40 border-white/5 opacity-40 italic" : "bg-white/[0.05] border-blue-500/20 shadow-lg shadow-blue-500/5"
              }`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1 pr-2">
                    <p className="text-[8px] font-black text-white leading-tight truncate uppercase">{item.product.name}</p>
                    <p className={`text-[7px] font-bold mt-1 uppercase tracking-tighter ${item.isLocked ? "text-gray-500" : "text-blue-400"}`}>
                      {item.isLocked ? "SUDAH_DIPROSES" : "SIAP_KIRIM"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!item.isLocked ? (
                      <>
                        <button onClick={() => removeFromCart(idx)} className="w-6 h-6 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                          <Minus size={12} />
                        </button>
                        <span className="text-[10px] font-black w-3 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart(item.product)} className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                          <Plus size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] font-black opacity-60">x{item.quantity}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-1.5">
                  <span className="text-[7px] text-gray-600 font-black">PRICE_TOTAL</span>
                  <span className="text-[8px] font-black text-blue-400 italic font-mono">
                    RP {(item.product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-black/40 border-t border-white/10 space-y-1.5">
            <div className="flex justify-between items-center opacity-40">
              <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Terkirim</span>
              <span className="text-[9px] font-bold text-white font-mono uppercase">RP {totalLocked.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Tambahan</span>
              <span className="text-[9px] font-bold text-blue-400 font-mono uppercase">+ RP {totalNew.toLocaleString()}</span>
            </div>
            <div className="border-t border-white/5 my-1"></div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[8px] font-black text-white tracking-widest uppercase">Grand_Total</span>
              <span className="text-sm font-black text-green-400 italic font-mono">
                RP {grandTotal.toLocaleString()}
              </span>
            </div>
            
            <button 
              onClick={handleSubmitOrder}
              disabled={cart.filter(i => !i.isLocked).length === 0 || isSubmitting}
              className="w-full bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? "SENDING..." : <>SEND_ORDER <Send size={12} /></>}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}