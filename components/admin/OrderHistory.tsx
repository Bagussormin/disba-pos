import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 KUNCI MASTER MULTI-OUTLET
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;

  useEffect(() => {
    if (tenantId) fetchOrders();
  }, [tenantId]);

  const fetchOrders = async () => {
    setLoading(true);
    // 🔥 FILTER: Hanya tarik transaksi milik toko ini
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
      .eq("tenant_id", tenantId) // <--- PENGUNCI KEAMANAN
      .order("created_at", { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Order <span className="text-blue-500">History</span></h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.5em] mt-1">Combat Logs & Records | {tenantId}</p>
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
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center animate-pulse text-blue-500">Loading History...</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-8 text-xs font-mono text-gray-400">
                  {new Date(order.created_at).toLocaleString('id-ID')}
                </td>
                <td className="p-8 font-black text-sm italic">TABLE {order.table_number || order.table_name || "N/A"}</td>
                <td className="p-8 font-mono text-sm text-emerald-400">Rp {Number(order.total)?.toLocaleString()}</td>
                <td className="p-8">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    order.payment_method === 'QRIS' || order.payment_method === 'TRANSFER' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {order.payment_method || 'CASH'}
                  </span>
                </td>
                <td className="p-8 text-[10px] text-gray-500 italic max-w-xs truncate">
                  {order.items ? 
                    (typeof order.items === 'string' ? JSON.parse(order.items) : order.items)
                      .map((it: any) => `${it.qty || it.quantity}x ${it.name}`).join(", ") 
                    : "No details"}
                </td>
              </tr>
            ))}
            {orders.length === 0 && !loading && (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">No transactions found for this outlet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}