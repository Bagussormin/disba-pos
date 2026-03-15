import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, TrendingUp, Loader2, ShoppingBag
} from "lucide-react";

// --- KONFIGURASI FINANSIAL DINAMIS ---
const SERVICE_RATE = 0.05; // 5% Service Charge
const TAX_RATE = 0.05;    // 5% Pajak (Sesuai diskusi HPP kita)

export default function KasirHome() {
  // --- STATE DASAR ---
  const [tables, setTables] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DISBA_OUTLET_001" : "DISBA_OUTLET_001"; 

  // --- TRIGGER & MODALS ---
  const [lastIncomingOrder, setLastIncomingOrder] = useState<number>(0);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showItemReportModal, setShowItemReportModal] = useState(false);

  // --- STATE TRANSAKSI ---
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [loading, setLoading] = useState(false);
  const [itemSales, setItemSales] = useState<any[]>([]);
  
  const [shiftSummary, setShiftSummary] = useState({ 
    totalSales: 0, 
    cashSales: 0, 
    transferSales: 0, 
    trxCount: 0 
  });

  const cashInputRef = useRef<HTMLInputElement>(null);
  const dynamicAreas = Array.from(new Set(tables.map(t => (t.area || "REGULER").toUpperCase())));

  // --- AUTO PRINT DAPUR/BAR (SINKRON DENGAN ORDERS) ---
  const handleAutoPrintDapur = async (newOrderItem: any) => {
    try {
      const { data: order } = await supabase.from("orders").select("tables(name)").eq("id", newOrderItem.order_id).single();
      const { data: menu } = await supabase.from("menus").select("name, category").eq("id", newOrderItem.menu_id).single();

      if (order && menu) {
        const targetIp = typeof window !== "undefined" ? localStorage.getItem("printer_ip") || "127.0.0.1" : "127.0.0.1";
        await fetch(`http://${targetIp}:4000/print-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_name: (order as any).tables?.name || "QR/WAITER",
            items: [{ name: menu.name, qty: newOrderItem.quantity, category: menu.category.toUpperCase() }]
          })
        });
      }
    } catch (error) { console.error("❌ Printer Offline"); }
  };

  // --- INITIAL LOAD & REALTIME RADAR ---
  useEffect(() => {
    checkActiveShift();
    fetchData();
    fetchBanks();

    const channel = supabase.channel(`kasir-universal-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
        handleAutoPrintDapur(payload.new);
        setLastIncomingOrder(Date.now());
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  useEffect(() => {
    if (selectedTable) {
      const order = activeOrders.find(o => o.table_id === selectedTable.id);
      setCurrentOrder(order || null);
      if (order) fetchOrderItems(order.id);
      else setOrderItems([]);
    }
  }, [tables, activeOrders, selectedTable, lastIncomingOrder]);

  // --- FETCHERS ---
  const fetchData = async () => {
    const [tRes, oRes] = await Promise.all([
      supabase.from("tables").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
      supabase.from("orders").select("*").eq("tenant_id", tenantId).neq("status", "completed")
    ]);
    if (tRes.data) setTables(tRes.data);
    if (oRes.data) setActiveOrders(oRes.data);
  };

  const fetchBanks = async () => {
    const { data } = await supabase.from("merchant_banks").select("*").eq("is_active", true);
    if (data) setBanks(data);
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase.from("order_items").select(`*, menus(name)`).eq("order_id", orderId);
    if (data) {
      setOrderItems(data.map((item: any) => ({
        id: item.menu_id,
        name: item.menus?.name || "Menu",
        qty: item.quantity,
        price: item.price_at_time
      })));
    }
  };

  // --- CALCULATIONS ---
  const getSubtotal = () => orderItems.reduce((a, b) => a + (b.qty * b.price), 0);
  const safeDiscount = Math.min(discount, getSubtotal());
  const netSubtotal = getSubtotal() - safeDiscount;
  const getService = () => Math.round(netSubtotal * SERVICE_RATE);
  const getTax = () => Math.round((netSubtotal + getService()) * TAX_RATE);
  const getGrandTotal = () => netSubtotal + getService() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  // --- PAYMENT PROCESSOR ---
  const processPayment = async () => {
    if (!currentOrder || !currentShift || loading) return;
    setLoading(true);
    try {
      const receiptNo = `INV/${tenantId.split('_')[0]}/${Date.now().toString().slice(-6)}`;

      // 1. Simpan Transaksi
      await supabase.from("transactions").insert({
        shift_id: currentShift.id,
        tenant_id: tenantId, 
        receipt_no: receiptNo,
        subtotal: getSubtotal(),
        discount: safeDiscount,
        service_charge: getService(),
        pb1: getTax(),
        total: getGrandTotal(),
        items: orderItems,
        payment_method: paymentMethod,
        table_name: selectedTable?.name,
        bank_details: paymentMethod === "TRANSFER" ? selectedBank : null
      });

      // 2. Update Status Order & Meja
      await supabase.from("orders").update({ status: "completed", total_price: getGrandTotal() }).eq("id", currentOrder.id);
      await supabase.from("tables").update({ status: "available" }).eq("id", selectedTable.id);

      // 3. Eksekusi Print
      await executePrint({
        orderId: receiptNo,
        tableName: selectedTable?.name,
        items: orderItems,
        subtotal: getSubtotal(),
        discount: safeDiscount,
        tax: getTax(),
        serviceCharge: getService(),
        total: getGrandTotal(),
        paid: paidAmount,
        change: getChange(),
        paymentMethod: paymentMethod,
        storeName: "DISBA POS STATION"
      });

      setSelectedTable(null);
      setShowPreviewModal(false);
      fetchData();
    } catch (e) { alert("❌ Gagal Simpan Transaksi"); }
    finally { setLoading(false); }
  };

  // --- SHIFT LOGIC (KEBANGGAAN KAPTEN) ---
  const checkActiveShift = async () => {
    const { data } = await supabase.from("shifts").select("*").eq("status", "open").eq("tenant_id", tenantId).maybeSingle();
    if (data) setCurrentShift(data);
    else setShowStartShiftModal(true);
  };

  const handleStartShift = async () => {
    const { data } = await supabase.from("shifts").insert({
      tenant_id: tenantId,
      cashier_name: localStorage.getItem("username") || "KASIR", 
      starting_cash: Number(startCash), 
      status: 'open',
      start_time: new Date().toISOString()
    }).select().single();
    if (data) { setCurrentShift(data); setShowStartShiftModal(false); }
  };

  const openCloseShiftModal = async () => {
    if (!currentShift) return;
    setLoading(true);
    const { data: trx } = await supabase.from("transactions").select("total, payment_method").eq("shift_id", currentShift.id);
    if (trx) {
      const total = trx.reduce((sum, t) => sum + Number(t.total), 0);
      const cash = trx.filter(t => t.payment_method === "CASH").reduce((sum, t) => sum + Number(t.total), 0);
      const transfer = trx.filter(t => t.payment_method === "TRANSFER").reduce((sum, t) => sum + Number(t.total), 0);
      setShiftSummary({ totalSales: total, cashSales: cash, transferSales: transfer, trxCount: trx.length });
    }
    setLoading(false);
    setShowCloseShiftModal(true);
  };

  const handleCloseShift = async () => {
    setLoading(true);
    await supabase.from("shifts").update({
      status: 'closed', 
      end_time: new Date().toISOString(),
      total_sales: shiftSummary.totalSales, 
      actual_ending_cash: Number(endingCash)
    }).eq("id", currentShift.id);
    window.location.reload();
  };

  const fetchItemSales = async () => {
    if (!currentShift) return;
    setLoading(true);
    const { data } = await supabase.from("transactions").select("items").eq("shift_id", currentShift.id);
    const summary: any = {};
    if (data) {
      data.forEach((trx: any) => {
        const items = Array.isArray(trx.items) ? trx.items : JSON.parse(trx.items || "[]");
        items.forEach((item: any) => {
          summary[item.name] = { 
            qty: (summary[item.name]?.qty || 0) + Number(item.qty), 
            total: (summary[item.name]?.total || 0) + (Number(item.qty) * Number(item.price)) 
          };
        });
      });
      setItemSales(Object.keys(summary).map(name => ({ name, ...summary[name] })).sort((a,b) => b.qty - a.qty));
    }
    setLoading(false);
    setShowItemReportModal(true);
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white p-2 uppercase italic font-sans flex flex-col overflow-hidden">
      
      {/* HEADER: KENDALI TOTAL */}
      <header className="flex justify-between items-center bg-black/40 border border-white/5 p-2 rounded-xl mb-2">
        <h1 className="text-base font-black tracking-tighter italic px-2 underline decoration-blue-500 underline-offset-4">DISBA<span className="text-blue-500">_COMMANDER</span></h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchItemSales} className="bg-blue-600/20 h-8 px-3 rounded-lg border border-blue-500/40 text-blue-400 text-[8px] font-black flex items-center gap-2 active:scale-95"><BarChart3 size={12}/> REKAP_ITEM</button>
          <button onClick={openCloseShiftModal} className="bg-orange-600/10 h-8 px-3 rounded-lg border border-orange-500/20 text-orange-500 text-[8px] font-black active:scale-95">TUTUP_SHIFT</button>
          <button onClick={() => window.location.reload()} className="bg-red-500/10 h-8 w-8 flex items-center justify-center rounded-lg border border-red-500/20 text-red-500"><LogOut size={14}/></button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* LEFT: AREA MEJA (Dinamis & Real-time) */}
        <div className="col-span-4 bg-black/20 rounded-2xl border border-white/5 p-3 overflow-y-auto no-scrollbar">
          {dynamicAreas.map(area => (
            <div key={area} className="mb-6">
              <p className="text-[8px] font-black text-gray-600 mb-3 flex items-center gap-2 tracking-widest"><MapPin size={10}/> {area}</p>
              <div className="grid grid-cols-3 gap-2">
                {tables.filter(t => (t.area || "REGULER").toUpperCase() === area).map(t => {
                   const hasOrder = activeOrders.some(o => o.table_id === t.id);
                   return (
                    <button key={t.id} onClick={() => setSelectedTable(t)}
                      className={`aspect-square rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all ${
                        selectedTable?.id === t.id ? 'border-blue-500 bg-blue-600/20 shadow-lg' : 
                        hasOrder ? 'border-orange-500 bg-orange-500/10 animate-pulse' : 
                        'border-white/5 bg-white/[0.02] opacity-30'
                      }`}
                    >
                      <span className="text-[10px] font-black">{t.name}</span>
                      {hasOrder && <span className="text-[6px] mt-1 text-orange-400 font-black">WAITING_PAY</span>}
                    </button>
                   );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: TERMINAL TRANSAKSI */}
        <div className="col-span-8 bg-black/40 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
          {currentOrder ? (
            <>
              <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h2 className="text-xl font-black italic">BILLING_<span className="text-blue-500">{selectedTable?.name}</span></h2>
                <div className="flex items-center gap-2 opacity-30"><ShoppingBag size={14}/> <span className="text-[8px] font-black">READY_TO_SETTLE</span></div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 no-scrollbar">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/[0.02] py-3 px-4 rounded-2xl border border-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 w-7 h-7 flex items-center justify-center rounded-lg border border-blue-500/20">{item.qty}X</span>
                      <span className="text-[11px] font-black text-white/90">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-black italic">{(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* PAYMENT FOOTER */}
              <div className="p-5 bg-[#030712] border-t border-white/5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
                <div className="grid grid-cols-2 gap-3 mb-5">
                   <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); }} className={`py-4 rounded-2xl text-[9px] font-black border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'CASH' ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-40'}`}><Banknote size={16}/> TUNAI_CASH</button>
                   <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`py-4 rounded-2xl text-[9px] font-black border flex items-center justify-center gap-2 transition-all ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-40'}`}><CreditCard size={16}/> TRANSFER_BANK</button>
                </div>

                {paymentMethod === "TRANSFER" && (
                  <div className="mb-5 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[8px] font-black text-purple-400 mb-3 px-1 italic">PILIH_REKENING_TUJUAN:</p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                      {banks.map(bank => (
                        <button key={bank.id} onClick={() => setSelectedBank(bank)} className={`flex-shrink-0 p-4 rounded-2xl border min-w-[150px] transition-all relative ${selectedBank?.id === bank.id ? 'border-purple-400 bg-purple-500/10' : 'border-white/5 bg-white/5 opacity-50'}`}>
                          <p className="text-[9px] font-black text-white uppercase mb-1">{bank.bank_name}</p>
                          <p className="text-[11px] font-mono font-black text-purple-400">{bank.account_number}</p>
                          {selectedBank?.id === bank.id && <CheckCircle2 size={12} className="absolute top-2 right-2 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mb-6 text-center">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[7px] font-black text-gray-600 mb-1">SUBTOTAL</p><p className="font-bold font-mono text-xs">{getSubtotal().toLocaleString()}</p></div>
                  <div className="bg-blue-600/5 p-3 rounded-2xl border border-blue-500/20"><p className="text-[7px] font-black text-blue-500 mb-1">DISC</p><input type="number" className="w-full bg-transparent font-bold font-mono text-xs outline-none text-center text-blue-400" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[7px] font-black text-gray-600 mb-1">SVC_5%</p><p className="font-bold font-mono text-xs">{getService().toLocaleString()}</p></div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[7px] font-black text-gray-600 mb-1">TAX_5%</p><p className="font-bold font-mono text-xs">{getTax().toLocaleString()}</p></div>
                </div>

                <div className="flex justify-between items-end mb-6">
                  <div><p className="text-[9px] font-black text-blue-500 tracking-widest uppercase italic mb-1">Grand_Total_Due</p><p className="text-5xl font-black italic tracking-tighter">RP {getGrandTotal().toLocaleString()}</p></div>
                  {paymentMethod === "CASH" && paidAmount >= getGrandTotal() && (
                    <div className="text-right"><p className="text-[8px] font-black text-green-500 italic">KEMBALIAN</p><p className="text-2xl font-black font-mono text-green-400">+{getChange().toLocaleString()}</p></div>
                  )}
                </div>

                <div className="flex gap-2">
                  {paymentMethod === "CASH" && (
                    <input ref={cashInputRef} type="number" className="flex-[2] bg-white/5 border-2 border-white/10 rounded-[1.5rem] py-5 px-6 text-3xl font-black text-blue-400 outline-none focus:border-blue-500 shadow-inner" placeholder="BAYAR..." value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                  )}
                  <button 
                    onClick={() => setShowPreviewModal(true)} 
                    disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} 
                    className={`flex-1 rounded-[1.5rem] font-black text-[11px] flex items-center justify-center gap-2 transition-all shadow-2xl ${
                      (paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : !!selectedBank) ? 'bg-blue-600 text-white active:scale-95' : 'bg-gray-800 text-gray-600 opacity-50'
                    }`}
                  >
                    <Printer size={20} /><span>Settle_Bill</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10">
              <Receipt size={120} strokeWidth={1} />
              <p className="text-2xl font-black mt-6 tracking-[0.5em] italic">READY_STATION</p>
            </div>
          )}
        </div>
      </div>

      {/* --- SEMUA MODAL FITUR LAMA (TIDAK ADA YANG HILANG) --- */}
      
      {/* SHIFT START */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[7000] p-4">
          <div className="text-center p-10 bg-white/5 border border-white/10 rounded-[3rem] w-full max-w-sm shadow-2xl">
            <Wallet className="text-blue-500 mx-auto mb-6" size={60} />
            <h2 className="text-2xl font-black italic mb-2 uppercase">Open_Shift_</h2>
            <p className="text-[9px] font-black text-gray-600 mb-8 tracking-widest uppercase">INPUT MODAL AWAL TUNAI (CASH)</p>
            <input type="number" autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl font-black mb-8 outline-none focus:border-blue-500" placeholder="0" onChange={(e) => setStartCash(Number(e.target.value))} />
            <button onClick={handleStartShift} className="w-full py-5 bg-blue-600 rounded-[1.5rem] font-black text-xs uppercase shadow-lg shadow-blue-500/20">Buka Terminal Kasir</button>
          </div>
        </div>
      )}

      {/* SHIFT CLOSING */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[7000] p-4 backdrop-blur-md">
          <div className="bg-[#020617] p-8 rounded-[2.5rem] border border-orange-500/20 w-full max-w-sm text-center shadow-2xl">
            <AlertTriangle className="text-orange-500 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-black text-white uppercase mb-8 italic">End_of_Shift_Report</h2>
            <div className="space-y-3 mb-8 text-left">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[8px] font-black text-gray-500 uppercase mb-1">Total_Sales</p>
                <p className="text-2xl font-black text-white italic">Rp {shiftSummary.totalSales.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-blue-600/10 p-4 rounded-2xl"><p className="text-blue-400 mb-1">CASH</p><p className="font-black">Rp {shiftSummary.cashSales.toLocaleString()}</p></div>
                <div className="bg-purple-600/10 p-4 rounded-2xl"><p className="text-purple-400 mb-1">BANK</p><p className="font-black">Rp {shiftSummary.transferSales.toLocaleString()}</p></div>
              </div>
              <div>
                <p className="text-[8px] font-black text-orange-500 mb-2 italic">Actual_Cash_in_Drawer</p>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-3xl font-black text-orange-400 outline-none" placeholder="0" onChange={(e) => setEndingCash(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCloseShiftModal(false)} className="flex-1 py-5 bg-white/5 rounded-2xl font-black text-[10px]">BATAL</button>
              <button onClick={handleCloseShift} className="flex-[2] py-5 bg-orange-600 rounded-2xl font-black text-[10px]">AKHIRI_SHIFT</button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM RECAP MODAL */}
      {showItemReportModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[8000] p-4 backdrop-blur-md">
          <div className="bg-[#020617] border border-white/10 w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-sm font-black italic text-blue-500 tracking-[0.2em]">ITEM_SALES_RECAP</h3>
              <button onClick={() => setShowItemReportModal(false)} className="p-2 text-gray-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black text-gray-500 italic uppercase">
                  <tr><th className="pb-4">Product_Name</th><th className="pb-4 text-center">Qty</th><th className="pb-4 text-right">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {itemSales.map((item, i) => (
                    <tr key={i} className="text-white">
                      <td className="py-4 text-[10px] font-black uppercase">{item.name}</td>
                      <td className="py-4 text-center font-mono text-blue-400 font-bold">{item.qty}</td>
                      <td className="py-4 text-right font-mono text-[10px]">Rp {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STRUK PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9000] p-4 backdrop-blur-md">
          <div className="bg-white text-black p-8 rounded-[2rem] w-full max-w-[340px] font-mono shadow-2xl relative uppercase italic font-bold">
            <h3 className="font-black text-xl text-center border-b-4 border-black border-double pb-4 mb-6 tracking-tighter italic">DISBA_STATION_</h3>
            <div className="text-[11px] space-y-1.5">
              <div className="flex justify-between"><span>MEJA:</span> <span>{selectedTable?.name}</span></div>
              <div className="flex justify-between"><span>METHOD:</span> <span className="text-blue-600">{paymentMethod}</span></div>
              <div className="border-b border-black border-dashed my-3"></div>
              {orderItems.map((item, i) => (<div key={i} className="flex justify-between"><span>{item.qty} {item.name}</span><span>{(item.qty * item.price).toLocaleString()}</span></div>))}
              <div className="border-b-2 border-black mt-4 pt-2 flex justify-between font-black text-lg"><span>TOTAL:</span><span>{getGrandTotal().toLocaleString()}</span></div>
              {paymentMethod === "CASH" && (
                <div className="mt-3 pt-3 border-t border-black border-dotted">
                   <div className="flex justify-between"><span>CASH:</span><span>{paidAmount.toLocaleString()}</span></div>
                   <div className="flex justify-between font-black text-blue-600"><span>CHANGE:</span><span>{getChange().toLocaleString()}</span></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-10">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-black text-[10px]">BATAL</button>
              <button onClick={processPayment} disabled={loading} className="flex-[2] py-4 bg-black text-white rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 shadow-xl">
                {loading ? "SAVING..." : <><Printer size={18}/> SAVE_&_PRINT</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}