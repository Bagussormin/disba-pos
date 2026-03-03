import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, TrendingUp
} from "lucide-react";

// --- KONFIGURASI ---
const SERVICE_RATE = 0.05; // 5% Service Charge
const TAX_RATE = 0.10;    // 10% PB1

export default function KasirHome() {
  // --- STATE DASAR ---
  const [tables, setTables] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [activeBill, setActiveBill] = useState<any | null>(null);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);

  // --- STATE MODALS ---
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
  
  // State Summary yang diperbaiki untuk Split Report
  const [shiftSummary, setShiftSummary] = useState({ 
    totalSales: 0, 
    cashSales: 0, 
    transferSales: 0, 
    trxCount: 0 
  });

  const cashInputRef = useRef<HTMLInputElement>(null);
  const prevTableIdRef = useRef<any>(null);
  const areaOrder = ["LOBBY", "LOUNGE", "ROOFTOP", "LANTAI 2", "VIP"];

  // --- INITIAL LOAD ---
  useEffect(() => {
    checkActiveShift();
    fetchData();
    fetchBanks();

    const channel = supabase.channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_bills' }, () => fetchData())
      .subscribe();

    const interval = setInterval(fetchData, 10000);
    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(interval); 
    };
  }, []);

  // --- SELECTION LOGIC ---
  useEffect(() => {
    if (selectedTable) {
      const b = bills.find(bill => bill.table_id === selectedTable.id);
      setActiveBill(b || null);
      
      if (prevTableIdRef.current !== selectedTable.id) {
        setDiscount(0);
        setPaidAmount(0);
        setPaymentMethod("CASH");
        setSelectedBank(null);
        prevTableIdRef.current = selectedTable.id;
        setTimeout(() => cashInputRef.current?.focus(), 100);
      }
      if (b) fetchOrderItems(b.id);
      else setOrderItems([]);
    } else {
      prevTableIdRef.current = null;
      setActiveBill(null);
      setOrderItems([]);
    }
  }, [tables, bills, selectedTable]);

  // --- FETCHERS ---
  const fetchBanks = async () => {
    const { data } = await supabase.from("merchant_banks").select("*").eq("is_active", true);
    if (data) setBanks(data);
  };

  const fetchData = async () => {
    const [tRes, bRes] = await Promise.all([
      supabase.from("tables").select("*").order("name", { ascending: true }),
      supabase.from("open_bills").select("*").eq("status", "open")
    ]);
    if (tRes.data) setTables(tRes.data);
    if (bRes.data) setBills(bRes.data);
  };

  const fetchOrderItems = async (billId: number) => {
    const { data } = await supabase.from("order_items").select(`quantity, price_at_order, name`).eq("bill_id", billId);
    if (data) {
      setOrderItems(data.map((item: any) => ({
        name: item.name || "MENU",
        qty: item.quantity,
        price: item.price_at_order
      })));
    }
  };

  // --- CALCULATIONS ---
  const getSubtotal = () => orderItems.reduce((a, b) => a + (b.qty * b.price), 0);
  const safeDiscount = Math.min(discount, getSubtotal());
  const getNetSubtotal = () => getSubtotal() - safeDiscount;
  const getService = () => Math.round(getNetSubtotal() * SERVICE_RATE);
  const getTax = () => Math.round((getNetSubtotal() + getService()) * TAX_RATE);
  const getGrandTotal = () => getNetSubtotal() + getService() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  // --- PAYMENT HANDLERS ---
  const handleOpenSettlePreview = async () => {
    if (!selectedTable) return;
    // Tandai meja sedang diproses agar tidak diutak-atik waiter
    await supabase.from("tables").update({ status: "closed", last_status_change: new Date().toISOString() }).eq("id", selectedTable.id);
    setShowPreviewModal(true);
  };

  const handleCancelSettle = async () => {
    if (!selectedTable) return;
    await supabase.from("tables").update({ status: "open" }).eq("id", selectedTable.id);
    setShowPreviewModal(false);
  };

  const processPayment = async () => {
    if (!activeBill || !currentShift || loading) return;
    if (paymentMethod === "CASH" && paidAmount < getGrandTotal()) return;
    if (paymentMethod === "TRANSFER" && !selectedBank) return alert("Harap Pilih Bank!");

    setLoading(true);
    try {
      const { error: trxError } = await supabase.from("transactions").insert({
        shift_id: currentShift.id,
        receipt_no: `INV-${Date.now()}`,
        subtotal: getSubtotal(),
        discount: safeDiscount,
        service_charge: getService(),
        pb1: getTax(),
        total: getGrandTotal(),
        items: orderItems,
        table_name: selectedTable?.name,
        payment_method: paymentMethod,
        bank_details: paymentMethod === "TRANSFER" ? selectedBank : null
      });

      if (trxError) throw trxError;

      await supabase.from("open_bills").update({ status: "closed" }).eq("id", activeBill.id);
      await supabase.from("tables").update({ status: "available" }).eq("id", selectedTable.id);

      setOrderItems([]);
      setPaidAmount(0);
      setShowPreviewModal(false);
      setSelectedTable(null);
      fetchData();
    } catch (e) {
      alert("Gagal memproses pembayaran");
    } finally {
      setLoading(false);
    }
  };

  // --- SHIFT LOGIC ---
  const checkActiveShift = async () => {
    const { data } = await supabase.from("shifts").select("*").eq("status", "open").maybeSingle();
    if (data) { 
      setCurrentShift(data); 
      setShowStartShiftModal(false); 
    } else { 
      setShowStartShiftModal(true); 
    }
  };

  const handleStartShift = async () => {
    const { data, error } = await supabase.from("shifts").insert({
      cashier_name: "KASIR UTAMA", 
      starting_cash: Number(startCash), 
      status: 'open', 
      start_time: new Date().toISOString()
    }).select().single();
    if (!error && data) { 
      setCurrentShift(data); 
      setShowStartShiftModal(false); 
    }
  };

  const openCloseShiftModal = async () => {
    if (!currentShift) return;
    setLoading(true);
    
    const { data: trx } = await supabase.from("transactions")
      .select("total, payment_method")
      .eq("shift_id", currentShift.id);
    
    if (trx) {
      const total = trx.reduce((sum, t) => sum + Number(t.total), 0);
      const cash = trx.filter(t => t.payment_method === "CASH").reduce((sum, t) => sum + Number(t.total), 0);
      const transfer = trx.filter(t => t.payment_method === "TRANSFER").reduce((sum, t) => sum + Number(t.total), 0);

      setShiftSummary({ 
        totalSales: total, 
        cashSales: cash, 
        transferSales: transfer, 
        trxCount: trx.length 
      });
    }
    setLoading(false);
    setShowCloseShiftModal(true);
  };

  const handleCloseShift = async () => {
    setLoading(true);
    try {
      await supabase.from("shifts").update({
        status: 'closed', 
        end_time: new Date().toISOString(),
        total_sales: Number(shiftSummary.totalSales), 
        actual_ending_cash: Number(endingCash)
      }).eq("id", currentShift.id);
      window.location.reload(); 
    } catch (e: any) { alert(e.message); } 
    finally { setLoading(false); }
  };

  const handleLogOut = () => { 
    if (window.confirm("Keluar dari Terminal Kasir?")) { 
      localStorage.clear(); 
      window.location.href = "/"; 
    } 
  };

  // --- ITEM REPORT ---
  const fetchItemSales = async () => {
    if (!currentShift) return;
    setLoading(true);
    const { data: transactions } = await supabase.from("transactions").select("items").eq("shift_id", currentShift.id);
    const summary: any = {};
    if (transactions) {
      transactions.forEach((trx: any) => {
        const items = typeof trx.items === 'string' ? JSON.parse(trx.items) : trx.items;
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || "Unknown";
            summary[name] = { 
              qty: (summary[name]?.qty || 0) + Number(item.qty), 
              total: (summary[name]?.total || 0) + (Number(item.qty) * Number(item.price)) 
            };
          });
        }
      });
      setItemSales(Object.keys(summary).map(name => ({ name, ...summary[name] })).sort((a,b) => b.qty - a.qty));
    }
    setLoading(false);
    setShowItemReportModal(true);
  };

  return (
    <div className="fixed inset-0 bg-[#020617] text-white p-2 uppercase italic font-sans flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="flex justify-between items-center bg-black/40 border border-white/5 p-2 rounded-xl mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-black tracking-tighter italic px-2">DISBA<span className="text-blue-500">_POS</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchItemSales} className="bg-blue-600/20 h-7 px-3 rounded-lg border border-blue-500/40 text-blue-400 text-[8px] font-black flex items-center gap-1"><BarChart3 size={10}/> ITEMS_RECAP</button>
          <button onClick={openCloseShiftModal} className="bg-orange-600/10 h-7 px-3 rounded-lg border border-orange-500/20 text-orange-500 text-[8px] font-black uppercase">Close_Shift</button>
          <button onClick={handleLogOut} className="bg-red-500/10 h-7 w-7 flex items-center justify-center rounded-lg border border-red-500/20 text-red-500"><LogOut size={12} /></button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* LEFT: TABLES */}
        <div className="col-span-4 bg-black/20 rounded-2xl border border-white/5 p-3 overflow-y-auto no-scrollbar">
          {areaOrder.map(area => (
            <div key={area} className="mb-4">
              <p className="flex items-center gap-1 text-[8px] font-black text-gray-500 tracking-[0.1em] mb-2 uppercase opacity-50"><MapPin size={8}/> {area}</p>
              <div className="grid grid-cols-3 gap-2">
                {tables.filter(t => (t.area || "").toUpperCase() === area).map(t => (
                  <button key={t.id} onClick={() => setSelectedTable(t)}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                      selectedTable?.id === t.id ? 'border-blue-500 bg-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 
                      t.status === 'closed' ? 'border-red-500 bg-red-500/20' : 
                      t.status === 'open' ? 'border-orange-500 bg-orange-500/10 animate-pulse' : 
                      'border-white/5 bg-white/[0.02] opacity-40'
                    }`}
                  >
                    {t.status === 'closed' && <Lock size={10} className="text-red-500 mb-1" />}
                    <span className="text-[10px] font-black">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: KASIR PANEL */}
        <div className="col-span-8 bg-black/40 rounded-2xl border border-white/5 flex flex-col overflow-hidden">
          {activeBill ? (
            <>
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h2 className="text-xl font-black italic uppercase">BILLING_<span className="text-blue-500">{selectedTable?.name}</span></h2>
                <Receipt size={18} className="text-white/10" />
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 no-scrollbar">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/[0.02] py-2 px-3 rounded-xl border border-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 w-6 h-6 flex items-center justify-center rounded-lg border border-blue-500/20">{item.qty}X</span>
                      <span className="text-[10px] font-black text-white/80 uppercase">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono font-black">{(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* PAYMENT AREA */}
              <div className="p-4 bg-[#030712] border-t border-white/5">
                {/* METODE SELECTION */}
                <div className="flex gap-2 mb-4">
                  <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black border transition-all flex items-center justify-center gap-2 ${paymentMethod === 'CASH' ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-white/5 border-white/10 opacity-40'}`}><Banknote size={14}/> TUNAI</button>
                  <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black border transition-all flex items-center justify-center gap-2 ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-400 shadow-lg' : 'bg-white/5 border-white/10 opacity-40'}`}><CreditCard size={14}/> TRANSFER</button>
                </div>

                {/* MERCHANT BANK SELECTION */}
                {paymentMethod === "TRANSFER" && (
                  <div className="mb-4">
                    <p className="text-[8px] font-black text-purple-400 uppercase mb-2 px-1 italic flex items-center gap-1"><CreditCard size={10}/> Pilih Rekening:</p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {banks.map(bank => (
                        <button key={bank.id} onClick={() => setSelectedBank(bank)} className={`flex-shrink-0 p-3 rounded-xl border min-w-[140px] text-left transition-all relative ${selectedBank?.id === bank.id ? 'border-purple-400 bg-purple-500/20' : 'border-white/10 bg-white/5 opacity-50'}`}>
                          <p className="text-[8px] font-black text-white uppercase mb-1">{bank.bank_name}</p>
                          <p className="text-[10px] font-mono font-black text-purple-400">{bank.account_number}</p>
                          <p className="text-[7px] text-gray-500 font-bold truncate mt-1 italic">{bank.account_holder}</p>
                          {selectedBank?.id === bank.id && <CheckCircle2 size={12} className="absolute top-2 right-2 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CALCULATIONS */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center uppercase">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5"><p className="text-[7px] font-black text-gray-500 mb-0.5 tracking-tighter">Subtotal</p><p className="font-bold font-mono text-xs">{getSubtotal().toLocaleString()}</p></div>
                  <div className="bg-blue-600/5 p-2 rounded-xl border border-blue-500/20"><p className="text-[7px] font-black text-blue-500 mb-0.5 italic">Disc</p><input type="number" className="w-full bg-transparent font-bold font-mono text-xs outline-none text-blue-400 text-center" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5"><p className="text-[7px] font-black text-gray-500 mb-0.5 tracking-tighter">Svc(5%)</p><p className="font-bold font-mono text-xs">{getService().toLocaleString()}</p></div>
                  <div className="bg-white/5 p-2 rounded-xl border border-white/5"><p className="text-[7px] font-black text-gray-500 mb-0.5 tracking-tighter">PB1(10%)</p><p className="font-bold font-mono text-xs">{getTax().toLocaleString()}</p></div>
                </div>

                {/* GRAND TOTAL */}
                <div className="flex justify-between items-end mb-4 px-1">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-blue-500 tracking-widest uppercase italic">Total_Due</span>
                    <span className="text-4xl font-black italic text-white">RP {getGrandTotal().toLocaleString()}</span>
                  </div>
                  {paymentMethod === "CASH" && paidAmount >= getGrandTotal() && (
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-green-500 uppercase italic">Return</span>
                      <span className="text-xl font-black font-mono text-green-400">+{getChange().toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {paymentMethod === "CASH" && (
                    <input ref={cashInputRef} type="number" className="flex-[2] bg-white/5 border-2 border-white/10 rounded-xl py-4 px-4 text-2xl font-black text-blue-400 outline-none focus:border-blue-500" placeholder="0" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                  )}
                  <button 
                    onClick={handleOpenSettlePreview} 
                    disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} 
                    className={`flex-1 rounded-xl font-black text-[10px] uppercase flex flex-col items-center justify-center gap-1 transition-all ${
                      (paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : !!selectedBank) ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95' : 'bg-gray-800 text-gray-600 opacity-50'
                    }`}
                  >
                    <Printer size={18} /><span>Settle_Bill</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-5 grayscale">
              <Receipt size={100} />
              <p className="text-2xl font-black mt-4 tracking-[0.5em] italic uppercase">Ready_Station</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: START SHIFT --- */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[7000] p-4">
          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[32px] w-full max-w-sm shadow-2xl relative">
            <Wallet className="text-blue-500 mx-auto mb-4" size={50} />
            <h2 className="text-xl font-black italic mb-2 uppercase tracking-tighter">Open_Shift</h2>
            <p className="text-[8px] font-black text-gray-500 mb-8 tracking-[0.3em] uppercase italic">Input Modal Awal Tunai</p>
            <input type="number" autoFocus className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 text-center text-4xl font-black text-white outline-none focus:border-blue-500 mb-6" placeholder="0" onChange={(e) => setStartCash(Number(e.target.value))} />
            <button onClick={handleStartShift} className="w-full py-5 bg-blue-600 rounded-[20px] font-black text-[10px] uppercase shadow-lg shadow-blue-600/30">Buka_Terminal</button>
          </div>
        </div>
      )}

      {/* --- MODAL: CLOSE SHIFT (SPLIT REPORT) --- */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[7000] p-4 backdrop-blur-md">
          <div className="bg-[#020617] p-8 rounded-[32px] border border-orange-500/20 w-full max-w-sm text-center shadow-2xl">
            <AlertTriangle className="text-orange-500 mx-auto mb-4" size={40} />
            <h2 className="text-xl font-black italic text-white uppercase mb-8">Shift_Closing</h2>
            
            <div className="space-y-3 mb-8 text-left">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[7px] font-black text-gray-500 uppercase mb-1 tracking-widest">Total_Gross_Sales</p>
                <p className="text-2xl font-black text-white italic">Rp {shiftSummary.totalSales.toLocaleString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                  <p className="text-[7px] font-black text-blue-400 uppercase mb-1">Cash_Sales</p>
                  <p className="text-sm font-black text-white">Rp {shiftSummary.cashSales.toLocaleString()}</p>
                </div>
                <div className="bg-purple-600/10 p-4 rounded-2xl border border-purple-500/20">
                  <p className="text-[7px] font-black text-purple-400 uppercase mb-1">Bank_Sales</p>
                  <p className="text-sm font-black text-white">Rp {shiftSummary.transferSales.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[7px] font-black text-orange-500 mb-2 italic uppercase tracking-widest">Actual_Cash_In_Drawer</p>
                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-3xl font-black text-orange-400 outline-none focus:border-orange-500" placeholder="0" onChange={(e) => setEndingCash(Number(e.target.value))} />
                <p className="text-[7px] text-gray-500 mt-2 text-center italic">
                   Estimasi Uang Tunai: <span className="text-white font-bold">Rp {(Number(currentShift?.starting_cash) + shiftSummary.cashSales).toLocaleString()}</span>
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setShowCloseShiftModal(false)} className="flex-1 py-5 bg-white/5 rounded-[20px] font-black text-[9px] uppercase border border-white/10">Batal</button>
              <button onClick={handleCloseShift} className="flex-[2] py-5 bg-orange-600 rounded-[20px] font-black text-[9px] uppercase shadow-lg shadow-orange-600/20">Akhiri_Shift</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ITEM REPORT --- */}
      {showItemReportModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[5000] p-4 backdrop-blur-md">
          <div className="bg-[#020617] border border-white/10 w-full max-w-md rounded-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xs font-black italic text-blue-500 uppercase tracking-widest">Shift_Items_Report</h3>
              <button onClick={() => setShowItemReportModal(false)} className="p-2 text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 text-[10px] font-black uppercase text-gray-500 italic">
                  <tr><th className="pb-3">Product</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Revenue</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 italic">
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
            <div className="p-5 bg-black/40 border-t border-white/5">
              <button onClick={() => window.print()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"><Printer size={16}/> Cetak_Recap</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: PREVIEW STRUK --- */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[6000] p-4 backdrop-blur-md">
          <div className="bg-white text-black p-6 rounded-2xl w-full max-w-[320px] font-mono shadow-2xl relative uppercase italic font-bold">
            <h3 className="font-black text-xl text-center border-b-2 border-black border-double pb-2 mb-4 tracking-tighter">DISBA_STATION</h3>
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between"><span>Meja:</span> <span>{selectedTable?.name}</span></div>
              <div className="flex justify-between"><span>Bayar:</span> <span className="text-blue-600">{paymentMethod}</span></div>
              {paymentMethod === "TRANSFER" && <div className="flex justify-between font-black text-purple-700 bg-purple-50 p-1 rounded"><span>Bank:</span> <span>{selectedBank?.bank_name}</span></div>}
              <div className="border-b border-black border-dashed my-2"></div>
              {orderItems.map((item, i) => (<div key={i} className="flex justify-between"><span>{item.qty} {item.name}</span><span>{(item.qty * item.price).toLocaleString()}</span></div>))}
              <div className="border-b border-black border-dashed my-2"></div>
              <div className="flex justify-between font-black text-lg pt-2 border-t-2 border-black mt-1"><span>TOTAL:</span><span>{getGrandTotal().toLocaleString()}</span></div>
              {paymentMethod === "CASH" && (
                <div className="mt-2 pt-2 border-t border-black border-dotted">
                   <div className="flex justify-between"><span>Cash:</span><span>{paidAmount.toLocaleString()}</span></div>
                   <div className="flex justify-between font-black text-blue-600"><span>Kembali:</span><span>{getChange().toLocaleString()}</span></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-8">
              <button onClick={handleCancelSettle} className="flex-1 py-4 bg-gray-100 rounded-xl font-black text-[9px]">Batal</button>
              <button onClick={processPayment} disabled={loading} className="flex-[2] py-4 bg-black text-white rounded-xl font-black text-[9px] flex items-center justify-center gap-2">
                {loading ? "SAVING..." : <><Printer size={16}/> Save_&_Print</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}