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

  const printThermal = () => {
    const win = window.open("", "", "width=300");

    win!.document.write(`
      <pre>
DISBA POS
========================
No : ${trx.receipt_no}
${new Date(trx.created_at).toLocaleString()}
------------------------
${trx.items
  .map(
    (i) =>
      `${i.name} x${i.qty}
${i.price * i.qty}`
  )
  .join("\n")}
------------------------
TOTAL : ${trx.total}
BAYAR : ${trx.paid}
KEMBALI : ${trx.change}
========================
TERIMA KASIH
      </pre>
    `);

    win!.document.close();
    win!.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 w-80 rounded">
        <h3 className="font-bold mb-2">Reprint Struk</h3>

        <p>No Struk: {trx.receipt_no}</p>
        <p>Tanggal: {new Date(trx.created_at).toLocaleString()}</p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={printThermal}
            className="bg-green-600 text-white px-3 py-1 rounded"
          >
            PRINT
          </button>

          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-3 py-1 rounded"
          >
            TUTUP
          </button>
        </div>
      </div>
    </div>
  );
}
