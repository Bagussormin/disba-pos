type Item = {
  id: number;
  name: string;
  price: number;
  qty: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  trx: {
    receipt_no: string;
    items: Item[];
    total: number;
    paid: number;
    change: number;
    created_at: string;
  } | null;
};

export default function ReprintModal({ open, onClose, trx }: Props) {
  if (!open || !trx) return null;

  // 🔥 Mengambil nama outlet secara dinamis dari sistem
  const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "DISBA POS" : "DISBA POS";

  const printThermal = () => {
    const win = window.open("", "", "width=300");

    win!.document.write(`
      <pre>
${tenantName.toUpperCase()}
========================
No : ${trx.receipt_no}
${new Date(trx.created_at).toLocaleString()}
------------------------
${trx.items
  .map(
    (i) =>
      `${i.name} x${i.qty}\n${(i.price * i.qty).toLocaleString()}`
  )
  .join("\n")}
------------------------
TOTAL   : ${trx.total.toLocaleString()}
BAYAR   : ${trx.paid.toLocaleString()}
KEMBALI : ${trx.change.toLocaleString()}
========================
TERIMA KASIH
      </pre>
      <script>window.onload = function() { window.print(); window.close(); }</script>
    `);

    win!.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] font-sans">
      <div className="bg-[#0f172a] border border-white/10 p-6 w-80 rounded-[2rem] text-white shadow-2xl animate-in zoom-in duration-200">
        <h3 className="font-black mb-4 uppercase italic text-blue-500 text-center tracking-widest">Reprint Struk</h3>

        <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-xs text-gray-300 space-y-2 mb-6">
          <p>No Struk: <span className="text-white font-bold">{trx.receipt_no}</span></p>
          <p>Tanggal: <span className="text-white">{new Date(trx.created_at).toLocaleString()}</span></p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all"
          >
            TUTUP
          </button>
          
          <button
            onClick={printThermal}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            PRINT ULANG
          </button>
        </div>
      </div>
    </div>
  );
}