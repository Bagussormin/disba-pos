import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, TrendingUp, Loader2, ShoppingBag, Search, Calendar
} from "lucide-react";

const SERVICE_RATE = 0.05; 
const TAX_RATE = 0.10;    

export default function KasirHome() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]); 
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null); 
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "NES_HOUSE_001" : "NES_HOUSE_001"; 

  const [lastIncomingOrder, setLastIncomingOrder] = useState<number>(0);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveViewMode, setArchiveViewMode] = useState<"SHIFT_LIST" | "BILL_LIST" | "ITEM_LIST">("SHIFT_LIST");
  const [pastShifts, setPastShifts] = useState<any[]>([]);
  const [archiveTransactions, setArchiveTransactions] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [selectedShiftLabel, setSelectedShiftLabel] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [shiftSummary, setShiftSummary] = useState({ 
    totalSales: 0, cashSales: 0, transferSales: 0, trxCount: 0 
  });

  const cashInputRef = useRef<HTMLInputElement>(null);
  const prevTableIdRef = useRef<any>(null);
  const dynamicAreas = Array.from(new Set(tables.map(t => (t.area || "AREA LAINNYA").toUpperCase())));

  useEffect(() => {
    if (!tenantId) return;
    checkActiveShift();
    fetchData();
    fetchBanks();

    const channel = supabase.channel(`pos-realtime-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, () => setLastIncomingOrder(Date.now()))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  useEffect(() => { if (activeOrder) fetchOrderItems(activeOrder.id); }, [lastIncomingOrder]);

  useEffect(() => {
    if (selectedTable) {
      const o = orders.find(order => order.table_id === selectedTable.id);
      setActiveOrder(o || null);
      if (prevTableIdRef.current !== selectedTable.id) {
        setDiscount(0); setPaidAmount(0); setPaymentMethod("CASH"); setSelectedBank(null);
        prevTableIdRef.current = selectedTable.id; setTimeout(() => cashInputRef.current?.focus(), 100);
      }
      if (o) fetchOrderItems(o.id); else setOrderItems([]);
    } else { prevTableIdRef.current = null; setActiveOrder(null); setOrderItems([]); }
  }, [tables, orders, selectedTable]);

  const fetchBanks = async () => {
    const { data } = await supabase.from("merchant_banks").select("*").eq("tenant_id", tenantId).eq("is_active", true);
    if (data) setBanks(data);
  };

  const fetchData = async () => {
    const [tRes, oRes] = await Promise.all([
      supabase.from("tables").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
      supabase.from("orders").select("*").eq("tenant_id", tenantId).eq("status", "open") 
    ]);
    if (tRes.data) setTables(tRes.data);
    if (oRes.data) setOrders(oRes.data);
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data: orderData } = await supabase.from("order_items").select(`*, menus(name, category)`).eq("order_id", orderId).eq("tenant_id", tenantId);
    if (orderData) {
      setOrderItems(orderData.map((item: any) => ({
        id: item.menu_id, 
        name: item.menus?.name || item.name || `MENU ID: ${item.menu_id}`, 
        qty: item.quantity || 1, 
        price: item.price_at_time || 0,
        category: item.menus?.category || "FOOD" 
      })));
    } else setOrderItems([]);
  };

  const fetchShiftHistory = async (mode: "BILL_LIST" | "ITEM_LIST") => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_time", { ascending: false })
      .limit(30);

    if (!error) {
      setPastShifts(data || []);
      setArchiveViewMode("SHIFT_LIST");
      setShowArchiveModal(true);
      (window as any).nextMode = mode;
    }
    setLoading(false);
  };

  const handleSelectShift = async (shift: any) => {
    setLoading(true);
    const targetMode = (window as any).nextMode || "BILL_LIST";
    
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("shift_id", shift.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (!error && transactions) {
      setSelectedShiftLabel(`${new Date(shift.start_time).toLocaleDateString('id-ID')} | ${shift.cashier_name}`);
      
      if (targetMode === "BILL_LIST") {
        setArchiveTransactions(transactions);
        setArchiveViewMode("BILL_LIST");
      } else {
        const summary: any = {};
        transactions.forEach((trx: any) => {
          const items = typeof trx.items === 'string' ? JSON.parse(trx.items) : trx.items;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const name = (item.name || "Unknown").toUpperCase();
              if (!summary[name]) summary[name] = 0;
              summary[name] += Number(item.qty || 0);
            });
          }
        });
        setItemSales(Object.keys(summary).map(name => ({ name, qty: summary[name] })).sort((a, b) => b.qty - a.qty));
        setArchiveViewMode("ITEM_LIST");
      }
    }
    setLoading(false);
  };

  const getSubtotal = () => orderItems.reduce((a, b) => a + (b.qty * b.price), 0);
  const safeDiscount = Math.min(discount, getSubtotal());
  const getNetSubtotal = () => getSubtotal() - safeDiscount;
  const getService = () => Math.round(getNetSubtotal() * SERVICE_RATE);
  const getTax = () => Math.round((getNetSubtotal() + getService()) * TAX_RATE);
  const getGrandTotal = () => getNetSubtotal() + getService() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  const processPayment = async () => {
    if (!activeOrder || !currentShift || loading) return;
    if (paymentMethod === "CASH" && paidAmount < getGrandTotal()) return;
    if (paymentMethod === "TRANSFER" && !selectedBank) return alert("Harap Pilih Bank!");

    setLoading(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ""); 
      const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
      
      const { count } = await supabase.from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .gte("created_at", startOfDay);
        
      const urutan = ((count || 0) + 1).toString().padStart(3, '0');
      const receiptNo = `INV/NES/${dateStr}/${urutan}`;
      
      // Ambil Setting Receipt & Tenant Data (Untuk Bridge IP)
      const { data: tenantConfig } = await supabase.from("receipt_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      // --- AKSI 1: SIMPAN TRANSAKSI ---
      const { data: newTrx, error: trxError } = await supabase.from("transactions").insert({
        shift_id: currentShift.id,
        tenant_id: tenantId, 
        receipt_no: receiptNo,
        total: getGrandTotal(),
        items: orderItems, 
        subtotal: getSubtotal(), 
        discount: safeDiscount, 
        service_charge: getService(), 
        pb1: getTax(), 
        table_name: selectedTable?.name, 
        payment_method: paymentMethod, 
        bank_details: paymentMethod === "TRANSFER" ? selectedBank : null,
        cashier: localStorage.getItem("username") || "KASIR"
      }).select().single();

      if (trxError) throw trxError;

      // --- AKSI 2: OTOMATIS POTONG STOK (via RPC) ---
      // Kita looping orderItems untuk memicu resep di database
      const stockReductions = orderItems.map(item => 
        supabase.rpc('reduce_stock_by_recipe', {
          p_menu_id: item.id, // item.id di sini adalah menu_id
          p_qty_sold: item.qty,
          p_tenant_id: tenantId,
          p_sales_order_id: receiptNo
        })
      );
      await Promise.all(stockReductions);

      // --- AKSI 3: UPDATE STATUS MEJA & ORDER ---
      await supabase.from("orders").update({ status: "completed" })
        .eq("id", activeOrder.id).eq("tenant_id", tenantId);
      await supabase.from("tables").update({ status: "available" })
        .eq("id", selectedTable.id).eq("tenant_id", tenantId);

      // --- AKSI 4: PRINTING ---
      const receiptData = {
        receipt_no: receiptNo, 
        tableName: selectedTable?.name || "Takeaway", 
        cashierName: localStorage.getItem("username") || "KASIR", 
        items: orderItems, 
        subtotal: getSubtotal(), 
        discount: safeDiscount, 
        serviceCharge: getService(), 
        tax: getTax(), 
        total: getGrandTotal(), 
        paymentMethod: paymentMethod, 
        paid: paidAmount, 
        change: getChange(), 
        storeName: tenantConfig?.store_name || "NES HOUSE", 
        address: tenantConfig?.address || "", 
        contact: tenantConfig?.contact || "", 
        footerText: tenantConfig?.footer_text || "Terima Kasih"
      };
      
      try { 
        // Menggunakan library printer yang sudah ada
        await executePrint(receiptData); 
      } catch (err) { 
        console.error("Gagal ke Printer:", err); 
      }

      // Reset State
      setOrderItems([]); setPaidAmount(0); setShowPreviewModal(false); setSelectedTable(null); fetchData();
      alert("✅ Transaksi Berhasil & Stok Terupdate!");

    } catch (e: any) { 
      console.error(e);
      alert("❌ Gagal: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const checkActiveShift = async () => {
    const { data } = await supabase.from("shifts").select("*").eq("status", "open").eq("tenant_id", tenantId).maybeSingle();
    if (data) { setCurrentShift(data); setShowStartShiftModal(false); } else { setShowStartShiftModal(true); }
  };

  const handleStartShift = async () => {
    const { data, error } = await supabase.from("shifts").insert({
      tenant_id: tenantId, cashier_name: localStorage.getItem("username") || "KASIR UTAMA", starting_cash: Number(startCash), status: 'open', start_time: new Date().toISOString()
    }).select().single();
    if (!error && data) { setCurrentShift(data); setShowStartShiftModal(false); }
  };

  const openCloseShiftModal = async () => {
    if (!currentShift) return;
    setLoading(true);
    const { data: trx } = await supabase.from("transactions").select("total, payment_method").eq("shift_id", currentShift.id).eq("tenant_id", tenantId);
    if (trx) {
      const total = trx.reduce((sum, t) => sum + Number(t.total), 0);
      const cash = trx.filter(t => t.payment_method === "CASH").reduce((sum, t) => sum + Number(t.total), 0);
      const transfer = trx.filter(t => t.payment_method === "TRANSFER").reduce((sum, t) => sum + Number(t.total), 0);
      setShiftSummary({ totalSales: total, cashSales: cash, transferSales: transfer, trxCount: trx.length });
    }
    setLoading(false); setShowCloseShiftModal(true);
  };

  // 🔥 UPDATE LOGIKA SHIFT CLOSE (TIDAK LAGI HASIL 0)
  const handlePrintShiftClosing = async (selisih: number) => {
    const { data: printSettings } = await supabase.from("receipt_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
    
    // Tarik data terbaru dari DB untuk menjamin angka tidak 0
    const { data: trxList } = await supabase
      .from("transactions")
      .select("*")
      .eq("shift_id", currentShift.id)
      .eq("tenant_id", tenantId);

    const summaryData = trxList || [];
    const subtotal = summaryData.reduce((a, b) => a + (Number(b.subtotal) || 0), 0);
    const diskonBill = summaryData.reduce((a, b) => a + (Number(b.discount) || 0), 0);
    const serviceCharge = summaryData.reduce((a, b) => a + (Number(b.service_charge) || 0), 0);
    const totalPenjualan = summaryData.reduce((a, b) => a + (Number(b.total) || 0), 0);
    
    const cashSalesOnly = summaryData
      .filter(t => t.payment_method === "CASH")
      .reduce((a, b) => a + (Number(b.total) || 0), 0);
    
    const kasDiharapkan = Number(currentShift?.starting_cash || 0) + cashSalesOnly;

    const reportData = {
        storeName: printSettings?.store_name || "NES HOUSE COLD BREW",
        cashierName: currentShift.cashier_name || "KASIR",
        closingData: {
          startTime: new Date(currentShift.start_time).toLocaleString('id-ID'),
          endTime: new Date().toLocaleString('id-ID'),
          totalPenjualan,
          subtotal,
          diskonBill,
          service: serviceCharge,
          pembulatan: 0,
          kasDiharapkan,
          awalLaci: Number(currentShift?.starting_cash || 0),
          kasPenjualan: cashSalesOnly,
          kasAktual: Number(endingCash),
          kasSelisih: selisih,
          totalDiharapkan: totalPenjualan,
          totalAktual: (totalPenjualan - cashSalesOnly) + Number(endingCash),
          totalSelisih: selisih
        }
    };

    try { 
      // Panggil jalur khusus settlement di server.js
      await fetch("http://localhost:4000/print-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });
    } catch (e) { console.error("Gagal print closing:", e); }
  };

  const handleCloseShift = async () => {
    if (endingCash === 0 && !window.confirm("Uang fisik nol? Yakin?")) return;
    setLoading(true);
    try {
      const expectedCash = Number(currentShift?.starting_cash || 0) + shiftSummary.cashSales;
      const selisih = Number(endingCash) - expectedCash;
      const { error } = await supabase.from("shifts").update({
        status: 'closed', end_time: new Date().toISOString(), total_sales: Number(shiftSummary.totalSales), cash_sales: Number(shiftSummary.cashSales), transfer_sales: Number(shiftSummary.transferSales), expected_ending_cash: expectedCash, actual_ending_cash: Number(endingCash), difference: selisih
      }).eq("id", currentShift.id).eq("tenant_id", tenantId);
      if (error) throw error; 
      await handlePrintShiftClosing(selisih);
      setShowCloseShiftModal(false);
      localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/"); 
    } catch (e: any) { alert("❌ Gagal Tutup Shift: " + e.message); } finally { setLoading(false); }
  };

  const handleLogOut = () => { if (window.confirm("Keluar dari Terminal Kasir?")) { localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/"); } };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white p-1 uppercase italic font-sans flex flex-col overflow-hidden">
      <header className="flex justify-between items-center bg-black/60 border-b border-white/5 p-2 mb-1 shadow-2xl">
        <h1 className="text-[11px] font-black tracking-tighter">DISBA<span className="text-blue-500">_POS_CONTROL</span></h1>
        <div className="flex gap-1.5">
          <button onClick={() => fetchShiftHistory("BILL_LIST")} className="h-7 px-3 bg-white/5 rounded-md border border-white/10 text-[8px] font-black active:scale-95 flex items-center gap-1 hover:bg-blue-600/20 hover:text-blue-500 transition-all"><FileText size={10}/> ARCHIVE</button>
          <button onClick={() => fetchShiftHistory("ITEM_LIST")} className="h-7 px-3 bg-blue-600/10 rounded-md border border-blue-500/20 text-[8px] font-black active:scale-95 flex items-center gap-1 hover:bg-emerald-600/20 hover:text-emerald-500 transition-all"><BarChart3 size={10}/> REKAP</button>
          <button onClick={openCloseShiftModal} className="h-7 px-3 bg-orange-600/10 rounded-md border border-orange-500/20 text-[8px] font-black active:scale-95 flex items-center gap-1"><Lock size={10}/> SHIFT</button>
          <button onClick={handleLogOut} className="h-7 w-7 flex items-center justify-center bg-red-500/10 rounded-md border border-red-500/20 text-red-500"><LogOut size={12}/></button>
        </div>
      </header>

      <div className="flex-1 flex gap-1 min-h-0 overflow-hidden">
        {/* AREA MEJA */}
        <div className="w-48 bg-black/20 rounded-xl border border-white/5 p-2 overflow-y-auto no-scrollbar">
          {dynamicAreas.map(area => (
            <div key={area} className="mb-4">
              <p className="text-[7px] font-black text-gray-700 mb-2 tracking-[0.2em] text-center border-b border-white/5 pb-1 uppercase"><MapPin size={8} className="inline mr-1"/> {area}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {tables.filter(t => (t.area || "AREA LAINNYA").toUpperCase() === area).map(t => {
                   const hasOrder = orders.some(o => o.table_id === t.id); 
                   return (
                    <button key={t.id} onClick={() => setSelectedTable(t)} className={`h-12 rounded-lg border-2 transition-all text-[10px] font-black flex flex-col items-center justify-center ${selectedTable?.id === t.id ? 'border-blue-500 bg-blue-600/20 shadow-lg' : hasOrder ? 'border-orange-500 bg-orange-500/10 animate-pulse text-orange-400' : t.status === 'payment' || t.status === 'closed' ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-white/5 bg-white/[0.02] opacity-40'}`}>
                      {(t.status === 'payment' || t.status === 'closed') && <Lock size={8} className="mb-1" />}
                      {t.name}
                    </button>
                   );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ORDER LIST */}
        <div className="flex-1 bg-black/40 rounded-xl border border-white/5 flex flex-col overflow-hidden">
          {activeOrder ? (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-3"><Receipt size={16} className="text-blue-500"/><h2 className="text-sm font-black italic uppercase tracking-tighter text-white">BILLING_<span className="text-blue-500">{selectedTable?.name}</span></h2></div>
                <button onClick={() => setSelectedTable(null)} className="text-gray-600 hover:text-white transition-all"><X size={18}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                <table className="w-full text-left">
                  <thead className="text-[9px] font-black text-gray-600 border-b border-white/5 sticky top-0 bg-[#020617] z-10 uppercase italic">
                    <tr><th className="pb-3">PRODUCT_NAME</th><th className="pb-3 text-center">QTY</th><th className="pb-3 text-right">UNIT_PRICE</th><th className="pb-3 text-right">TOTAL</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-4"><span className="text-[11px] font-black text-white/90 uppercase tracking-tight">{item.name}</span></td>
                        <td className="py-4 text-center"><span className="text-[11px] font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{item.qty}X</span></td>
                        <td className="py-4 text-right text-[10px] font-mono text-gray-500">{item.price.toLocaleString('id-ID')}</td>
                        <td className="py-4 text-right text-[11px] font-mono font-black italic text-white">{(item.qty * item.price).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-5 grayscale">
              <ShoppingBag size={100} strokeWidth={1}/><p className="text-xs font-black mt-4 tracking-[1em] uppercase italic">Ready_Station</p>
            </div>
          )}
        </div>

        {/* KOLOM 3: PAYMENT */}
        <div className="w-[320px] bg-black/60 rounded-xl border border-white/5 flex flex-col overflow-y-auto no-scrollbar p-4 shadow-2xl backdrop-blur-3xl">
          {activeOrder ? (
            <div className="flex flex-col min-h-full">
              <h3 className="text-[9px] font-black text-gray-600 tracking-[0.3em] mb-4 border-b border-white/10 pb-2 flex items-center gap-2 uppercase italic"><CreditCard size={12}/> Checkout_Panel</h3>
              <div className="space-y-2 mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-500"><span>SUBTOTAL</span><span className="text-white font-mono">{getSubtotal().toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between items-center text-[10px] font-black text-blue-500 italic"><span>DISC_VALUE</span><input type="number" className="w-20 bg-blue-500/10 border border-blue-500/30 rounded px-1.5 py-0.5 text-right text-blue-400 outline-none font-black" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
                <div className="flex justify-between items-center text-[9px] font-black text-gray-500 opacity-50"><span>SERVICE_5%</span><span className="text-white font-mono">{getService().toLocaleString('id-ID')}</span></div>
              </div>
              <div className="mt-auto border-t-2 border-dashed border-white/10 pt-4">
                <p className="text-[9px] font-black text-blue-500 italic tracking-widest mb-1">GRAND_TOTAL_DUE</p>
                <p className="text-3xl font-black italic tracking-tighter text-white mb-6 border-b-2 border-white pb-2 leading-none">RP {getGrandTotal().toLocaleString('id-ID')}</p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); setPaidAmount(0); }} className={`py-3 rounded-lg text-[10px] font-black border transition-all flex items-center justify-center gap-2 ${paymentMethod === 'CASH' ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-30'}`}><Banknote size={14}/> CASH</button>
                  <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`py-3 rounded-lg text-[10px] font-black border transition-all flex items-center justify-center gap-2 ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-30'}`}><CreditCard size={14}/> BANK</button>
                </div>
                {paymentMethod === "TRANSFER" ? (
                  <div className="mb-4 space-y-1.5"><p className="text-[8px] font-black text-purple-400 italic px-1 uppercase">Pilih_Rekening:</p><div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">{banks.map(b => (<button key={b.id} onClick={() => setSelectedBank(b)} className={`w-full p-2.5 rounded-lg border text-left transition-all relative ${selectedBank?.id === b.id ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/10 opacity-40'}`}><p className="text-[9px] font-black text-white">{b.bank_name}</p><p className="text-[11px] font-mono font-bold text-white/80">{b.account_number}</p>{selectedBank?.id === b.id && <CheckCircle2 size={12} className="absolute top-2 right-2 text-white" />}</button>))}</div></div>
                ) : (
                  <div className="mb-4"><p className="text-[8px] font-black text-blue-500 italic mb-1 uppercase tracking-tighter">Amount_Received_:</p><input ref={cashInputRef} type="number" className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl py-3 px-3 text-2xl font-black text-blue-400 outline-none focus:border-blue-400 text-center" placeholder="0" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />{paidAmount >= getGrandTotal() && (<div className="mt-2 flex justify-between items-center bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20"><span className="text-[9px] font-black text-emerald-500 italic">KEMBALIAN:</span><span className="text-lg font-black text-emerald-400 font-mono">+{getChange().toLocaleString('id-ID')}</span></div>)}</div>
                )}
                <button onClick={() => setShowPreviewModal(true)} disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} className={`w-full py-4 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 transition-all shadow-xl uppercase tracking-widest ${(paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : !!selectedBank) ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed'}`}><Printer size={16}/> PREVIEW_BILL</button>
              </div>
            </div>
          ) : (<div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-20"><CheckCircle2 size={32} className="mb-4 text-gray-500"/><p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-relaxed italic">Select_Table_to_Pay</p></div>)}
        </div>
      </div>

      {/* MODAL PENUTUPAN */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[8000] p-4 backdrop-blur-md">
          <div className="bg-[#020617] border border-white/10 w-full max-w-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                {archiveViewMode !== "SHIFT_LIST" && (
                  <button onClick={() => setArchiveViewMode("SHIFT_LIST")} className="p-2 hover:bg-white/10 rounded-lg text-blue-500"><ChevronRight className="rotate-180" size={20}/></button>
                )}
                <h3 className="text-xs font-black italic text-white uppercase tracking-widest">
                  {archiveViewMode === "SHIFT_LIST" ? "Select_Session" : archiveViewMode === "BILL_LIST" ? "Bills" : "Products"}
                </h3>
              </div>
              <button onClick={() => setShowArchiveModal(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              {archiveViewMode === "SHIFT_LIST" ? (
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-white/5 text-[10px] font-bold">
                    {pastShifts.map((s) => (
                      <tr key={s.id} onClick={() => handleSelectShift(s)} className="hover:bg-blue-600/5 cursor-pointer">
                        <td className="p-5 text-gray-400">{new Date(s.start_time).toLocaleString('id-ID')}</td>
                        <td className="p-5 text-white">{s.cashier_name}</td>
                        <td className="p-5 text-right text-emerald-500">Rp {Number(s.total_sales || 0).toLocaleString('id-ID')}</td>
                        <td className="p-5 text-center"><ChevronRight size={16}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : archiveViewMode === "BILL_LIST" ? (
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-white/5 text-[10px] font-bold">
                    {archiveTransactions.map((trx) => (
                      <tr key={trx.id}>
                        <td className="p-5 text-gray-400">{new Date(trx.created_at).toLocaleTimeString()}</td>
                        <td className="p-5 text-blue-400">{trx.receipt_no}</td>
                        <td className="p-5 text-right">Rp {trx.total.toLocaleString()}</td>
                        <td className="p-5 text-center">
                          <button onClick={async () => executePrint({...trx, items: typeof trx.items === 'string' ? JSON.parse(trx.items) : trx.items, reprint: true})} className="p-2 bg-blue-600/20 text-blue-500 rounded-lg"><Printer size={14}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-5 space-y-2">
                   {itemSales.map((item, idx) => (
                     <div key={idx} className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                       <span className="text-[10px] text-white uppercase">{item.name}</span>
                       <span className="text-sm text-blue-400 font-black">{item.qty}X</span>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* START SHIFT MODAL */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[7000] p-4">
          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[32px] w-full max-w-sm">
            <Wallet className="text-blue-500 mx-auto mb-4" size={50} />
            <h2 className="text-xl font-black italic mb-2 uppercase">Open_Shift</h2>
            <input type="number" autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl text-white outline-none mb-6" placeholder="0" onChange={(e) => setStartCash(Number(e.target.value))} />
            <button onClick={handleStartShift} className="w-full py-5 bg-blue-600 rounded-[20px] font-black uppercase">Buka_Terminal</button>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[7000] p-4">
          <div className="bg-[#020617] p-8 rounded-[32px] border border-orange-500/20 w-full max-w-sm text-center">
            <AlertTriangle className="text-orange-500 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-black italic text-white uppercase mb-8">Shift_Closing</h2>
            <div className="space-y-3 mb-8 text-left text-[11px] font-black uppercase">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[7px] text-gray-500">Gross_Sales</p><p className="text-2xl">Rp {shiftSummary.totalSales.toLocaleString()}</p></div>
              <div>
                <p className="text-[7px] text-orange-500 mb-2">Actual_Cash_In_Drawer</p>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-3xl text-orange-400 outline-none" placeholder="0" onChange={(e) => setEndingCash(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2"><button onClick={() => setShowCloseShiftModal(false)} className="flex-1 py-5 bg-white/5 rounded-[20px] uppercase">Batal</button><button onClick={handleCloseShift} className="flex-[2] py-5 bg-orange-600 rounded-[20px] uppercase font-black">Akhiri_Shift</button></div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[6000] p-4">
          <div className="bg-white text-black p-6 rounded-2xl w-full max-w-[320px] font-mono shadow-2xl relative uppercase italic font-bold">
            <h3 className="font-black text-xl text-center border-b-2 border-black border-double pb-2 mb-4">DISBA_STATION</h3>
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between"><span>Meja:</span> <span>{selectedTable?.name}</span></div>
              <div className="flex justify-between"><span>Bayar:</span> <span className="text-blue-600">{paymentMethod}</span></div>
              <div className="border-b border-black border-dashed my-2"></div>
              <div className="max-h-40 overflow-y-auto no-scrollbar">{orderItems.map((item, i) => (<div key={i} className="flex justify-between py-0.5"><span>{item.qty} {item.name}</span><span>{(item.qty * item.price).toLocaleString()}</span></div>))}</div>
              <div className="border-b border-black border-dashed my-2"></div>
              <div className="flex justify-between font-black text-lg pt-2 border-t-2 border-black mt-1"><span>TOTAL:</span><span>{getGrandTotal().toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-black text-[9px]">Batal</button>
              <button onClick={processPayment} disabled={loading} className="flex-[2] py-4 bg-black text-white rounded-xl font-black text-[9px] flex items-center justify-center gap-2">{loading ? "SAVING..." : <><Printer size={16}/> Save_&_Print</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
