
import { supabase } from "./supabase";

// REQUEST TIMEOUT CONFIG
const PRINT_REQUEST_TIMEOUT = 8000;

// Helper: fetch dengan timeout
export const fetchWithTimeout = (
  url: string,
  options: RequestInit = {},
  timeout = PRINT_REQUEST_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// Ambil pengaturan printer berdasarkan tenant
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

    if (!data) {
      throw new Error(
        "Pengaturan struk belum tersedia untuk tenant ini."
      );
    }

    return data;
  } catch (err) {
    console.error("Error fetching printer settings:", err);

    if (
      err instanceof Error &&
      err.message.includes("belum tersedia")
    ) {
      throw err;
    }

    throw new Error(
      "Gagal mengambil pengaturan printer. Silakan cek koneksi internet."
    );
  }
};

// Membuat URL printer bridge
const getBridgeUrl = (
  bridgeIp: string | null | undefined
): string => {
  const address = (bridgeIp || "127.0.0.1").trim();

  if (/^https?:\/\//i.test(address)) {
    return address.replace(/\/+$/, "");
  }

  return `http://${address}:4000`;
};

// Membaca pesan error dari bridge
const getResponseError = async (
  response: Response,
  defaultMessage: string
): Promise<string> => {
  try {
    const result = await response.json();

    return (
      result?.message ||
      result?.error ||
      `${defaultMessage}: ${response.status} ${response.statusText}`
    );
  } catch {
    return `${defaultMessage}: ${response.status} ${response.statusText}`;
  }
};

// Mengirim data ke printer bridge
const sendToBridge = async (
  endpoint: string,
  payload: Record<string, any>,
  defaultErrorMessage: string
): Promise<Response> => {
  const tenantId = localStorage.getItem("tenant_id");

  if (!tenantId) {
    throw new Error("Tenant ID tidak ditemukan. Harap login ulang.");
  }

  const settings = await getTenantSettings();
  const baseUrl = getBridgeUrl(settings.bridge_ip);

  const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error(
      await getResponseError(response, defaultErrorMessage)
    );
  }

  return response;
};

// Membuat pesan error yang konsisten
const getPrintErrorMessage = (
  err: unknown,
  fallback: string
): string => {
  if (err instanceof Error && err.name === "AbortError") {
    return "Timeout: Printer tidak merespons dalam 8 detik";
  }

  return err instanceof Error ? err.message : fallback;
};

// 1. CETAK STRUK KASIR / BILL CHECKER
export const executePrint = async (receiptData: any) => {
  try {
    if (
      !receiptData ||
      !Array.isArray(receiptData.items) ||
      receiptData.items.length === 0
    ) {
      throw new Error("Data struk tidak valid atau kosong.");
    }

    const settings = await getTenantSettings();

    await sendToBridge(
      "/print-receipt",
      {
        ip_kasir: settings.cashier_printer_ip,
        ip_office: settings.office_printer_ip,
        storeName: settings.store_name,
        address: settings.address,
        contact: settings.contact,
        footerText: settings.footer_text,
        documentType:
          receiptData.documentType || "PAYMENT_RECEIPT",
        receipt_no: receiptData.receipt_no,
        tableName: receiptData.tableName,
        cashierName: receiptData.cashierName,
        items: receiptData.items,
        subtotal: receiptData.subtotal,
        discount: receiptData.discount ?? 0,
        tax: receiptData.tax ?? 0,
        total: receiptData.total,
        paid: receiptData.paid,
        change: receiptData.change,
        paymentMethod: receiptData.paymentMethod,
      },
      "Gagal mencetak struk"
    );

    return {
      success: true,
      message: "Dokumen berhasil dikirim ke printer",
    };
  } catch (err: unknown) {
    const errorMsg = getPrintErrorMessage(
      err,
      "Gagal koneksi ke DISBA BRIDGE"
    );

    console.error("Print error:", errorMsg);
    throw new Error(errorMsg);
  }
};

// 2. CETAK TIKET DAPUR & BAR
export const executeKitchenPrint = async (receiptData: any) => {
  try {
    if (
      !receiptData ||
      !Array.isArray(receiptData.items) ||
      receiptData.items.length === 0
    ) {
      throw new Error("Data pesanan tidak valid atau kosong.");
    }

    const settings = await getTenantSettings();

    await sendToBridge(
      "/print-order",
      {
        ip_dapur: settings.kitchen_printer_ip,
        ip_bar: settings.bar_printer_ip,
        ip_runner: settings.runner_printer_ip,
        table_name: receiptData.tableName,
        items: receiptData.items,
      },
      "Gagal mencetak pesanan dapur/bar"
    );

    return {
      success: true,
      message: "Pesanan berhasil dikirim ke dapur/bar",
    };
  } catch (err: unknown) {
    const errorMsg = getPrintErrorMessage(
      err,
      "Gagal kirim order ke dapur/bar"
    );

    console.error("Kitchen print error:", errorMsg);
    throw new Error(errorMsg);
  }
};

// 3. CETAK LAPORAN TUTUP SHIFT
export const executeShiftClosingPrint = async (data: any) => {
  try {
    if (!data || !data.closingData) {
      throw new Error("Data tutup shift tidak tersedia.");
    }

    const settings = await getTenantSettings();

    await sendToBridge(
      "/print-settlement",
      {
        ip_kasir: settings.cashier_printer_ip,
        ip_office: settings.office_printer_ip,
        storeName:
          data.storeName || settings.store_name || "DISBA POS",
        address: settings.address,
        contact: settings.contact,
        footerText: settings.footer_text,
        cashierName: data.cashierName || "KASIR",
        items: Array.isArray(data.items) ? data.items : [],
        closingData: data.closingData,
      },
      "Gagal mencetak laporan tutup shift"
    );

    return {
      success: true,
      message: "Laporan tutup shift berhasil dikirim ke printer",
    };
  } catch (err: unknown) {
    const errorMsg = getPrintErrorMessage(
      err,
      "Gagal mencetak laporan tutup shift"
    );

    console.error("Shift closing print error:", errorMsg);
    throw new Error(errorMsg);
  }
};
