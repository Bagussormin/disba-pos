import { Capacitor, registerPlugin } from "@capacitor/core";

type PrintBlock = Record<string, unknown>;
type BluetoothPrinterPlugin = {
  print(options: { content: PrintBlock[] }): Promise<{ success: boolean; message?: string }>;
};
const NativeBluetoothPrinter = registerPlugin<BluetoothPrinterPlugin>("BluetoothPrinter");

type ReceiptData = {
  receipt_no: string;
  tableName: string;
  cashierName: string;
  items: Array<{ name?: string; qty?: number; price?: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paid: number;
  change: number;
  storeName: string;
  address?: string;
  contact?: string;
  footerText?: string;
};

const money = (value: unknown) =>
  "Rp " + Math.round(Number(value) || 0).toLocaleString("id-ID");
const divider = () => ({ type: "divider" });
const text = (value: string, align: "left" | "center" = "left", bold = false, size = "normal") =>
  ({ type: "text", text: value, align, bold, size });

async function sendBluetoothPrint(content: PrintBlock[]) {
  // Android uses the built-in native Bluetooth printer plugin; no Cleanster/bridge app required.
  if (Capacitor.getPlatform() === "android") {
    return NativeBluetoothPrinter.print({ content });
  }

  // Preserve the existing bridge route for browser/legacy installations.
  const response = await fetch("http://localhost:9100/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) throw new Error(`Printer bridge HTTP ${response.status}`);
  return response.json();
}

export async function testBluetoothPrint() {
  return sendBluetoothPrint([
    text("TES BLUETOOTH DISBA POS", "center", true, "large"),
    divider(),
    text("Alignment tengah: berhasil", "center"),
    text("Alignment kiri: berhasil", "left"),
    { type: "feed", lines: 3 },
  ]);
}

export async function printBluetoothReceipt(data: ReceiptData) {
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Data struk Bluetooth tidak valid atau kosong.");
  }

  const header = [data.storeName, data.address, data.contact].filter(Boolean).join("\n");
  const body = [
    `No: ${data.receipt_no}`,
    `Meja: ${data.tableName}`,
    `Kasir: ${data.cashierName}`,
    "--------------------------------",
    ...data.items.flatMap((item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return [
        String(item.name || "Barang").toUpperCase(),
        `  ${qty} x ${money(price)} = ${money(qty * price)}`,
      ];
    }),
    "--------------------------------",
    `Subtotal: ${money(data.subtotal)}`,
    `Diskon: ${money(data.discount)}`,
    `Pajak: ${money(data.tax)}`,
    `TOTAL: ${money(data.total)}`,
    `Bayar: ${data.paymentMethod}`,
    `Diterima: ${money(data.paid)}`,
    `Kembalian: ${money(data.change)}`,
  ].join("\n");

  return sendBluetoothPrint([
    text(header, "center", true),
    divider(),
    text(body, "left"),
    divider(),
    text((data.footerText || "Terima Kasih").toUpperCase(), "center", true),
    { type: "feed", lines: 4 },
  ]);
}

export async function printBluetoothShiftReport(data: any) {
  if (!data?.closingData) throw new Error("Data tutup shift tidak tersedia.");
  const c = data.closingData;
  const items = Array.isArray(data.items) ? data.items : [];
  const detailLines = [
    `Tanggal: ${c.date || "-"}`,
    `Kasir: ${data.cashierName || "-"}`,
    `Mulai: ${c.startTime || "-"}`,
    `Tutup: ${c.endTime || "-"}`,
    "--------------------------------",
    "RINCIAN BARANG TERJUAL",
    ...(items.length
      ? items.map((item: any) => `${String(item.name || "Barang").toUpperCase()}\n  ${Number(item.qty) || 0} x ${money(item.price)} = ${money(item.total ?? (Number(item.qty || 0) * Number(item.price || 0)))}`)
      : ["Tidak ada rincian barang"]),
    "--------------------------------",
    `Subtotal: ${money(c.subtotal)}`,
    `Diskon: ${money(c.diskonBill)}`,
    `Service: ${money(c.service)}`,
    `Penjualan: ${money(c.totalPenjualan)}`,
    `Awal laci: ${money(c.awalLaci)}`,
    `Penjualan tunai: ${money(c.kasPenjualan)}`,
    `Kas diharapkan: ${money(c.kasDiharapkan)}`,
    `Kas aktual: ${money(c.kasAktual)}`,
    `Selisih kas: ${money(c.kasSelisih)}`,
    `Item terjual: ${Number(c.totalItemTerjual) || 0}`,
  ].join("\n");

  return sendBluetoothPrint([
    text([data.storeName || "DISBA POS", data.address, data.contact].filter(Boolean).join("\n"), "center", true),
    text("LAPORAN TUTUP SHIFT", "center", true),
    divider(),
    text(detailLines, "left"),
    divider(),
    text((data.footerText || "Laporan selesai").toUpperCase(), "center", true),
    { type: "feed", lines: 4 },
  ]);
}
