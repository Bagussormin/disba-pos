import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { executeKitchenPrint } from "../../lib/printer";
import {
  ChefHat, Clock, CheckCircle2, Bell, Printer, RefreshCw,
  Timer, Flame, Coffee, Utensils, LogOut, Wifi, WifiOff,
  Volume2, VolumeX, CheckCheck
} from "lucide-react";

// ----- KDS STATUS CONFIG -----
const STATUS_CONFIG = {
  pending:   { label: "ANTRIAN",    color: "amber",   bg: "amber-500/10",   border: "amber-500/30",   icon: <Clock size={14} />,       next: "preparing" },
  preparing: { label: "DIPROSES",   color: "blue",    bg: "blue-500/10",    border: "blue-500/30",    icon: <Flame size={14} />,        next: "ready" },
  ready:     { label: "SIAP SAJI",  color: "emerald", bg: "emerald-500/10", border: "emerald-500/30", icon: <CheckCircle2 size={14} />, next: "served" },
  served:    { label: "DISAJIKAN",  color: "gray",    bg: "white/5",        border: "white/10",       icon: <CheckCheck size={14} />,   next: null },
};

export default function KDSApp() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [filter, setFilter] = useState<"all" | "pending" | "preparing" | "ready">("all");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : "";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevOrderCountRef = useRef<number>(0);

  // --- FETCH ALL ACTIVE ORDERS ---
  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id, quantity, price_at_time, note, modifiers, kds_status, kds_updated_at,
          menus ( name, category )
        ),
        tables ( name )
      `)
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .order("created_at", { ascending: true });

    if (data) {
      // Filter: only orders with non-served items (hide fully served orders from view)
      const activeOrders = data.filter(o =>
        o.order_items?.some((i: any) => i.kds_status !== "served")
      );
      
      // Detect new order
      if (activeOrders.length > prevOrderCountRef.current && soundEnabled) {
        playAlert();
      }
      prevOrderCountRef.current = activeOrders.length;
      setOrders(activeOrders);
    }
    setLoading(false);
    setLastUpdate(new Date());
  }, [tenantId, soundEnabled]);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase.channel(`kds-live-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, fetchOrders)
      .subscribe();

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Auto-refresh every 30s as safety net
    const refreshInterval = setInterval(fetchOrders, 30000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(refreshInterval);
    };
  }, [fetchOrders]);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    } catch (e) { console.log("Audio not available"); }
  };

  // --- UPDATE ITEM KDS STATUS ---
  const updateItemStatus = async (itemId: string, newStatus: string) => {
    await supabase
      .from("order_items")
      .update({ kds_status: newStatus, kds_updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("tenant_id", tenantId);
    // fetchOrders() is triggered by real-time subscription
  };

  // --- UPDATE ALL ITEMS IN ORDER ---
  const updateAllItems = async (orderId: string, newStatus: string) => {
    // Get all item ids for this order with non-served status
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const itemIds = order.order_items
      .filter((i: any) => i.kds_status !== "served")
      .map((i: any) => i.id);
    
    for (const id of itemIds) {
      await supabase
        .from("order_items")
        .update({ kds_status: newStatus, kds_updated_at: new Date().toISOString() })
        .eq("id", id);
    }
  };

  // --- PRINT KITCHEN TICKET ---
  const handlePrintKitchenTicket = async (order: any) => {
    const items = order.order_items
      .filter((i: any) => i.kds_status !== "served")
      .map((i: any) => ({
        name: i.menus?.name || "ITEM",
        qty: i.quantity,
        note: i.note,
        modifiers: i.modifiers || []
      }));
    
    await executeKitchenPrint({
      tableName: order.tables?.name || "TAKEAWAY",
      orderNo: order.id?.slice(-6)?.toUpperCase(),
      items
    });
  };

  // --- ELAPSED TIME ---
  const getElapsedMin = (createdAt: string) => {
    const diff = (Date.now() - new Date(createdAt).getTime()) / 1000 / 60;
    return Math.floor(diff);
  };

  const getElapsedColor = (min: number) => {
    if (min >= 20) return "text-red-500";
    if (min >= 10) return "text-orange-400";
    return "text-emerald-400";
  };

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => o.order_items?.some((i: any) => i.kds_status === filter));

  const handleLogOut = () => {
    if (confirm("Keluar dari KDS?")) {
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      {/* HEADER */}
      <header className="bg-black/80 border-b border-white/5 p-3 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500/20 border border-orange-500/40 p-2 rounded-xl">
            <ChefHat size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tighter italic uppercase">DISBA <span className="text-orange-400">KDS</span></h1>
            <p className="text-[8px] text-gray-500 font-bold tracking-widest uppercase">Kitchen Display System</p>
          </div>
        </div>

        {/* FILTER TABS */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {(["all", "pending", "preparing", "ready"] as const).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                filter === f ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}>
              {f === "all" ? "SEMUA" : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicators */}
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
            {isOnline
              ? <Wifi size={12} className="text-emerald-400" />
              : <WifiOff size={12} className="text-red-400" />
            }
            <span className="text-[8px] font-black text-gray-500">{isOnline ? "LIVE" : "OFFLINE"}</span>
          </div>
          <div className="text-[8px] font-black text-gray-600 hidden sm:block">
            {lastUpdate.toLocaleTimeString('id-ID')}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-600'}`}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Refresh */}
          <button onClick={fetchOrders} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
            <RefreshCw size={16} />
          </button>

          {/* Logout */}
          <button onClick={handleLogOut} className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* SUMMARY BAR */}
      <div className="flex gap-4 px-4 py-2 bg-black/40 border-b border-white/[0.03] overflow-x-auto">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = orders.reduce((total, o) =>
            total + (o.order_items?.filter((i: any) => i.kds_status === status).length || 0), 0
          );
          return (
            <div key={status} className="flex items-center gap-2 shrink-0">
              <span className={`text-${cfg.color}-400`}>{cfg.icon}</span>
              <span className="text-[9px] font-black text-gray-400 uppercase">{cfg.label}:</span>
              <span className={`text-sm font-black text-${cfg.color}-400`}>{count}</span>
            </div>
          );
        })}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Bell size={12} className="text-orange-400" />
          <span className="text-[9px] font-black text-orange-400">{filteredOrders.length} Order Aktif</span>
        </div>
      </div>

      {/* ORDER CARDS GRID */}
      <main className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <ChefHat size={60} className="text-orange-500 animate-pulse" />
            <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Memuat Antrian Dapur...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-20">
            <Utensils size={80} strokeWidth={1} className="text-white" />
            <p className="text-xs font-black text-white tracking-[0.5em] uppercase">Tidak Ada Pesanan Masuk</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredOrders.map(order => {
              const elapsed = getElapsedMin(order.created_at);
              const activeItems = order.order_items?.filter((i: any) => i.kds_status !== "served") || [];
              const allReady = activeItems.every((i: any) => i.kds_status === "ready");
              const hasPending = activeItems.some((i: any) => i.kds_status === "pending");

              return (
                <div key={order.id} className={`bg-white/[0.03] border rounded-2xl overflow-hidden flex flex-col transition-all shadow-lg hover:shadow-xl ${
                  allReady ? 'border-emerald-500/50 shadow-emerald-900/30' :
                  hasPending ? 'border-amber-500/40 shadow-amber-900/20 animate-[pulse_3s_ease-in-out_infinite]' :
                  'border-blue-500/30 shadow-blue-900/20'
                }`}>
                  {/* CARD HEADER */}
                  <div className={`p-3 flex items-center justify-between border-b ${
                    allReady ? 'bg-emerald-500/10 border-emerald-500/20' :
                    hasPending ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-blue-500/10 border-blue-500/20'
                  }`}>
                    <div>
                      <p className="font-black text-base uppercase italic tracking-tight">
                        {order.tables?.name || "TAKEAWAY"}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                        #{order.id?.slice(-6)?.toUpperCase()}
                      </p>
                    </div>
                    <div className={`text-right ${getElapsedColor(elapsed)}`}>
                      <div className="flex items-center gap-1 justify-end">
                        <Timer size={12} />
                        <span className="text-sm font-black">{elapsed}m</span>
                      </div>
                      {elapsed >= 15 && (
                        <span className="text-[7px] font-black text-red-400 uppercase animate-pulse">TERLAMBAT</span>
                      )}
                    </div>
                  </div>

                  {/* ORDER ITEMS */}
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-72">
                    {order.order_items
                      ?.filter((i: any) => i.kds_status !== "served")
                      .map((item: any) => {
                        const cfg = STATUS_CONFIG[item.kds_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                        const nextStatus = cfg.next;

                        return (
                          <div key={item.id} className={`p-3 rounded-xl border bg-${cfg.bg} border-${cfg.border} flex flex-col gap-1`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-black font-mono text-${cfg.color}-400 bg-${cfg.bg} border border-${cfg.border} px-1.5 py-0.5 rounded-md shrink-0`}>
                                    {item.quantity}x
                                  </span>
                                  <p className="text-xs font-black text-white uppercase truncate">
                                    {item.menus?.name || "ITEM"}
                                  </p>
                                </div>

                                {/* Modifiers */}
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <div className="mt-1 ml-8 flex flex-wrap gap-1">
                                    {item.modifiers.map((m: any, idx: number) => (
                                      <span key={idx} className="text-[7px] font-bold bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-md border border-white/10">
                                        {m.option_name}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Note */}
                                {item.note && (
                                  <p className="text-[8px] text-orange-300 italic font-bold ml-8 mt-1 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                                    ⚠ {item.note}
                                  </p>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div className={`flex items-center gap-1 text-[7px] font-black text-${cfg.color}-400 shrink-0 bg-${cfg.bg} border border-${cfg.border} px-1.5 py-1 rounded-lg`}>
                                {cfg.icon}
                                <span className="hidden sm:block">{cfg.label}</span>
                              </div>
                            </div>

                            {/* Advance Status Button */}
                            {nextStatus && (
                              <button
                                onClick={() => updateItemStatus(item.id, nextStatus)}
                                className={`w-full mt-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                  nextStatus === 'ready'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}>
                                {nextStatus === 'preparing' ? <Flame size={10} /> : <CheckCircle2 size={10} />}
                                {nextStatus === 'preparing' ? 'MULAI MASAK' : 'SELESAI & SIAP'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* CARD FOOTER: Action Buttons */}
                  <div className="p-3 border-t border-white/5 flex gap-2">
                    {/* Print Kitchen Ticket */}
                    <button
                      onClick={() => handlePrintKitchenTicket(order)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-orange-600/20 border border-white/10 hover:border-orange-500/40 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5 text-gray-400 hover:text-orange-400 transition-all">
                      <Printer size={12} /> PRINT TIKET
                    </button>

                    {/* Mark All Ready */}
                    {!allReady && (
                      <button
                        onClick={() => updateAllItems(order.id, "ready")}
                        className="flex-1 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5 text-emerald-400 hover:text-white transition-all">
                        <CheckCircle2 size={12} /> SEMUA READY
                      </button>
                    )}

                    {/* Mark All Served */}
                    {allReady && (
                      <button
                        onClick={() => updateAllItems(order.id, "served")}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 border border-blue-500/30 rounded-xl text-[9px] font-black flex items-center justify-center gap-1.5 text-white transition-all">
                        <CheckCheck size={12} /> DISAJIKAN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
