import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import ReceiptPreview from "../receipt/ReceiptPreview";

interface OrderItem {
  id: number;
  name: string;
  qty: number;
  price: number;
  status: string;
  notes?: string;
}

interface CashierDetailProps {
  billId: number;
  tableName: string;
  onBack: () => void;
}

export default function CashierDetail({ billId, tableName, onBack }: CashierDetailProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Ambil data pesanan dari Supabase
  const fetchOrderItems = async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("open_bill_id", billId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching items:", error);
    } else {
      setItems(data || []);
    }
  };

  useEffect(() => {
    fetchOrderItems();
    
    // Realtime listener supaya kasir tahu kalau waiter nambah order
    const channel = supabase
      .channel(`order-changes-${billId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `open_bill_id=eq.${billId}` }, () => {
        fetchOrderItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [billId]);

  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col font-sans italic uppercase">
      {/* HEADER */}
      <header className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0f172a]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="bg-white/5 p-2 rounded-xl hover:bg-white/10 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-blue-500">{tableName}</h1>
            <p className="text-[10px] text-gray-500 font-bold">Transaction ID: #{billId}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-gray-500 font-black">Total Bill</p>
          <p className="text-xl font-black text-emerald-500 font-mono">Rp {totalPrice.toLocaleString()}</p>
        </div>
      </header>

      {/* BODY: DAFTAR PESANAN */}
      <main className="flex-1 overflow-y-auto p-6 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/5 p-4 rounded-[2rem] flex justify-between items-center">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full">
                    {item.qty}
                  </span>
                  <span className="text-xs font-black tracking-tight">{item.name}</span>
                </div>
                {item.notes && (
                  <span className="text-[9px] text-orange-500 font-bold ml-9 mt-1 italic">
                    * {item.notes}
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-black font-mono">{(item.price * item.qty).toLocaleString()}</p>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded ${item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <p className="text-xl font-black italic">No Items Found</p>
          </div>
        )}
      </main>

      {/* FOOTER: TOMBOL AKSI KASIR */}
      <footer className="p-6 bg-[#0f172a] border-t border-white/10 grid grid-cols-2 gap-4">
        <button 
          className="py-4 bg-white/5 rounded-[1.5rem] font-black text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
        >
          Split Bill
        </button>
        <button 
          onClick={() => setIsPreviewOpen(true)}
          className="py-4 bg-blue-600 rounded-[1.5rem] font-black text-[10px] tracking-[0.2em] shadow-lg shadow-blue-900/20 hover:bg-blue-500 active:scale-95 transition-all"
        >
          PROCESS PAYMENT
        </button>
      </footer>

      {/* MODAL PREVIEW STRUK */}
      <ReceiptPreview 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        billId={billId}
        tableName={tableName}
        items={items}
        waiterName="CASHIER"
        onPrint={() => {
          // Fungsi print fisik akan kita hubungkan nanti
          window.print();
        }}
      />
    </div>
  );
}