import { supabase } from "./supabase";

// ⏱️ REQUEST TIMEOUT CONFIG
const PRINT_REQUEST_TIMEOUT = 8000; // 8 seconds

// Helper function to fetch with timeout
export const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = PRINT_REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

// --- 1. AMBIL SETTINGAN SECARA DINAMIS BERDASARKAN TENANT ---
const getTenantSettings = async () => {
  const tenantId = localStorage.getItem("tenant_id");
  if (!tenantId) {
    throw new Error("Tenant ID tidak ditemukan. Harap login ulang.");
  }

  try {
    const { data, error } = await supabase
      .from("receipt_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error fetching printer settings:", err);
    throw new Error("Gagal mengambil pengaturan printer. Silakan cek koneksi internet.");
  }
};

// --- 2. EKSEKUSI STRUK KASIR ---
export const executePrint = async (receiptData: any) => {
  try {
    if (!receiptData || !receiptData.items) {
      throw new Error("Data struk tidak valid atau kosong.");
    }

    const settings = await getTenantSettings();
    const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN";

    const bridgeIp = settings?.bridge_ip || "127.0.0.1";
    const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

    const response = await fetchWithTimeout(`${baseUrl}/print-receipt`, {
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

    if (!response.ok) {
      throw new Error(`Printer error: ${response.statusText}`);
    }

    return { success: true, message: "Struk berhasil dikirim ke printer" };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError'
      ? "Timeout: Printer tidak merespons dalam 8 detik"
      : err.message || "Gagal koneksi ke DISBA BRIDGE";

    console.error("Print error:", errorMsg);
    throw new Error(errorMsg);
  }
};

// --- 3. EKSEKUSI TIKET DAPUR & BAR ---
export const executeKitchenPrint = async (receiptData: any) => {
  try {
    if (!receiptData || !receiptData.items) {
      throw new Error("Data pesanan tidak valid atau kosong.");
    }

    const settings = await getTenantSettings();
    const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN";
    const bridgeIp = settings?.bridge_ip || "127.0.0.1";
    const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

    const response = await fetchWithTimeout(`${baseUrl}/print-order`, {
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

    if (!response.ok) {
      throw new Error(`Kitchen printer error: ${response.statusText}`);
    }

    return { success: true, message: "Pesanan berhasil dikirim ke dapur/bar" };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError'
      ? "Timeout: Dapur/Bar printer tidak merespons dalam 8 detik"
      : err.message || "Gagal kirim order ke dapur/bar";

    console.error("Kitchen print error:", errorMsg);
    throw new Error(errorMsg);
  }
};