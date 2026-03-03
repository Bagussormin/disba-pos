export default function ReceiptPreview({ isOpen, data, onClose, onPrint }: any) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className="bg-white text-black p-6 rounded-lg shadow-2xl w-full max-w-sm font-mono text-[11px]">
        <div className="text-center mb-4">
          <h2 className="font-bold text-sm uppercase">NES CAFE & RESTO</h2>
          <p>SISTEM KASIR DISBA POS</p>
          <p>--------------------------------</p>
        </div>
        <div className="space-y-1 mb-4">
          <div className="flex justify-between"><span>NO STRUK :</span><span>{data.receipt_no}</span></div>
          <div className="flex justify-between"><span>NO MEJA  :</span><span>{data.table_name}</span></div>
          <div className="flex justify-between"><span>PELANGGAN:</span><span>{data.customer_name}</span></div>
          <div className="flex justify-between"><span>KASIR    :</span><span>{data.cashier}</span></div>
        </div>
        <p>--------------------------------</p>
        <div className="space-y-1">
          {data.items?.map((item: any, i: number) => (
            <div key={i}>
              <div className="uppercase">{item.name}</div>
              <div className="flex justify-between">
                <span>{item.qty} x {item.price.toLocaleString()}</span>
                <span>{(item.qty * item.price).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        <p>--------------------------------</p>
        <div className="space-y-1">
          <div className="flex justify-between"><span>SUBTOTAL</span><span>Rp {data.subtotal.toLocaleString()}</span></div>
          {data.discount > 0 && (
            <div className="flex justify-between">
              <span>DISC ({data.discount_percent}%)</span>
              <span>-Rp {data.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between"><span>PB1 (10%)</span><span>Rp {data.pb1.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold border-t border-black pt-1">
            <span>TOTAL</span><span>RP {data.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={() => onPrint(data)} className="flex-1 bg-emerald-600 text-white py-3 rounded-md font-bold uppercase">Print Struk</button>
          <button onClick={onClose} className="flex-1 bg-gray-400 text-white py-3 rounded-md font-bold uppercase">Tutup</button>
        </div>
      </div>
    </div>
  );
}