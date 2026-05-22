import { supabase } from "./supabase";

// --- 1. AMBIL SETTINGAN SECARA DINAMIS BERDASARKAN TENANT ---
const getTenantSettings = async () => {
  const tenantId = localStorage.getItem("tenant_id");
  if (!tenantId) return null;

  const { data } = await supabase
    .from("receipt_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data;
};

// --- 2. EKSEKUSI STRUK KASIR ---
export const executePrint = async (receiptData: any) => {
  const settings = await getTenantSettings();
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN";
  
  const bridgeIp = settings?.bridge_ip || "127.0.0.1"; 
  const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

  try {
    await fetch(`${baseUrl}/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        ip_kasir: settings?.cashier_printer_ip,
        ip_office: settings?.office_printer_ip,
        storeName: settings?.store_name,
        address: settings?.address,
        contact: settings?.contact,
        footerText: settings?.footer_text,
        receipt_no: receiptData.receipt_no,
        tableName: receiptData.tableName,
        cashierName: receiptData.cashierName,
        items: receiptData.items,
        subtotal: receiptData.subtotal,
        serviceCharge: receiptData.serviceCharge,
        tax: receiptData.tax,
        total: receiptData.total,
        paid: receiptData.paid,
        change: receiptData.change,
        paymentMethod: receiptData.paymentMethod
      })
    });
  } catch (e) { 
    console.error("Gagal koneksi ke DISBA BRIDGE");
  }
};

// --- 3. EKSEKUSI TIKET DAPUR & BAR (Fungsi yang Bikin Blank) ---
export const executeKitchenPrint = async (receiptData: any) => {
  const settings = await getTenantSettings();
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN";
  const bridgeIp = settings?.bridge_ip || "127.0.0.1";
  const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

  try {
    await fetch(`${baseUrl}/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenantId,
        ip_dapur: settings?.kitchen_printer_ip,
        ip_bar: settings?.bar_printer_ip,
        ip_runner: settings?.runner_printer_ip,
        table_name: receiptData.tableName,
        items: receiptData.items
      })
    });
  } catch (e) {
    console.error("Gagal kirim order ke dapur/bar");
  }
};