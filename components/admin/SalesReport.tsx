import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar, FileText, TrendingUp, Award, Zap, Clock } from "lucide-react";

export default function SalesReport() {
  // Poin 4: Bisa tarik data berdasarkan rentang tanggal
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ subtotal: 0, service: 0, tax: 0, total: 0, discount: 0 });

  // 1. Fungsi Ambil Data Shift (Realtime Monitor)
  const fetchActiveShifts = async () => {
    const { data } = await supabase.from("shifts").select("*").eq("status", "open");
    if (data) setActiveShifts(data);
  };

  // 2. Fungsi Utama Ambil Data Laporan (Poin 2 & 4)
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;

    const { data: trx, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error.message);
      setLoading(false);
      return;
    }

    if (trx) {
      setTransactions(trx);
      
      // Kalkulasi Ringkasan Finansial
      const totals = trx.reduce((acc, curr) => ({
        subtotal: acc.subtotal + Number(curr.subtotal || 0),
        service: acc.service + Number(curr.service_charge || 0),
        tax: acc.tax + Number(curr.pb1 || 0),
        discount: acc.discount + Number(curr.discount || 0),
        total: acc.total + Number(curr.total || 0),
      }), { subtotal: 0, service: 0, tax: 0, total: 0, discount: 0 });
      setSummary(totals);

      // Poin 2: Analisis Item Terjual
      const itemMap: any = {};
      trx.forEach(t => {
        const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || "Unknown";
            const qty = Number(item.qty || item.quantity || 0);
            const totalVal = qty * Number(item.price || 0);
            
            if (!itemMap[name]) {
              itemMap[name] = { qty: 0, revenue: 0 };
            }
            itemMap[name].qty += qty;
            itemMap[name].revenue += totalVal;
          });
        }
      });

      const sortedItems = Object.keys(itemMap)
        .map(name => ({ name, ...itemMap[name] }))
        .sort((a, b) => b.qty - a.qty);
      
      setTopItems(sortedItems);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReportData();
    fetchActiveShifts();
    const interval = setInterval(fetchActiveShifts, 30000);
    return () => clearInterval(interval);
  }, [fetchReportData]);

  // 3. Fungsi Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text("NES RESTOBAR AND PREMIUM POOL", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Sales Intelligence Report: ${startDate} to ${endDate}`, pageWidth / 2, 22, { align: "center" });
    
    // Financial Table
    autoTable(doc, {
      startY: 30,
      head: [["Financial Summary", "Value (IDR)"]],
      body: [
        ["Gross Sales", summary.subtotal.toLocaleString()],
        ["Service Charge", summary.service.toLocaleString()],
        ["PB1 (Tax)", summary.tax.toLocaleString()],
        ["Discounts", `(${summary.discount.toLocaleString()})`],
        ["NET REVENUE", { content: summary.total.toLocaleString(), styles: { fontStyle: 'bold', textColor: [0, 102, 204] } }],
      ],
    });

   // 1. Tabel pertama
autoTable(doc, {
  startY: 30,
  head: [["Financial Summary", "Value (IDR)"]],
  body: [
    ["Gross Sales", summary.subtotal.toLocaleString()],
    ["Service Charge", summary.service.toLocaleString()],
    ["PB1 (Tax)", summary.tax.toLocaleString()],
    ["Discounts", `(${summary.discount.toLocaleString()})`],
    ["NET REVENUE", { content: summary.total.toLocaleString(), styles: { fontStyle: 'bold', textColor: [0, 102, 204] } }],
  ],
});

// 2. Ambil posisi Y terakhir dari tabel sebelumnya
const finalY = (doc as any).lastAutoTable.finalY;

// 3. Gunakan variabel tersebut untuk tabel kedua
autoTable(doc, {
  startY: finalY + 10,
  head: [["Product Name", "Qty Sold", "Total Revenue"]],
  body: topItems.slice(0, 15).map(i => [i.name, i.qty, i.revenue.toLocaleString()]),
});

    doc.save(`NES_Report_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="p-8 space-y-8 bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER COMMAND CENTER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Zap className="text-blue-500" fill="currentColor" />
            Disba <span className="text-blue-500">Intelligence</span>
          </h2>
          <p className="text-[9px] font-black text-gray-500 tracking-[0.4em] uppercase mt-1">Advanced Sales Analytics & Backoffice</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl text-[11px] font-black transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 uppercase">
            <FileText size={14} /> Export Report
          </button>
          
          <div className="bg-black/40 p-2 rounded-2xl border border-white/10 flex items-center gap-3 px-4">
            <Calendar size={14} className="text-blue-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black text-white outline-none uppercase" />
            <span className="text-gray-600 font-black">TO</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black text-white outline-none uppercase" />
          </div>
        </div>
      </header>

      {/* LIVE SHIFT MONITOR */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
             <Clock size={12} /> Live Station Status
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeShifts.length > 0 ? activeShifts.map((shift, i) => (
            <div key={i} className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-[2rem] flex justify-between items-center group hover:bg-emerald-500/10 transition-all">
              <div>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active Cashier</p>
                <p className="text-md font-black italic uppercase text-white">{shift.cashier_name}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-gray-500 uppercase">Shift Start</p>
                <p className="text-[10px] font-mono font-bold text-emerald-400">
                  {new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          )) : (
            <div className="col-span-full bg-red-500/5 border border-red-500/10 p-5 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-red-500 uppercase italic tracking-[0.3em]">All Stations Offline - No Active Shift Detected</p>
            </div>
          )}
        </div>
      </div>

      {/* FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Net Revenue", val: summary.total, color: "text-blue-500", icon: <TrendingUp size={16}/> },
          { label: "Gross Sales", val: summary.subtotal, color: "text-white", icon: <Zap size={16}/> },
          { label: "Tax (PB1)", val: summary.tax, color: "text-emerald-500", icon: <FileText size={16}/> },
          { label: "Service Charge", val: summary.service, color: "text-orange-500", icon: <Award size={16}/> }
        ].map((item, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] shadow-xl hover:border-white/10 transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <p className="text-[9px] font-black text-gray-500 uppercase mb-3 tracking-[0.2em]">{item.label}</p>
            <p className={`text-3xl font-black italic tracking-tighter ${item.color}`}>Rp {item.val.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Transaction History */}
        <div className="lg:col-span-8 bg-white/[0.02] border border-white/5 rounded-[3rem] p-10">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[12px] font-black italic tracking-[0.3em] uppercase text-blue-500">Transaction History</h3>
            <span className="text-[10px] font-bold text-gray-500">{transactions.length} Records Found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500 border-b border-white/5 text-left">
                  <th className="py-4 font-black uppercase tracking-widest">Time</th>
                  <th className="py-4 font-black uppercase tracking-widest">Receipt No</th>
                  <th className="py-4 font-black uppercase tracking-widest text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={3} className="py-10 text-center uppercase font-black text-gray-600 animate-pulse tracking-[0.5em]">Syncing Data...</td></tr>
                ) : transactions.map((t, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors group">
                    <td className="py-5 font-mono text-gray-400">{new Date(t.created_at).toLocaleTimeString()}</td>
                    <td className="py-5 text-blue-400 font-black italic uppercase group-hover:translate-x-1 transition-transform inline-block cursor-default">{t.receipt_no}</td>
                    <td className="py-5 text-right font-black italic text-white text-md">Rp {t.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Poin 2: Top Products Performance */}
        <div className="lg:col-span-4 bg-blue-600/5 border border-blue-500/10 p-10 rounded-[3rem]">
          <h3 className="text-[12px] font-black italic mb-10 tracking-[0.3em] uppercase text-blue-500">Product Performance</h3>
          <div className="space-y-6">
            {topItems.length > 0 ? topItems.slice(0, 10).map((item, i) => (
              <div key={i} className="group cursor-default">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-black italic uppercase text-gray-300 group-hover:text-blue-400 transition-colors">{item.name}</span>
                  <span className="text-white font-black text-[12px]">{item.qty} Sold</span>
                </div>
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                  ></div>
                </div>
                <p className="text-right text-[8px] font-bold text-gray-500 mt-1 uppercase">Revenue: Rp {item.revenue.toLocaleString()}</p>
              </div>
            )) : <p className="text-center py-10 text-[10px] font-black uppercase text-gray-600 italic tracking-widest">No Sales Data</p>}
          </div>
        </div>
      </div>
      
      <footer className="pt-10 border-t border-white/5 flex justify-between items-center opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.5em]">Data Encryption Enabled</p>
        <p className="text-[9px] font-black uppercase tracking-[0.5em]">NES Backoffice v2.0</p>
      </footer>
    </div>
  );
}