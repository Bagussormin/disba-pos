// receipt/ReceiptPrint.tsx
interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
}

interface ReceiptData {
  receipt_no: string;
  table_name: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  cashier_name: string;
}

export const printReceipt = async (data: ReceiptData) => {
  try {
    // Mengambil nama outlet secara dinamis
    const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "STORE" : "STORE";
    const printerIp = typeof window !== "undefined" ? localStorage.getItem("printer_ip") || "127.0.0.1" : "127.0.0.1";

    // 1. MEMBANGUN TEMPLATE STRUK (KASIR)
    let text = `\n       *** ${tenantName.toUpperCase()} *** \n`;
    text += `    Powered by DISBA POS      \n`;
    text += `--------------------------------\n`;
    text += `No   : ${data.receipt_no}\n`;
    text += `Meja : ${data.table_name}\n`;
    text += `Kasir: ${data.cashier_name}\n`;
    text += `Jam  : ${new Date().toLocaleTimeString()}\n`;
    text += `--------------------------------\n`;

    data.items.forEach((item) => {
      text += `${item.name.toUpperCase()}\n`;
      text += `${item.qty} x ${item.price.toLocaleString()} = ${(item.qty * item.price).toLocaleString()}\n`;
    });

    text += `--------------------------------\n`;
    text += `Subtotal  : Rp ${data.subtotal.toLocaleString()}\n`;
    text += `Pajak 10% : Rp ${data.tax.toLocaleString()}\n`;
    text += `TOTAL     : Rp ${data.total.toLocaleString()}\n`;
    text += `--------------------------------\n`;
    text += `Metode    : ${data.payment_method.toUpperCase()}\n`;
    text += `\n    TERIMA KASIH ATAS\n`;
    text += `    KUNJUNGAN ANDA \n\n`;

    // 2. KIRIM KE PRINTER SERVICE
    const response = await fetch(`http://${printerIp}:4000/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
    });

    if (!response.ok) throw new Error("Printer Service tidak merespon");
    
    console.log("Struk berhasil dikirim ke printer kasir.");
    return true;
  } catch (error) {
    console.error("Error Cetak Struk:", error);
    alert("Gagal cetak struk. Pastikan Terminal Printer Service Aktif!");
    return false;
  }
};

// FUNGSI KHUSUS CETAK LAPORAN SHIFT
export const printShiftReport = async (reportData: any) => {
  try {
    const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "STORE" : "STORE";
    const printerIp = typeof window !== "undefined" ? localStorage.getItem("printer_ip") || "127.0.0.1" : "127.0.0.1";

    let text = `\n    *** LAPORAN SHIFT KASIR *** \n`;
    text += `        ${tenantName.toUpperCase()}        \n`;
    text += `--------------------------------\n`;
    text += `Tanggal : ${new Date().toLocaleDateString()}\n`;
    text += `Shift   : ${reportData.shift_name}\n`;
    text += `Kasir   : ${reportData.cashier_name}\n`;
    text += `--------------------------------\n`;
    text += `Total Penjualan : Rp ${reportData.total_sales.toLocaleString()}\n`;
    text += `Total Cash      : Rp ${reportData.total_cash.toLocaleString()}\n`;
    text += `Total QRIS/EDC  : Rp ${reportData.total_non_cash.toLocaleString()}\n`;
    text += `--------------------------------\n`;
    text += `\n\n      DICETAK PADA: \n`;
    text += `   ${new Date().toLocaleString()} \n\n`;

    await fetch(`http://${printerIp}:4000/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text }),
    });

    alert("Laporan Shift Berhasil Dicetak!");
  } catch (error) {
    console.error("Error Cetak Laporan:", error);
    alert("Gagal cetak laporan shift.");
  }
};