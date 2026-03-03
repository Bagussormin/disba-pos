import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Calendar, ChevronLeft, ChevronRight, 
  Loader2, ShoppingBag, RefreshCcw, Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ShiftReports() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({ cash: 0, transfer: 0, total: 0, count: 0 });

  useEffect(() => {
    fetchShiftsByDate();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedShift) {
      fetchDataForShift(selectedShift.id);
    }
  }, [selectedShift]);

  const fetchShiftsByDate = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .gte("start_time", `${selectedDate}T00:00:00`)
      .lte("start_time", `${selectedDate}T23:59:59`)
      .order("start_time", { ascending: false });

    if (data && data.length > 0) {
      setShifts(data);
      setSelectedShift(data[0]);
    } else {
      setShifts([]);
      setSelectedShift(null);
    }
    setLoading(false);
  };

  const fetchDataForShift = async (shiftId: number) => {
    setLoading(true);
    try {
      const [trxRes, prodRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("shift_id", shiftId),
        supabase.from("products").select("id, name, price")
      ]);

      if (trxRes.error) throw trxRes.error;

      const productMapId: Record<string, string> = {};
      const productMapPrice: Record<number, string> = {};
      prodRes.data?.forEach(p => { 
        productMapId[String(p.id)] = p.name; 
        productMapPrice[p.price] = p.name;
      });

      const summary = trxRes.data.reduce((acc, curr) => {
        const total = Number(curr.total) || 0;
        if (curr.payment_method?.toUpperCase() === "CASH") acc.cash += total;
        else acc.transfer += total;
        acc.total += total;
        acc.count += 1;
        return acc;
      }, { cash: 0, transfer: 0, total: 0, count: 0 });
      setPaymentSummary(summary);

      const itemMap: any = {};
      trxRes.data.forEach((trx: any) => {
        let items = typeof trx.items === 'string' ? JSON.parse(trx.items) : trx.items;
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const pId = String(it.product_id || it.id || "");
            let finalName = it.name === "MENU" || !it.name ? (productMapId[pId] || productMapPrice[Number(it.price)] || `ID:${pId}`) : it.name;
            const qty = Number(it.qty || it.quantity || 0);
            if (qty > 0) {
              if (!itemMap[finalName]) itemMap[finalName] = { name: finalName, qty: 0, total: 0 };
              itemMap[finalName].qty += qty;
              itemMap[finalName].total += (it.subtotal ? Number(it.subtotal) : (qty * Number(it.price || 0)));
            }
          });
        }
      });
      setItemSales(Object.values(itemMap).sort((a: any, b: any) => b.qty - a.qty));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const exportPDF = () => {
    if (!selectedShift) return;
    const doc = new jsPDF();
    doc.text("DISBA POS - AUDIT SHIFT", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['ITEM', 'QTY', 'TOTAL']],
      body: itemSales.map((i) => [i.name.toUpperCase(), i.qty, `Rp ${i.total.toLocaleString()}`]),
      theme: 'grid'
    });
    doc.save(`Audit_${selectedShift.id}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 bg-[#0a1128] min-h-screen font-sans italic text-white text-[13px]">
      <header className="mb-6 flex justify-between items-center not-italic">
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Shift_Report</h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-[10px] font-black uppercase italic">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => fetchDataForShift(selectedShift?.id)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20">
            <RefreshCcw size={14} className="text-blue-400" />
          </button>
        </div>
      </header>

      {/* COMPACT TOOLBAR */}
      <div className="flex flex-wrap gap-3 mb-6 not-italic">
        <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-2 hover:bg-white/10 border-r border-white/10"><ChevronLeft size={16} /></button>
          <div className="px-4 flex items-center font-black text-[10px] uppercase italic tracking-widest">{selectedDate}</div>
          <button onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-2 hover:bg-white/10 border-l border-white/10"><ChevronRight size={16} /></button>
        </div>

        <select 
          className="p-2 bg-[#0f172a] border border-white/10 rounded-xl font-black text-[10px] uppercase italic outline-none text-white"
          value={selectedShift?.id || ""}
          onChange={(e) => setSelectedShift(shifts.find(s => s.id === Number(e.target.value)))}
        >
          {shifts.map(s => <option key={s.id} value={s.id} className="bg-[#0a1128]">#{s.id} - {s.cashier_name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={30} /></div>
      ) : selectedShift ? (
        <div className="max-w-4xl space-y-4">
          
          {/* COMPACT STATS */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4">
                 <p className="text-[8px] font-bold text-gray-400 uppercase mb-1 italic tracking-widest">Total</p>
                 <h2 className="text-xl font-black italic tabular-nums">Rp{paymentSummary.total.toLocaleString()}</h2>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
               <p className="text-[8px] text-blue-400 font-black uppercase mb-1 italic">Cash</p>
               <h2 className="text-xl font-black italic tabular-nums">Rp{paymentSummary.cash.toLocaleString()}</h2>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
               <p className="text-[8px] text-purple-400 font-black uppercase mb-1 italic">Trf</p>
               <h2 className="text-xl font-black italic tabular-nums">Rp{paymentSummary.transfer.toLocaleString()}</h2>
            </div>
          </div>

          {/* COMPACT ITEM ANALYSIS */}
          <div className="bg-white/5 border border-white/10 rounded-[1.5rem] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
               <div className="flex items-center gap-2">
                 <ShoppingBag size={16} className="text-blue-400"/>
                 <h3 className="text-xs font-black uppercase italic tracking-widest">Menu_Sales</h3>
               </div>
               <span className="text-[9px] font-black text-white/30 italic uppercase">{itemSales.length} Items</span>
            </div>
            
            <div className="p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                {itemSales.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 px-3 hover:bg-white/5 rounded-lg transition-all">
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-white/20 italic">#{idx+1}</span>
                       <div>
                          <p className="text-[11px] font-black uppercase text-white leading-none">{item.name}</p>
                          <p className="text-[8px] font-bold text-blue-400 uppercase italic mt-1">{item.qty} Pcs</p>
                       </div>
                    </div>
                    <p className="text-[11px] font-black text-white italic tabular-nums">Rp{item.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}