// LOKASI: src/lib/PrinterService.ts

export const printReceipt = async (data: any) => {
  try {
    let commands = "";
    const ESC = "\x1b";
    const CENTER = ESC + "\x61\x01";
    const LEFT = ESC + "\x61\x00";
    const BOLD_ON = ESC + "\x45\x01";
    const BOLD_OFF = ESC + "\x45\x00";
    const WIDTH = 32;

    const justifyRow = (leftStr: string, rightStr: string) => {
      const left = String(leftStr);
      const right = String(rightStr);
      const spaceNeeded = WIDTH - (left.length + right.length);
      return spaceNeeded > 0 ? left + " ".repeat(spaceNeeded) + right + "\n" : left + " " + right + "\n";
    };

    // 1. HEADER TOKO
    commands += CENTER + BOLD_ON + "NES CAFE AND RESTO\n" + BOLD_OFF;
    commands += CENTER + "Jl. Sudirman No. 61\n";
    commands += CENTER + "Pematang Siantar\n";
    commands += CENTER + "-".repeat(WIDTH) + "\n";
    
    // 2. INFO TRANSAKSI
    const now = new Date();
    const tgl = now.toLocaleDateString('id-ID');
    const jam = now.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}).replace('.', ':');
    
    commands += LEFT + justifyRow(`Tgl: ${tgl}`, `Jam: ${jam}`);
    commands += LEFT + justifyRow(`Kasir: ${data.cashier || "kasir"}`, `Meja: ${data.table_name || "-"}`);
    commands += LEFT + `Pelanggan: ${data.customer_name || "-"}\n`;
    commands += CENTER + "=".repeat(WIDTH) + "\n";
    
    // 3. DAFTAR ITEM
    let calculatedSubtotal = 0; 
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const name = item.name || "ITEM";
        const itemTotal = item.qty * item.price;
        calculatedSubtotal += itemTotal;
        commands += LEFT + BOLD_ON + name.toUpperCase() + BOLD_OFF + "\n";
        commands += LEFT + justifyRow(`  ${item.qty} x Rp ${item.price.toLocaleString()}`, `Rp ${itemTotal.toLocaleString()}`);
      });
    }

    // 4. RINCIAN PEMBAYARAN
    commands += CENTER + "-".repeat(WIDTH) + "\n";
    const discValue = data.discount || 0;
    const pb1Value = data.pb1 || 0;
    const grandTotal = (calculatedSubtotal - discValue) + pb1Value;

    commands += LEFT + justifyRow("Subtotal", `Rp ${calculatedSubtotal.toLocaleString()}`);
    if (discValue > 0) {
      commands += LEFT + justifyRow("Discount", `-Rp ${discValue.toLocaleString()}`);
      if (data.discount_reason) commands += LEFT + ` (${data.discount_reason})\n`;
    }
    commands += LEFT + justifyRow("PB1", `Rp ${pb1Value.toLocaleString()}`);
    commands += LEFT + BOLD_ON + justifyRow("TOTAL AKHIR", `Rp ${grandTotal.toLocaleString()}`) + BOLD_OFF;
    
    const bayar = data.paid || grandTotal;
    const kembalian = data.change !== undefined ? data.change : (bayar - grandTotal);
    commands += LEFT + justifyRow("Bayar (CASH)", `Rp ${bayar.toLocaleString()}`);
    commands += LEFT + justifyRow("Kembalian", `Rp ${kembalian.toLocaleString()}`);

    // 5. FOOTER
    commands += CENTER + "-".repeat(WIDTH) + "\n";
    commands += CENTER + "Terimakasih Atas Kunjungan Anda\n";
    commands += "\n\n\n\n\n\n\x1b\x69";

    await fetch('http://localhost:4000/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commands })
    });
  } catch (error) { console.error(error); }
};

// --- FUNGSI BARU UNTUK LAPORAN SHIFT ---
export const printShiftReport = async (data: any) => {
  try {
    let commands = "";
    const ESC = "\x1b";
    const CENTER = ESC + "\x61\x01";
    const LEFT = ESC + "\x61\x00";
    const BOLD_ON = ESC + "\x45\x01";
    const BOLD_OFF = ESC + "\x45\x00";
    const WIDTH = 32;

    const justifyRow = (leftStr: string, rightStr: string) => {
      const left = String(leftStr);
      const right = String(rightStr);
      const spaceNeeded = WIDTH - (left.length + right.length);
      return spaceNeeded > 0 ? left + " ".repeat(spaceNeeded) + right + "\n" : left + " " + right + "\n";
    };

    commands += CENTER + BOLD_ON + "LAPORAN TUTUP SHIFT\n" + BOLD_OFF;
    commands += CENTER + "NES CAFE AND RESTO\n";
    commands += CENTER + "-".repeat(WIDTH) + "\n";

    commands += LEFT + `Kasir  : ${data.cashier_name}\n`;
    commands += LEFT + `Mulai  : ${new Date(data.start_time).toLocaleString('id-ID')}\n`;
    commands += LEFT + `Selesai: ${new Date().toLocaleString('id-ID')}\n`;
    commands += CENTER + "=".repeat(WIDTH) + "\n";

    commands += LEFT + BOLD_ON + "RINGKASAN TUNAI\n" + BOLD_OFF;
    commands += LEFT + justifyRow("Modal Awal", `Rp ${data.starting_cash.toLocaleString()}`);
    commands += LEFT + justifyRow("Total Sales", `Rp ${data.total_sales.toLocaleString()}`);
    commands += LEFT + "-".repeat(WIDTH) + "\n";
    commands += LEFT + justifyRow("Total Sistem", `Rp ${data.expected_cash.toLocaleString()}`);
    commands += LEFT + justifyRow("Uang Fisik", `Rp ${data.actual_cash.toLocaleString()}`);
    
    const selisih = data.actual_cash - data.expected_cash;
    commands += LEFT + justifyRow("Selisih", `${selisih >= 0 ? '+' : ''}Rp ${selisih.toLocaleString()}`);
    commands += CENTER + "-".repeat(WIDTH) + "\n";

    if (data.items && data.items.length > 0) {
      commands += LEFT + BOLD_ON + "PENJUALAN PER ITEM\n" + BOLD_OFF;
      data.items.forEach((item: any) => {
        commands += LEFT + justifyRow(`${item.name} x${item.qty}`, `Rp ${item.total.toLocaleString()}`);
      });
      commands += CENTER + "-".repeat(WIDTH) + "\n";
    }

    commands += CENTER + "\nLaporan dicetak otomatis\n";
    commands += CENTER + "Disba POS System\n";
    commands += "\n\n\n\n\n\x1b\x69";

    await fetch('http://localhost:4000/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commands })
    });
  } catch (error) { console.error("Gagal cetak shift:", error); }
};