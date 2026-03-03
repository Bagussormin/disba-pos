import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

export default function AdminHome() {
  const [activeSubTab, setActiveSubTab] = useState("OVERVIEW");
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, avgSales: 0 });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  const fetchAllDashboardData = async () => {
    setLoading(true);
    try {
      // FIX: Kita ganti dari 'bills' ke 'transactions' sesuai database kita
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .order('created_at', { ascending: true });
      
      if (transactions && transactions.length > 0) {
        // FIX: Kolom di transaksi kita adalah 'total', bukan 'total_amount'
        const total = transactions.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
        setStats({
          totalSales: total,
          totalOrders: transactions.length,
          avgSales: total / transactions.length
        });

        const dailyData = transactions.reduce((acc: any, curr: any) => {
          const date = new Date(curr.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
          acc[date] = (acc[date] || 0) + Number(curr.total);
          return acc;
        }, {});
        
        setTrendData(Object.keys(dailyData).map(date => ({ date, total: dailyData[date] })));
      }

      // 2. Data Kategori (Tetap dari menus)
      const { data: menuData } = await supabase.from("menus").select("category");
      if (menuData) {
        const counts = menuData.reduce((acc: any, curr: any) => {
          acc[curr.category] = (acc[curr.category] || 0) + 1;
          return acc;
        }, {});
        
        const formattedCats = Object.keys(counts)
          .map(cat => ({ name: cat, count: counts[cat] }))
          .sort((a, b) => b.count - a.count);
          
        setTopCategories(formattedCats);
      }
    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-10 space-y-8 animate-in fade-in duration-500 bg-[#020617] min-h-screen text-white">
      
      {/* TABS */}
      <div className="flex gap-10 border-b border-white/5 pb-6">
        {["OVERVIEW", "TRENDS", "TOP CATEGORIES"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`text-[10px] font-black tracking-[0.3em] uppercase transition-all ${
              activeSubTab === tab 
                ? "text-blue-500 border-b-2 border-blue-500 pb-6 -mb-6.5" 
                : "text-gray-600 hover:text-gray-400"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/[0.07] transition-all shadow-2xl">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Total Revenue</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-white">IDR {stats.totalSales.toLocaleString()}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/[0.07] transition-all shadow-2xl">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Completed Orders</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-white">{stats.totalOrders}</h3>
        </div>
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/[0.07] transition-all border-l-blue-500 shadow-2xl">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Avg Per Ticket</p>
          <h3 className="text-3xl font-black italic tracking-tighter text-blue-500">IDR {stats.avgSales.toLocaleString()}</h3>
        </div>
      </div>

      {/* DYNAMIC CONTENT */}
      <div className="bg-black/40 border border-white/5 p-10 rounded-[3rem] shadow-inner">
        {activeSubTab === "OVERVIEW" && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Operational_Summary</h4>
              <span className="text-[8px] text-gray-600 uppercase font-black italic tracking-widest animate-pulse">Live_Sync_Active</span>
            </div>
            
            <div className="space-y-6">
              {[
                { label: "Total Transactions", val: stats.totalOrders },
                { label: "Gross Revenue", val: `IDR ${stats.totalSales.toLocaleString()}`, highlight: true },
                { label: "Average Basket", val: `IDR ${stats.avgSales.toLocaleString()}` }
              ].map((item, i) => (
                <div key={i} className="flex justify-between border-b border-white/5 pb-4 group hover:border-blue-500/30 transition-all">
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{item.label}</span>
                  <span className={`text-sm font-black italic ${item.highlight ? 'text-blue-400' : 'text-white'}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === "TRENDS" && (
          <div className="h-[350px] w-full animate-in slide-in-from-bottom-4 duration-700">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData}>
                 <defs>
                   <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                 <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${val/1000}k`} />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '15px' }}
                   itemStyle={{ color: '#3b82f6', fontWeight: '900' }}
                 />
                 <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        )}

        {activeSubTab === "TOP CATEGORIES" && (
          <div className="space-y-8">
            {topCategories.map((cat, index) => (
              <div key={index} className="space-y-3">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-white">{cat.name}</span>
                  <span className="text-blue-500">{cat.count} Units</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    style={{ 
                      width: `${(cat.count / (topCategories[0]?.count || 1)) * 100}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}