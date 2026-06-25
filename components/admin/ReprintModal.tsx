import { safeJSONParse } from "../../lib/utils";
import { useEffect, useState } from "react";
import { executePrint } from "../../lib/printer";
import { supabase } from "../../lib/supabase";

interface Item {
  id: number;
  name: string;
  price: number;
  qty: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  trx: TransactionDetails | null;
};

interface TransactionDetails {
  id: string; // Transaction ID
  receipt_no: string;
  items: Item[] | string; // Can be string (JSONB) or parsed array
  total: number;
  paid: number;
  change: number;
  created_at: string;
  subtotal?: number;
  service_charge?: number;
  pb1?: number; // Assuming this is tax
  discount?: number;
  payment_method?: string;
  cashier?: string;
  cashier_name?: string;
  table_name?: string;
  table_number?: string;
}

interface ReceiptSettings {
  store_name: string;
  address: string;
  contact: string;
  footer_text: string;
  bridge_ip: string;
  cashier_printer_ip: string;
}

export default function ReprintModal({ open, onClose, trx }: Props) {
  if (!open || !trx) return null;

  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
  
  
  useEffect(() => {
    if (open && tenantId) {
      fetchReceiptSettings();
    }
  }, [open, tenantId]);

  const fetchReceiptSettings = async () => {
    setLoadingSettings(true);
    const { data, error } = await supabase
      .from("receipt_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle() as unknown as { data: ReceiptSettings | null, error: any };

    if (error) {
      console.error("Error fetching receipt settings:", error.message);
    }
    setReceiptSettings(data);
    setLoadingSettings(false);
  };

  // 🔥 Mengambil nama outlet secara dinamis dari sistem
  const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "DISBA POS" : "DISBA POS";

  const printThermal = async () => {
    if (!receiptSettings) {
      alert("Pengaturan struk belum dimuat. Coba lagi.");
      return;
    }

    const itemsParsed = typeof trx.items === 'string' ? safeJSONParse(trx.items, []) : trx.items;

    const receiptData = {
      receipt_no: trx.receipt_no,
      tableName: trx.table_name || trx.table_number || "TAKE AWAY",
      cashierName: trx.cashier || trx.cashier_name || localStorage.getItem("username") || "KASIR",
      paymentMethod: trx.payment_method || "CASH",
      items: itemsParsed,
      subtotal: trx.subtotal || 0,
      discount: trx.discount || 0,
      serviceCharge: trx.service_charge || 0,
      tax: trx.pb1 || 0,
      total: trx.total,
      paid: trx.paid,
      change: trx.change,
      storeName: receiptSettings.store_name || tenantName,
      address: receiptSettings.address || "",
      contact: receiptSettings.contact || "",
      footerText: receiptSettings.footer_text || "Terima Kasih"
    };

    try {
      await executePrint(receiptData);
      alert(`REPRINT COMMAND SENT: ${trx.receipt_no}`);
    } catch (err) {
      alert("ERROR: Gagal menghubungi Printer Bridge! Pastikan aplikasi Bridge menyala.");
      console.error("Reprint error:", err);
    }
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