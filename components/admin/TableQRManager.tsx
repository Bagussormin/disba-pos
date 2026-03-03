import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Printer, MapPin } from "lucide-react";
import QRCode from "qrcode"; // Library baru untuk offline QR

export default function TableQRManager() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const areaOrder = ["LOBBY", "LOUNGE", "ROOFTOP", "LANTAI 2", "VIP"];

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tables")
      .select("*")
      .order("name", { ascending: true });
    
    if (data) setTables(data);
    setLoading(false);
  };

  const groupedTables = areaOrder.reduce((acc: any, area) => {
    const areaTables = tables.filter(t => (t.area || "").toUpperCase() === area);
    if (areaTables.length > 0) acc[area] = areaTables;
    return acc;
  }, {});

  // FUNGSI PRINT OFFLINE
  const printQR = async (tableId: string, tableName: string) => {
  // Ganti 'localhost' dengan IP Laptop agar HP tamu bisa akses
  const ipAddress = "192.168.0.112:3000/"; 
  const qrUrl = `http://${ipAddress}:3000/menu/${tableId}`;

  try {
    // ... sisa kode generator QR kamu (tetap sama)
      // Membuat gambar QR secara lokal (tanpa internet)
      const qrImageData = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" }
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <body style="text-align:center;font-family:sans-serif;padding:30px;">
              <div style="border:5px solid black;padding:20px;border-radius:20px;display:inline-block;min-width:300px;">
                <h2 style="margin:0;font-size:24px;">DISBA POS</h2>
                <p style="font-size:12px;color:#3b82f6;font-weight:bold;margin-top:5px;">SCAN TO ORDER</p>
                <img src="${qrImageData}" style="margin:15px 0;" />
                <div style="background:black;color:white;padding:10px;border-radius:10px;">
                  <h1 style="font-size:32px;margin:0;">${tableName}</h1>
                </div>
              </div>
              <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error("Gagal generate QR:", err);
      alert("Gagal membuat QR Code");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-white">
      <div className="mb-8 border-b border-white/10 pb-4">
        <h2 className="text-2xl font-black uppercase italic text-blue-500">QR Manager</h2>
        <p className="text-xs text-gray-400 font-mono">Server: {window.location.host}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-blue-500 font-bold animate-pulse text-xs">
           MENGAMBIL DATA MEJA...
        </div>
      ) : (
        areaOrder.map((area) => groupedTables[area] && (
          <div key={area} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <MapPin size={16} className="text-blue-500" />
              <h3 className="text-sm font-black tracking-[0.3em] uppercase">{area}</h3>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {groupedTables[area].map((table: any) => (
                <div key={table.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <div className="text-[10px] font-black mb-2 truncate opacity-70">{table.name}</div>
                  <button
                    onClick={() => printQR(table.id, table.name)}
                    className="w-full bg-white text-black py-2 rounded-lg font-black text-[9px] uppercase flex items-center justify-center gap-1 hover:bg-blue-600 hover:text-white transition-all"
                  >
                    <Printer size={12} /> PRINT
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}