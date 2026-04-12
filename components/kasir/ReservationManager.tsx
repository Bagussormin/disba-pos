import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { 
  Plus, Calendar, User, Wallet, Home, Trash2, Loader2, CheckCircle, Clock 
} from "lucide-react";

export default function ReservationManager() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [guestName, setGuestName] = useState("");
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("12:00"); // Tambahkan state untuk JAM
  const [dpAmount, setDpAmount] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [notes, setNotes] = useState("");

  const tenantId = localStorage.getItem("tenant_id") || "NES_HOUSE_001";

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('res-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchReservations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchRooms();
    await fetchReservations();
    setLoading(false);
  };

  const fetchRooms = async () => {
    try {
      const { data: tenantInfo } = await supabase.from("tenants").select("linked_hotel_id").eq("tenant_id", tenantId).maybeSingle();
      const targetTenantForRooms = tenantInfo?.linked_hotel_id || tenantId;
      const { data: roomData } = await supabase.from("hotel_rooms").select("id, room_number").eq("tenant_id", targetTenantForRooms).order("room_number", { ascending: true });
      if (roomData) setRooms(roomData);
    } catch (err) { console.error(err); }
  };

  const fetchReservations = async () => {
    const { data } = await supabase.from("reservations").select(`*, hotel_rooms(room_number)`).eq("tenant_id", tenantId).neq("status", "CANCELLED").order("reservation_date", { ascending: true });
    if (data) setReservations(data);
  };

  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !resDate || !resTime) return alert("Nama, Tanggal & Jam wajib diisi!");

    setIsSaving(true);
    try {
      // PERBAIKAN: Mengirim reservation_time agar database tidak menolak
      const { error } = await supabase.from("reservations").insert({
        tenant_id: tenantId,
        guest_name: guestName.toUpperCase(),
        reservation_date: resDate,
        reservation_time: resTime, // DATA JAM DISERTAKAN DISINI
        down_payment_amount: Number(dpAmount) || 0,
        room_id: selectedRoomId || null,
        notes: notes,
        status: "CONFIRMED"
      });

      if (error) throw error;

      setGuestName(""); setResDate(""); setResTime("12:00"); setDpAmount(""); setSelectedRoomId(""); setNotes("");
      fetchReservations();
      alert("RESERVASI BERHASIL DISIMPAN");
    } catch (err: any) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckIn = async (res: any) => {
    if (!confirm(`Proses Check-in untuk ${res.guest_name}?`)) return;
    setIsSaving(true);
    try {
      if (res.room_id) {
        await supabase.from("hotel_rooms").update({ status: 'OCCUPIED', current_guest_name: res.guest_name }).eq("id", res.room_id);
      }
      const { error: orderError } = await supabase.from("orders").insert({
        tenant_id: tenantId, status: "open", guest_name: res.guest_name,
        notes: res.down_payment_amount > 0 ? `DP_PAID:${res.down_payment_amount}` : `RES_ROOM:${res.hotel_rooms?.room_number || '-'}`
      });
      if (orderError) throw orderError;
      await supabase.from("reservations").update({ status: 'CHECKED_IN' }).eq("id", res.id);
      alert("CHECK-IN BERHASIL!");
      fetchReservations();
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  const deleteReservation = async (id: string) => {
    if (!confirm("Hapus reservasi ini?")) return;
    await supabase.from("reservations").delete().eq("id", id);
    fetchReservations();
  };

  return (
    <div className="flex flex-col h-full bg-[#010413]/50 text-white p-6 overflow-hidden italic uppercase">
      {/* HEADER */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter text-blue-500 leading-none">RESERVATION_MANAGER</h2>
          <p className="text-[9px] text-gray-600 font-black tracking-[0.4em] mt-2">NES_HOUSE_HOSPITALITY_SYSTEM</p>
        </div>
        <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-2xl">
           <p className="text-[8px] font-black text-gray-500">Linked_Hotel</p>
           <p className="text-[10px] font-black text-blue-400">NES_HOUSE_HOTEL</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 overflow-hidden flex-1">
        {/* LEFT: FORM INPUT */}
        <div className="w-full lg:w-[380px]">
          <form onSubmit={handleAddReservation} className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-4 backdrop-blur-3xl shadow-2xl">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-600 ml-2 tracking-widest">Guest_Identity</label>
              <div className="relative">
                <User className="absolute left-5 top-3.5 text-gray-700" size={16} />
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-14 pr-6 text-[11px] font-black outline-none focus:border-blue-500 placeholder:text-gray-900" placeholder="NAME..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-600 ml-2 tracking-widest">Date</label>
                <input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-5 text-[11px] font-black outline-none focus:border-blue-500 color-scheme-dark" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-600 ml-2 tracking-widest">Time</label>
                <div className="relative">
                   <Clock className="absolute left-4 top-3.5 text-gray-700" size={14} />
                   <input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-[11px] font-black outline-none focus:border-blue-500 color-scheme-dark" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-600 ml-2 tracking-widest">Deposit</label>
                <input type="number" value={dpAmount} onChange={(e) => setDpAmount(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-5 text-[11px] font-mono font-black outline-none focus:border-emerald-500 text-emerald-500" placeholder="RP" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-600 ml-2 tracking-widest">Assign_Room</label>
                <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-5 text-[10px] font-black outline-none focus:border-blue-500 appearance-none">
                  <option value="">NO_ROOM</option>
                  {rooms.map(r => <option key={r.id} value={r.id} className="bg-[#010413]">ROOM_{r.room_number}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={isSaving || !guestName || !resDate} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-20 py-4.5 rounded-2xl mt-2 font-black text-[10px] tracking-[0.3em] flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              {isSaving ? <Loader2 className="animate-spin" size={16}/> : <><Plus size={16}/> SAVE_RESERVATION</>}
            </button>
          </form>
        </div>

        {/* RIGHT: LIST VIEW */}
        <div className="flex-1 bg-white/[0.01] border border-white/5 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
             <span className="text-[10px] font-black tracking-[0.3em] text-white">Upcoming_Schedules</span>
             <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">{reservations.length} Bookings</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {loading ? <div className="flex justify-center py-20 opacity-20"><Loader2 className="animate-spin" size={30}/></div> : reservations.length === 0 ? <div className="text-center py-32 opacity-10 italic text-[12px] font-black tracking-widest uppercase">No_Data_Available</div> : reservations.map((res) => (
                <div key={res.id} className={`bg-white/[0.02] border border-white/[0.03] rounded-[2.5rem] p-5 flex items-center justify-between group hover:border-blue-500/30 transition-all ${res.status === 'CHECKED_IN' ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center border border-blue-500/20 text-blue-500 bg-blue-500/5"><User size={20} /></div>
                    <div>
                      <h4 className="text-[14px] font-black tracking-tight mb-1">{res.guest_name}</h4>
                      <div className="flex gap-4">
                        <span className="text-[9px] text-gray-500 flex items-center gap-2 font-mono"><Calendar size={10} className="text-blue-500"/> {res.reservation_date}</span>
                        <span className="text-[9px] text-gray-500 flex items-center gap-2 font-mono"><Clock size={10} className="text-blue-500"/> {res.reservation_time}</span>
                        {res.hotel_rooms && <span className="text-[9px] text-emerald-500 flex items-center gap-2 font-black"><Home size={10}/> ROOM_{res.hotel_rooms.room_number}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right"><p className="text-[16px] font-mono font-black text-emerald-500">RP {Number(res.down_payment_amount).toLocaleString('id-ID')}</p></div>
                    {res.status !== 'CHECKED_IN' ? (
                      <button onClick={() => handleCheckIn(res)} className="bg-blue-600 hover:bg-blue-500 px-6 py-3.5 rounded-xl text-[9px] font-black tracking-widest flex items-center gap-2 transition-all">CHECK_IN</button>
                    ) : <div className="bg-emerald-500/10 text-emerald-500 px-5 py-2.5 rounded-xl text-[8px] font-black border border-emerald-500/20 italic">COMPLETED</div>}
                    <button onClick={() => deleteReservation(res.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-800 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}