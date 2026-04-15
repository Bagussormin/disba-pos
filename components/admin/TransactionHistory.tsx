import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  Search, 
  Calendar, 
  User, 
  Receipt, 
  ArrowRight, 
  FileText, 
  Eye, 
  Printer as PrinterIcon, // 🔥 IMPORT ICON PRINTER
  Loader2 
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransactionHistory() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 KUNCI MASTER MULTI-OUTLET
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : "NES_HOUSE_001";

  const fetchTransactions = async () => {
    if(!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, tenantId]);

  const filteredData = transactions.filter(t => 
    t.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.cashier_name || t.cashier)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔥 FUNGSI REPRINT (CETAK ULANG KE PRINTER THERMAL)
  const handleReprint = async (trx: any) => {
    const reprintData = {
      receipt_no: trx.receipt_no,
      tableName: trx.table_name || trx.table_number || "TAKE AWAY",
      cashierName: trx.cashier || trx.cashier_name || "ADMIN",
      paymentMethod: trx.payment_method || "CASH",
      items: trx.items, // Mengambil data JSONB dari Supabase
      subtotal: trx.subtotal,
      service_charge: trx.service_charge,
      tax_pb1: trx.pb1,
      total: trx.total
    };

    try {
      await executePrint(reprintData);
      alert(`REPRINT COMMAND SENT: ${trx.receipt_no}`);
    } catch (err) {
      alert("ERROR: Gagal menghubungi Printer Bridge!");
    }
  };

  // --- FUNGSI DOWNLOAD PDF (ARSIP DIGITAL) ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Brand Header
    doc.setFillColor(2, 6, 23); // Dark slate
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(6, 182, 212); // Cyan 500
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DISBA POS ARCHIVE', 14, 13);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tenant: ${tenantId || "STORE"}`, 14, 19);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Details', 14, 37);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const dateRange = `${startDate} to ${endDate}`;
    doc.text(`Period: ${dateRange}`, 14, 44);

    autoTable(doc, {
      startY: 50,
      head: [["Date", "Receipt No", "Cashier", "Table", "Total (IDR)"]],
      body: filteredData.map((t) => [
        new Date(t.created_at).toLocaleDateString('id-ID'),
        t.receipt_no,
        t.cashier_name || t.cashier || "System",
        t.table_name || "N/A",
        `Rp ${t.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [50, 50, 50] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      styles: { cellPadding: 4, fontSize: 9 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold', textColor: [2, 6, 23] } }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated: ${new Date().toLocaleString('id-ID')} | Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }

    doc.save(`Archive_${tenantId}_${startDate}.pdf`);
  };

  return (
    <div className="p-8 space-y-8 bg-[#020617] min-h-screen text-white font-sans uppercase italic">
      {/* HEADER & FILTER */}
      <header className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[8px] font-black tracking-[0.5em] text-blue-500">System_Audit</h2>
            <h1 className="text-3xl font-black tracking-tighter">Transaction <span className="text-blue-500">Archive</span></h1>
          </div>
          <button onClick={downloadPDF} className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all">
            <FileText size={14} /> Download_PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Calendar size={14} className="text-blue-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none text-white" />
            <ArrowRight size={12} className="text-gray-600" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none text-white" />
          </div>
          <div className="md:col-span-2 bg-black/40 p-3 rounded-2xl border border-white/10 flex items-center gap-3 px-5">
            <Search size={14} className="text-gray-500" />
            <input type="text" placeholder="CARI NOMOR RESI ATAU NAMA KASIR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-[11px] font-black outline-none w-full tracking-widest placeholder:text-gray-700" />
          </div>
        </div>
      </header>

      {/* TABLE */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black text-gray-500 tracking-[0.2em]">
              <th className="px-8 py-6">Timestamp</th>
              <th className="px-8 py-6">Receipt_Info</th>
              <th className="px-8 py-6">Table_Area</th>
              <th className="px-8 py-6">Total_Settled</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center text-blue-500 animate-pulse font-black">Fetching_Secure_Data...</td></tr>
            ) : filteredData.map((trx) => (
              <tr key={trx.id} className="hover:bg-white/[0.03] transition-all group">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black">{new Date(trx.created_at).toLocaleDateString('id-ID')}</span>
                    <span className="text-[10px] font-mono text-gray-500">{new Date(trx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Receipt size={14}/></div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-blue-400">{trx.receipt_no}</span>
                      <span className="text-[9px] font-bold text-gray-600 flex items-center gap-1"><User size={8}/> {trx.cashier || trx.cashier_name || 'System'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 text-[11px] font-black text-gray-300">{trx.table_name || "TAKE AWAY"}</td>
                <td className="px-8 py-5 text-[12px] font-black text-emerald-400 italic">RP {trx.total.toLocaleString()}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-3">
                  {/* 🔥 TOMBOL REPRINT */}
                  <button 
                    onClick={() => handleReprint(trx)}
                    className="p-3 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-2xl transition-all border border-blue-500/20 group/print"
                    title="Print Ulang"
                  >
                    <PrinterIcon size={14} className="group-hover/print:scale-110 transition-transform" />
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                    <Eye size={14} className="text-gray-500 group-hover:text-white" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}