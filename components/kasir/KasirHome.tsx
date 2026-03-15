import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, Lock, CreditCard, ChevronRight, CheckCircle2, Loader2, ShoppingBag, User
} from "lucide-react";

const SERVICE_RATE = 0.05; 
const TAX_RATE = 0.05;    

export default function KasirHome() {
  const [tables, setTables] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "DISBA_OUTLET_001" : "DISBA_OUTLET_001"; 

  const [lastIncomingOrder, setLastIncomingOrder] = useState<number>(0);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showItemReportModal, setShowItemReportModal] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [loading, setLoading] = useState(false);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [shiftSummary, setShiftSummary] = useState({ totalSales: 0, cashSales: 0, transferSales: 0, trxCount: 0 });

  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkActiveShift();
    fetchData();
    fetchBanks();
    const channel = supabase.channel(`kasir-sync-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, () => setLastIncomingOrder(Date.now()))
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
    if (data) setOrderItems(data.map((item: any) => ({ id: item.menu_id, name: item.menus?.name || "Menu", qty: item.quantity, price: item.price_at_time, notes: item.notes })));
  };

  const subtotal = orderItems.reduce((a, b) => a + (b.qty * b.price), 0);
  const safeDiscount = Math.min(discount, subtotal);
  const netSubtotal = subtotal - safeDiscount;
  const getService = () => Math.round(netSubtotal * SERVICE_RATE);
  const getTax = () => Math.round((netSubtotal + getService()) * TAX_RATE);
  const getGrandTotal = () => netSubtotal + getService() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  const checkActiveShift = async () => {
    const { data } = await supabase.from("shifts").select("*").eq("status", "open").eq("tenant_id", tenantId).maybeSingle();
    if (data) setCurrentShift(data); else setShowStartShiftModal(true);
  };

  const handleStartShift = async () => {
    const { data } = await supabase.from("shifts").insert({ tenant_id: tenantId, cashier_name: localStorage.getItem("username") || "KASIR", starting_cash: Number(startCash), status: 'open', start_time: new Date().toISOString() }).select().single();
    if (data) { setCurrentShift(data); setShowStartShiftModal(false); }
  };

  const processPayment = async () => {
    if (!currentOrder || !currentShift || loading) return;
    setLoading(true);
    try {
      const receiptNo = `INV/${tenantId.split('_')[0]}/${Date.now().toString().slice(-6)}`;
      await supabase.from("transactions").insert({ shift_id: currentShift.id, tenant_id: tenantId, receipt_no: receiptNo, subtotal, discount: safeDiscount, service_charge: getService(), pb1: getTax(), total: getGrandTotal(), items: orderItems, payment_method: paymentMethod, table_name: selectedTable?.name });
      await supabase.from("orders").update({ status: "completed", total_price: getGrandTotal() }).eq("id", currentOrder.id);
      await supabase.from("tables").update({ status: "available" }).eq("id", selectedTable.id);
      try {
        await executePrint({ orderId: receiptNo, tableName: selectedTable?.name, items: orderItems, subtotal, discount: safeDiscount, tax: getTax(), serviceCharge: getService(), total: getGrandTotal(), paid: paidAmount, change: getChange(), paymentMethod, storeName: "DISBA POS" });
      } catch (err) { console.warn("Printer Offline"); }
      setSelectedTable(null); setShowPreviewModal(false); fetchData();
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white p-1 uppercase italic font-sans flex flex-col overflow-hidden">
      
      {/* HEADER: ULTRA SLIM */}
      <header className="flex justify-between items-center bg-black/60 border-b border-white/5 p-2 mb-1 shadow-2xl">
        <h1 className="text-[11px] font-black tracking-tighter">DISBA<span className="text-blue-500">_POS_STATION</span></h1>
        <div className="flex gap-1.5">
          <button onClick={() => setShowItemReportModal(true)} className="h-7 px-3 bg-blue-600/10 rounded-md border border-blue-500/20 text-[8px] font-black">REKAP</button>
          <button onClick={() => setShowCloseShiftModal(true)} className="h-7 px-3 bg-orange-600/10 rounded-md border border-orange-500/20 text-[8px] font-black">SHIFT</button>
          <button onClick={() => { if(confirm("Logout?")) { localStorage.clear(); window.location.reload(); }}} className="h-7 w-7 flex items-center justify-center bg-red-500/10 rounded-md border border-red-500/20 text-red-500"><LogOut size={12}/></button>
        </div>
      </header>

      <div className="flex-1 flex gap-1 min-h-0 overflow-hidden">
        
        {/* KOLOM 1: MEJA (200px) */}
        <div className="w-44 bg-black/20 rounded-xl border border-white/5 p-2 overflow-y-auto no-scrollbar">
          {Array.from(new Set(tables.map(t => (t.area || "REGULER").toUpperCase()))).map(area => (
            <div key={area} className="mb-4">
              <p className="text-[7px] font-black text-gray-700 mb-2 tracking-widest text-center border-b border-white/5 pb-1 uppercase">{area}</p>
              <div className="grid grid-cols-2 gap-1">
                {tables.filter(t => (t.area || "REGULER").toUpperCase() === area).map(t => {
                   const hasOrder = activeOrders.some(o => o.table_id === t.id);
                   return (
                    <button key={t.id} onClick={() => setSelectedTable(t)}
                      className={`h-11 rounded-lg border transition-all text-[10px] font-black flex flex-col items-center justify-center ${
                        selectedTable?.id === t.id ? 'border-blue-500 bg-blue-600/20 shadow-lg' : 
                        hasOrder ? 'border-orange-500 bg-orange-500/10 animate-pulse text-orange-400' : 'border-white/5 bg-white/[0.02] opacity-40'
                      }`}
                    >
                      {t.name}
                    </button>
                   );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* KOLOM 2: ORDER LIST (FULL VERTICAL) */}
        <div className="flex-1 bg-black/40 rounded-xl border border-white/5 flex flex-col overflow-hidden">
          {currentOrder ? (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Receipt size={16} className="text-blue-500"/>
                    <h2 className="text-xs font-black italic uppercase tracking-tighter text-white">BILLING_<span className="text-blue-500">{selectedTable?.name}</span></h2>
                </div>
                <button onClick={() => setSelectedTable(null)} className="text-gray-600 hover:text-white transition-all"><X size={18}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                <table className="w-full text-left">
                  <thead className="text-[8px] font-black text-gray-600 border-b border-white/5 sticky top-0 bg-[#020617] z-10 uppercase italic">
                    <tr>
                        <th className="pb-3">PRODUCT</th>
                        <th className="pb-3 text-center">QTY</th>
                        <th className="pb-3 text-right">UNIT</th>
                        <th className="pb-3 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-3">
                            <span className="text-[11px] font-black text-white/90 uppercase tracking-tight">{item.name}</span>
                        </td>
                        <td className="py-3 text-center">
                            <span className="text-[11px] font-mono font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{item.qty}</span>
                        </td>
                        <td className="py-3 text-right text-[10px] font-mono text-gray-500">{item.price.toLocaleString()}</td>
                        <td className="py-3 text-right text-[11px] font-mono font-black italic text-white">{(item.qty * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-5 grayscale">
              <ShoppingBag size={100} strokeWidth={1}/>
              <p className="text-xs font-black mt-4 tracking-[1em] uppercase italic">Ready_Station</p>
            </div>
          )}
        </div>

        {/* KOLOM 3: PAYMENT SIDEBAR (ANTI-CUTOFF) */}
        <div className="w-[300px] bg-black/60 rounded-xl border border-white/5 flex flex-col overflow-y-auto no-scrollbar p-3 shadow-2xl backdrop-blur-3xl">
          {currentOrder ? (
            <div className="flex flex-col min-h-full">
              <h3 className="text-[9px] font-black text-gray-600 tracking-[0.3em] mb-4 border-b border-white/10 pb-2 flex items-center gap-2 uppercase italic"><CreditCard size={12}/> Checkout_Panel</h3>
              
              <div className="space-y-2 mb-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-500">
                    <span>SUBTOTAL</span>
                    <span className="text-white font-mono">{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-blue-500 italic">
                    <span>DISC</span>
                    <input type="number" className="w-20 bg-blue-500/10 border border-blue-500/30 rounded px-1.5 py-0.5 text-right text-blue-400 outline-none font-black" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-gray-500 opacity-50">
                    <span>SVC_5%</span>
                    <span className="text-white font-mono">{getService().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-gray-500 opacity-50">
                    <span>TAX_5%</span>
                    <span className="text-white font-mono">{getTax().toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-auto border-t-2 border-dashed border-white/10 pt-4">
                <p className="text-[9px] font-black text-blue-500 italic tracking-widest mb-1">TOTAL_BILLING_DUE</p>
                <p className="text-3xl font-black italic tracking-tighter text-white mb-6 border-b-2 border-white pb-2 leading-none">
                    RP {getGrandTotal().toLocaleString()}
                </p>
                
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); }} className={`py-3 rounded-lg text-[10px] font-black border transition-all ${paymentMethod === 'CASH' ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-30'}`}>CASH</button>
                  <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`py-3 rounded-lg text-[10px] font-black border transition-all ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-400 shadow-xl' : 'bg-white/5 border-white/10 opacity-30'}`}>BANK</button>
                </div>

                {paymentMethod === "TRANSFER" ? (
                  <div className="mb-3 space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[8px] font-black text-purple-400 italic px-1 uppercase">Bank_Account:</p>
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto no-scrollbar">
                        {banks.map(b => (
                            <button key={b.id} onClick={() => setSelectedBank(b)} className={`w-full p-2.5 rounded-lg border text-left transition-all relative ${selectedBank?.id === b.id ? 'bg-purple-600 border-purple-400' : 'bg-white/5 border-white/10 opacity-40'}`}>
                                <p className="text-[9px] font-black text-white truncate">{b.bank_name}</p>
                                <p className="text-[10px] font-mono font-black text-white/70">{b.account_number}</p>
                            </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-[9px] font-black text-blue-500 italic mb-1 uppercase tracking-tighter">Amount_Received_:</p>
                    <input ref={cashInputRef} type="number" className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl py-3 px-3 text-2xl font-black text-blue-400 outline-none focus:border-blue-400 text-center" placeholder="0" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                    {paidAmount >= getGrandTotal() && (
                        <div className="mt-2 flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <span className="text-[9px] font-black text-emerald-500 italic">KEMBALIAN:</span>
                            <span className="text-base font-black text-emerald-400 font-mono">+{getChange().toLocaleString()}</span>
                        </div>
                    )}
                  </div>
                )}

                <button 
                    onClick={() => setShowPreviewModal(true)} 
                    disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} 
                    className={`w-full py-4 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 uppercase tracking-widest ${
                    (paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : !!selectedBank) ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed'
                    }`}
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <><Printer size={16}/> Settle_Order</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-20">
                <CheckCircle2 size={32} className="mb-4 text-gray-500"/>
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest leading-relaxed italic">
                    Select_Table_to_Pay
                </p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS START SHIFT */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[7000] p-4 backdrop-blur-3xl">
          <div className="text-center p-10 bg-[#0b1120] border border-white/10 rounded-[3rem] w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-black mb-8 uppercase italic tracking-tighter">Buka_Shift_Kasir_</h2>
            <input type="number" autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl font-black mb-8 outline-none focus:border-blue-500 text-blue-400" placeholder="0" onChange={(e) => setStartCash(Number(e.target.value))} />
            <button onClick={handleStartShift} className="w-full py-5 bg-blue-600 rounded-[1.5rem] font-black text-xs uppercase shadow-lg shadow-blue-500/20 active:scale-95 transition-all">BUKA TERMINAL KASIR</button>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW (REDUCED SIZE) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9000] p-4 backdrop-blur-md">
          <div className="bg-white text-black p-6 rounded-[2rem] w-full max-w-[320px] font-mono shadow-2xl relative uppercase italic font-bold">
            <h3 className="font-black text-lg text-center border-b-4 border-black border-double pb-3 mb-4 tracking-tighter italic">DISBA_STATION_</h3>
            <div className="text-[9px] space-y-1">
              <div className="flex justify-between"><span>MEJA:</span> <span>{selectedTable?.name}</span></div>
              <div className="flex justify-between"><span>PAYMENT:</span> <span className="text-blue-600">{paymentMethod}</span></div>
              <div className="border-b border-black border-dashed my-2"></div>
              <div className="max-h-32 overflow-y-auto">{orderItems.map((item, i) => (<div key={i} className="flex justify-between py-1 border-b border-black/5 last:border-0"><span>{item.qty} {item.name}</span><span>{(item.qty * item.price).toLocaleString()}</span></div>))}</div>
              <div className="border-t-4 border-black mt-3 pt-2 flex justify-between font-black text-xl"><span>TOTAL:</span><span>{getGrandTotal().toLocaleString()}</span></div>
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-black text-[9px] active:scale-95 transition-all">BATAL</button>
              <button onClick={processPayment} disabled={loading} className="flex-[2] py-3 bg-black text-white rounded-xl font-black text-[9px] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" size={14}/> : <><Printer size={16}/> CONFIRM_&_PRINT</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}