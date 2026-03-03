import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Search, Calendar, Hash, User, MapPin, Eye, Receipt, ArrowRight, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransactionHistory() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  const filteredData = transactions.filter(t => 
    t.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FUNGSI DOWNLOAD PDF ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    const dateRange = `${startDate} to ${endDate}`;

    // Header PDF
    doc.setFontSize(18);
    doc.text("TRANSACTION ARCHIVE REPORT", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${dateRange}`, 14, 28);
    doc.text(`Total Transaksi: ${filteredData.length}`, 14, 33);

    // Garis pemisah
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    // Tabel Data
    autoTable(doc, {
      startY: 45,
      head: [["Tanggal", "No. Resi", "Kasir", "Meja", "Total (IDR)"]],
      body: filteredData.map((t) => [
        new Date(t.created_at).toLocaleDateString('id-ID'),
        t.receipt_no,
        t.cashier_name || "System",
        t.table_name,
        t.total.toLocaleString()
      ]),
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Simpan File
    doc.save(`Transaction_Archive_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="p-8 space-y-8 bg-[#020617] min-h-screen text-white font-sans">
      {/* HEADER & FILTER */}
      <header className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-[8px] font-black tracking-[0.5em] text-blue-500 uppercase">System Audit</h2>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">Transaction <span className="text-blue-500">Archive</span></h1>
          </div>
          
          {/* Tombol Download PDF */}
          <button 
            onClick={downloadPDF}
            className="bg-red-600 hover:bg-red-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-lg shadow-red-600/20"
          >
            <FileText size={14} /> Download PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
          <div className="bg-black/40 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
            <Calendar size={14} className="text-blue-500" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none uppercase cursor-pointer text-white" />
            <ArrowRight size={12} className="text-gray-600" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none uppercase cursor-pointer text-white" />
          </div>

          <div className="md:col-span-2 bg-black/40 p-3 rounded-2xl border border-white/10 flex items-center gap-3 px-5">
            <Search size={14} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="CARI NOMOR RESI ATAU NAMA KASIR..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-[11px] font-black outline-none uppercase w-full tracking-widest placeholder:text-gray-700" 
            />
          </div>
        </div>
      </header>

      {/* TABLE */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">
              <th className="px-8 py-6">Timestamp</th>
              <th className="px-8 py-6">Receipt Info</th>
              <th className="px-8 py-6">Table / Area</th>
              <th className="px-8 py-6">Total Settled</th>
              <th className="px-8 py-6 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center animate-pulse text-[10px] font-black text-blue-500 tracking-[0.5em] uppercase">Fetching Secure Data...</td></tr>
            ) : filteredData.map((trx) => (
              <tr key={trx.id} className="hover:bg-white/[0.03] transition-all group">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-white">{new Date(trx.created_at).toLocaleDateString('id-ID')}</span>
                    <span className="text-[10px] font-mono text-gray-500 uppercase">{new Date(trx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Receipt size={14}/></div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-blue-400 italic uppercase tracking-tighter">{trx.receipt_no}</span>
                      <span className="text-[9px] font-bold text-gray-600 uppercase flex items-center gap-1">
                        <User size={8}/> {trx.cashier_name || 'Autosystem'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 text-[11px] font-black uppercase italic text-gray-300">{trx.table_name}</td>
                <td className="px-8 py-5 text-[12px] font-black text-emerald-400 italic">RP {trx.total.toLocaleString()}</td>
                <td className="px-8 py-5 text-right">
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