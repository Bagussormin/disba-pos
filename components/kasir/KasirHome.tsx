import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, Lock, CreditCard, ChevronRight, CheckCircle2, Loader2, ShoppingBag
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
    if (data) setOrderItems(data.map((item: any) => ({ id: item.menu_id, name: item.menus?.name || "Menu", qty: item.quantity, price: item.price_at_time })));
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
      await supabase.from("transactions").insert({ shift_id: currentShift.id, tenant_id: tenantId, receipt_no: receiptNo, subtotal: subtotal, discount: safeDiscount, service_charge: getService(), pb1: getTax(), total: getGrandTotal(), items: orderItems, payment_method: paymentMethod, table_name: selectedTable?.name, bank_details: paymentMethod === "TRANSFER" ? selectedBank : null });
      await supabase.from("orders").update({ status: "completed", total_price: getGrandTotal() }).eq("id", currentOrder.id);
      await supabase.from("tables").update({ status: "available" }).eq("id", selectedTable.id);
      await executePrint({ orderId: receiptNo, tableName: selectedTable?.name, items: orderItems, subtotal, discount: safeDiscount, tax: getTax(), serviceCharge: getService(), total: getGrandTotal(), paid: paidAmount, change: getChange(), paymentMethod, storeName: "DISBA POS" });
      setSelectedTable(null); setShowPreviewModal(false); fetchData();
    } catch (e) { alert("Error"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white p-1.5 uppercase italic font-sans flex flex-col overflow-hidden">
      
      {/* HEADER ULTRA COMPACT */}
      <header className="flex justify-between items-center bg-black/40 border border-white/5 p-1.5 rounded-xl mb-1 shadow-lg">
        <h1 className="text-xs font-black tracking-tighter px-2">DISBA<span className="text-blue-500">_POS</span></h1>
        <div className="flex gap-1">
          <button onClick={() => setShowItemReportModal(true)} className="bg-blue-600/10 h-6 px-2 rounded-lg border border-blue-500/20 text-[7px] font-black"><BarChart3 size={10}/></button>
          <button onClick={() => setShowCloseShiftModal(true)} className="bg-orange-600/10 h-6 px-2 rounded-lg border border-orange-500/20 text-[7px] font-black">SHIFT</button>
          <button onClick={() => {localStorage.clear(); window.location.reload();}} className="bg-red-500/10 h-6 w-6 flex items-center justify-center rounded-lg border border-red-500/20 text-red-500"><LogOut size={10}/></button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-1 min-h-0">
        
        {/* COL 1: TABLES (SLIM) */}
        <div className="col-span-2 bg-black/20 rounded-xl border border-white/5 p-1.5 overflow-y-auto no-scrollbar">
          {Array.from(new Set(tables.map(t => (t.area || "REGULER").toUpperCase()))).map(area => (
            <div key={area} className="mb-3">
              <p className="text-[6px] font-black text-gray-600 mb-1 tracking-widest opacity-50 text-center">{area}</p>
              <div className="grid grid-cols-1 gap-1">
                {tables.filter(t => (t.area || "REGULER").toUpperCase() === area).map(t => {
                   const hasOrder = activeOrders.some(o => o.table_id === t.id);
                   return (
                    <button key={t.id} onClick={() => setSelectedTable(t)}
                      className={`py-2 rounded-lg border transition-all text-[9px] font-black ${
                        selectedTable?.id === t.id ? 'bg-blue-600 border-blue-400' : 
                        hasOrder ? 'bg-orange-500/20 border-orange-500 animate-pulse' : 'bg-white/5 border-white/5 opacity-40'
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

        {/* COL 2: ORDER ITEMS (MAX VERTICAL SPACE) */}
        <div className="col-span-7 bg-black/40 rounded-xl border border-white/5 flex flex-col overflow-hidden">
          {currentOrder ? (
            <div className="flex flex-col h-full">
              <div className="p-2 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <span className="text-[10px] font-black italic">BILLING_MEJA: <span className="text-blue-500">{selectedTable?.name}</span></span>
                <span className="text-[7px] font-mono text-gray-600">ID: {currentOrder.id.substring(0,6)}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                <table className="w-full text-left">
                  <thead className="text-[7px] font-black text-gray-600 border-b border-white/5 sticky top-0 bg-[#020617]">
                    <tr><th className="pb-1">MENU</th><th className="pb-1 text-center">QTY</th><th className="pb-1 text-right">TOTAL</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="text-[9px]">
                        <td className="py-2 font-black text-white/80 uppercase">{item.name}</td>
                        <td className="py-2 text-center font-mono text-blue-400">{item.qty}X</td>
                        <td className="py-2 text-right font-mono italic">{(item.qty * item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 grayscale">
              <ShoppingBag size={40} /><p className="text-[8px] font-black mt-2 tracking-widest">READY_STATION</p>
            </div>
          )}
        </div>

        {/* COL 3: PAYMENT PANEL (VERTICAL SIDEBAR) */}
        <div className="col-span-3 bg-black/60 rounded-xl border border-white/5 flex flex-col overflow-hidden p-2">
          {currentOrder ? (
            <div className="flex flex-col h-full">
              <div className="space-y-1 mb-3">
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5">
                  <p className="text-[6px] text-gray-500 font-black">SUBTOTAL</p>
                  <p className="text-[11px] font-mono font-black">{subtotal.toLocaleString()}</p>
                </div>
                <div className="bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/20">
                  <p className="text-[6px] text-blue-500 font-black uppercase">Discount</p>
                  <input type="number" className="w-full bg-transparent font-black font-mono text-[11px] outline-none text-blue-400" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex justify-between">
                  <span className="text-[6px] text-gray-500 font-black">SVC_5%</span>
                  <span className="text-[9px] font-mono">{getService().toLocaleString()}</span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/5 flex justify-between">
                  <span className="text-[6px] text-gray-500 font-black">TAX_5%</span>
                  <span className="text-[9px] font-mono">{getTax().toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-auto border-t border-white/10 pt-3">
                <p className="text-[7px] font-black text-blue-500 italic">GRAND_TOTAL</p>
                <p className="text-xl font-black italic tracking-tighter mb-3">RP {getGrandTotal().toLocaleString()}</p>
                
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <button onClick={() => setPaymentMethod("CASH")} className={`py-2 rounded-lg text-[8px] font-black border ${paymentMethod === 'CASH' ? 'bg-blue-600' : 'opacity-30'}`}>CASH</button>
                  <button onClick={() => setPaymentMethod("TRANSFER")} className={`py-2 rounded-lg text-[8px] font-black border ${paymentMethod === 'TRANSFER' ? 'bg-purple-600' : 'opacity-30'}`}>BANK</button>
                </div>

                {paymentMethod === "TRANSFER" ? (
                  <select className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-[8px] font-black mb-2" onChange={(e) => setSelectedBank(banks.find(b => b.id === e.target.value))}>
                    <option>PILIH BANK</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                  </select>
                ) : (
                  <input ref={cashInputRef} type="number" className="w-full bg-white/5 border border-white/10 p-2 rounded-lg text-sm font-black text-blue-400 mb-2 outline-none" placeholder="CASH..." value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                )}

                <button onClick={() => setShowPreviewModal(true)} disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal())} className={`w-full py-3 rounded-lg font-black text-[9px] flex items-center justify-center gap-2 ${paidAmount >= getGrandTotal() || paymentMethod === "TRANSFER" ? 'bg-blue-600' : 'bg-gray-800 opacity-50'}`}>
                  <Printer size={12}/> SETTLE_BILL
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[7px] text-gray-700 italic font-black text-center">PIL_MEJA_UNTUK_BILLING</div>
          )}
        </div>
      </div>

      {/* MODAL PREVIEW (SLIM) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9000] p-4 backdrop-blur-md">
          <div className="bg-white text-black p-5 rounded-2xl w-64 font-mono shadow-2xl uppercase italic font-bold text-[9px]">
            <h3 className="text-center border-b-2 border-black pb-2 mb-3">DISBA_STATION</h3>
            <div className="flex justify-between"><span>MEJA:</span><span>{selectedTable?.name}</span></div>
            <div className="border-b border-black border-dashed my-2"></div>
            <div className="max-h-32 overflow-y-auto">
              {orderItems.map((item, i) => (<div key={i} className="flex justify-between"><span>{item.qty} {item.name}</span><span>{(item.qty * item.price).toLocaleString()}</span></div>))}
            </div>
            <div className="border-t-2 border-black mt-2 pt-2 flex justify-between text-base"><span>TOTAL:</span><span>{getGrandTotal().toLocaleString()}</span></div>
            <div className="flex gap-1 mt-6">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-3 bg-gray-100 rounded-lg">BATAL</button>
              <button onClick={processPayment} className="flex-[2] py-3 bg-black text-white rounded-lg flex items-center justify-center gap-1"><Printer size={12}/> PRINT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}