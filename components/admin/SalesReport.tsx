import { fetchWithTimeout } from "../../lib/printer";
import { safeJSONParse } from "../../lib/utils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Calendar, FileText, TrendingUp, Award, Zap, Clock, Mail, Table, Loader2 } from "lucide-react";

interface SalesTransaction {
  id: string;
  created_at: string;
  receipt_no: string;
  subtotal: number;
  service_charge: number;
  pb1: number;
  discount: number;
  total: number;
  items: any; // Atau interface OrderItem
  cashier_name: string;
  tenant_id: string;
}

interface ProductPerf {
  name: string;
  qty: number;
  revenue: number;
}

export default function SalesReport() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]); // Explicitly type transactions
  const [activeShifts, setActiveShifts] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<ProductPerf[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [summary, setSummary] = useState({ subtotal: 0, service: 0, tax: 0, total: 0, discount: 0 });

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  const fetchActiveShifts = async () => {
    if(!tenantId) return;
    const { data, error } = await supabase.from("shifts").select("*").eq("status", "open").eq("tenant_id", tenantId);
    if (data) setActiveShifts(data);
  };

  const fetchReportData = useCallback(async () => {
    if(!tenantId) return;
    setLoading(true);
    const start = `${startDate}T00:00:00`;
    const end = `${endDate}T23:59:59`;

    const { data: trx, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
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
      
      const totals = trx.reduce((acc, curr) => ({
        subtotal: acc.subtotal + Number(curr.subtotal || 0),
        service: acc.service + Number(curr.service_charge || 0),
        tax: acc.tax + Number(curr.pb1 || 0),
        discount: acc.discount + Number(curr.discount || 0),
        total: acc.total + Number(curr.total || 0),
      }), { subtotal: 0, service: 0, tax: 0, total: 0, discount: 0 });
      setSummary(totals);

      const itemMap: any = {};
      trx.forEach((t: SalesTransaction) => {
        const items = typeof t.items === 'string' ? safeJSONParse(t.items, []) : t.items;
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
  }, [startDate, endDate, tenantId]);

  useEffect(() => {
    fetchReportData();
    fetchActiveShifts();
    const interval = setInterval(fetchActiveShifts, 30000);
    return () => clearInterval(interval);
  }, [fetchReportData]);

  // GENERATE PDF DOC (Digunakan untuk Export dan Email)
  const generatePDFDoc = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Brand Header yang lebih elegan
    doc.setFillColor(2, 6, 23); // Dark slate
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(56, 189, 248); // Light Blue
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('DISBA POS INTELLIGENCE', 14, 18);
    
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CABANG: ${tenantId || "STORE"}`, 14, 25);
    
    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN KEUANGAN & PENJUALAN', 14, 42);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 48);

    // Tabel Ringkasan Keuangan
    autoTable(doc, {
      startY: 55,
      head: [["Ringkasan Finansial", "Nominal (IDR)"]],
      body: [
        ["Pendapatan Kotor (Gross Sales)", `Rp ${summary.subtotal.toLocaleString()}`],
        ["Service Charge", `Rp ${summary.service.toLocaleString()}`],
        ["Pajak (PB1)", `Rp ${summary.tax.toLocaleString()}`],
        ["Total Diskon", `(Rp ${summary.discount.toLocaleString()})`],
        ["PENDAPATAN BERSIH (NET REVENUE)", `Rp ${summary.total.toLocaleString()}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [2, 6, 23], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { textColor: [30, 30, 30], fontSize: 10, cellPadding: 6 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold', textColor: [2, 100, 50] } 
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 55;

    // Tabel Performa Produk
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Performa Produk (Terlaris)', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Nama Produk", "Terjual", "Total Pendapatan"]],
      body: topItems.slice(0, 30).map(i => [i.name, `${i.qty} Pcs`, `Rp ${i.revenue.toLocaleString()}`]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      styles: { cellPadding: 5, fontSize: 9 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } }
    });

    // Footer Tiap Halaman
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    return doc;
  };

  const exportToPDF = () => {
    const doc = generatePDFDoc();
    doc.save(`${tenantId}_Report_${startDate}_${endDate}.pdf`);
  };

  const exportToExcel = () => {
    // 1. Siapkan Sheet Ringkasan Keuangan
    const summaryData = [
      { Kategori: "Pendapatan Kotor", Nominal: summary.subtotal },
      { Kategori: "Service Charge", Nominal: summary.service },
      { Kategori: "Pajak (PB1)", Nominal: summary.tax },
      { Kategori: "Diskon", Nominal: -summary.discount },
      { Kategori: "PENDAPATAN BERSIH", Nominal: summary.total }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    // 2. Siapkan Sheet Penjualan Produk
    const productData = topItems.map(item => ({
      "Nama Produk": item.name,
      "Terjual (Pcs)": item.qty,
      "Pendapatan (IDR)": item.revenue
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productData);

    // 3. Siapkan Sheet History Transaksi
    const trxData = transactions.map(t => ({
      "Tanggal & Jam": new Date(t.created_at).toLocaleString('id-ID'),
      "No Nota": t.receipt_no,
      "Kasir": t.cashier_name || "-",
      "Subtotal": t.subtotal,
      "Diskon": t.discount,
      "Total": t.total
    }));
    const wsTrx = XLSX.utils.json_to_sheet(trxData);

    // Buat Workbook dan gabungkan
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Finansial");
    XLSX.utils.book_append_sheet(wb, wsProducts, "Performa Produk");
    XLSX.utils.book_append_sheet(wb, wsTrx, "Histori Transaksi");

    // Unduh File
    XLSX.writeFile(wb, `${tenantId}_Report_${startDate}_${endDate}.xlsx`);
  };

  const sendEmailReport = async () => {
    setEmailing(true);
    try {
      // Dapatkan email tenant dari database
      const { data: profile } = await supabase.from("outlet_profile").select("email, name").eq("tenant_id", tenantId).single();
      
      if (!profile || !profile.email) {
        alert("Email outlet belum diatur! Silakan atur di menu 'Profil & Pengaturan'.");
        setEmailing(false);
        return;
      }

      // Generate PDF Base64
      const doc = generatePDFDoc();
      const pdfBase64 = doc.output('datauristring');
      
      // Ambil IP Bridge dari receipt_settings untuk memanggil printer-service lokal
      const { data: settings } = await supabase.from("receipt_settings").select("bridge_ip").eq("tenant_id", tenantId).maybeSingle();
      const bridgeIp = settings?.bridge_ip || "127.0.0.1";
      const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

      console.log(`Attempting to send report to: ${baseUrl}/send-report-email`);

      // Tembak ke Node.js lokal untuk mengirim email
      const response = await fetchWithTimeout(`${baseUrl}/send-report-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify({
          tenant_id: tenantId,
          outlet_name: profile.name || tenantId,
          email_to: profile.email,
          period: `${startDate} s/d ${endDate}`,
          summary: summary,
          pdf_attachment: pdfBase64
        })
      });

      if (response.ok) {
        alert(`✅ Laporan PDF berhasil dikirim ke email: ${profile.email}`);
      } else {
        const err = await response.json();
        alert(`❌ Gagal mengirim email: ${err.message || 'Cek server bridge'}`);
      }
    } catch (error: any) {
      alert(`❌ KONEKSI GAGAL! Periksa apakah Server Node.js sudah menyala di IP:PORT yang benar.\n\nDetail: ${error.message}`);
      console.error(error);
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#020617] text-white min-h-screen font-sans">
      {/* HEADER COMMAND CENTER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Zap className="text-blue-500" fill="currentColor" />
            Disba <span className="text-blue-500">Intelligence</span>
          </h2>
          <p className="text-[9px] font-black text-gray-500 tracking-[0.4em] uppercase mt-1">Advanced Sales Analytics & Backoffice | {tenantId}</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="bg-black/40 p-2 rounded-2xl border border-white/10 flex items-center gap-3 px-4">
            <Calendar size={14} className="text-blue-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black text-white outline-none uppercase" />
            <span className="text-gray-600 font-black">TO</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black text-white outline-none uppercase" />
          </div>

          <button onClick={exportToPDF} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 uppercase">
            <FileText size={14} /> PDF
          </button>
          
          <button onClick={exportToExcel} className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 uppercase">
            <Table size={14} /> EXCEL
          </button>

          <button onClick={sendEmailReport} disabled={emailing} className="bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/50 px-8 py-3 rounded-2xl text-[11px] font-black transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 uppercase disabled:opacity-50">
            {emailing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {emailing ? "MENGIRIM..." : "EMAIL REPORT"}
          </button>
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

        {/* Top Products Performance */}
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
    </div>
  );
}