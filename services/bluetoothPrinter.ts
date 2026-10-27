
type ReceiptData = {
  receipt_no: string;
  tableName: string;
  cashierName: string;
  items: Array<{
    name?: string;
    qty?: number;
    price?: number;
  }>;
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

async function sendBluetoothPrint(content: Array<Record<string, unknown>>) {
  const response = await fetch("http://localhost:9100/print", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Cleanter HTTP ${response.status}`);
  }

  return response.json();
}

export async function testBluetoothPrint() {
  return sendBluetoothPrint([
    {
      type: "text",
      text: "TES BLUETOOTH DISBA POS",
      align: "center",
      bold: true,
      size: "large",
    },
    { type: "divider" },
    { type: "feed", lines: 3 },
  ]);
}

export async function printBluetoothReceipt(data: ReceiptData) {
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Data struk Bluetooth tidak valid atau kosong.");
  }

  const money = (value: number) =>
    `Rp ${Math.round(Number(value) || 0).toLocaleString("id-ID")}`;

  const lines = [
    data.storeName,
    data.address || "",
    data.contact || "",
    "--------------------------------",
    `No: ${data.receipt_no}`,
    `Meja: ${data.tableName}`,
    `Kasir: ${data.cashierName}`,
    "--------------------------------",
    ...data.items.map((item) => {
      const name = item.name || "Barang";
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return `${name}\n  ${qty} x ${money(price)} = ${money(qty * price)}`;
    }),
    "--------------------------------",
    `Subtotal: ${money(data.subtotal)}`,
    `Diskon: ${money(data.discount)}`,

    `Pajak: ${money(data.tax)}`,
    `TOTAL: ${money(data.total)}`,
    `Bayar: ${data.paymentMethod}`,
    `Diterima: ${money(data.paid)}`,
    `Kembalian: ${money(data.change)}`,
    "",
    data.footerText || "Terima Kasih",
  ].filter((line) => line !== "");

  const headerLines = [data.storeName, data.address || "", data.contact || ""].filter(Boolean);
  const footerLine = data.footerText || "Terima Kasih";
  const bodyLines = lines.slice(headerLines.length, -1);

  return sendBluetoothPrint([
    {
      type: "text",
      text: headerLines.join("\n"),
      align: "center",
      bold: true,
    },
    {
      type: "text",
      text: bodyLines.join("\n"),
      align: "left",
    },
    {
      type: "text",
      text: footerLine.toUpperCase(),
      align: "center",
      bold: true,
    },
    { type: "feed", lines: 3 },
  ]);
}
