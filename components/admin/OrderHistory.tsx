import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      // Mengambil data dari tabel transactions dan item terkait dari order_items
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          order_items (
            name,
            quantity,
            price
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) setOrders(data);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Order <span className="text-blue-500">History</span></h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.5em] mt-1">Combat Logs & Records</p>
        </div>
      </div>

      <div className="bg-[#020617]/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-white/[0.03] text-[10px] font-black uppercase text-gray-500">
            <tr>
              <th className="p-8">Timestamp</th>
              <th className="p-8">Table</th>
              <th className="p-8">Total Amount</th>
              <th className="p-8">Payment</th>
              <th className="p-8">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-8 text-xs font-mono text-gray-400">
                  {new Date(order.created_at).toLocaleString('id-ID')}
                </td>
                <td className="p-8 font-black text-sm italic">TABLE {order.table_number}</td>
                <td className="p-8 font-mono text-sm text-emerald-400">Rp {order.total_amount?.toLocaleString()}</td>
                <td className="p-8">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    order.payment_method === 'QRIS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {order.payment_method || 'CASH'}
                  </span>
                </td>
                <td className="p-8 text-[10px] text-gray-500 italic max-w-xs truncate">
                  {order.order_items?.map((it: any) => `${it.quantity}x ${it.name}`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}