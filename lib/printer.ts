// File ini yang boleh di-import ke KasirHome.tsx

export const executePrint = async (receiptData: any) => {
  // 1. BACA SETTINGAN DARI ADMIN
  const printerType = localStorage.getItem("disba_printer_type") || "browser";
  const paperSize = localStorage.getItem("disba_printer_size") || "58mm";
  const lanIp = localStorage.getItem("disba_printer_lan_ip") || "";

  console.log(`Memulai cetak via: ${printerType.toUpperCase()}`);

  // 2. LOGIKA PERCABANGAN PRINTER
  if (printerType === "lan") {
    // KONDISI A: MENGGUNAKAN PRINTER LAN (Mengirim ke PrinterService.ts)
    if (!lanIp) {
      alert("Alamat IP Printer LAN belum disetting di Admin!");
      return;
    }

    try {
      // Mengirim request ke Server Jembatan (PrinterService.ts) di localhost:4000
      const response = await fetch("http://localhost:4000/print-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_ip: lanIp, // Mengirim IP hasil settingan Admin ke backend
          table_name: receiptData.tableName || "Takeaway",
          cashier: receiptData.cashierName || localStorage.getItem("username"),
          items_list: receiptData.items,
          subtotal: receiptData.subtotal,
          discount_total: receiptData.discount || 0,
          service_charge: receiptData.serviceCharge || 0,
          tax_total: receiptData.tax || 0,
          total: receiptData.total,
          paid: receiptData.paid || 0,
          change: receiptData.change || 0
        })
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error("Gagal terhubung ke Bridge Printer");
      console.log("Sukses kirim ke LAN:", result);

    } catch (error) {
      console.error(error);
      alert("Gagal mencetak LAN. Pastikan Aplikasi Bridge (PrinterService) sedang berjalan di komputer Kasir.");
    }

  } else {
    // KONDISI B: BROWSER PRINT (Default / Fallback)
    printViaBrowser(receiptData, paperSize);
  }
};

// Fungsi Print Browser Biasa (Bisa dipakai kalau outlet tidak punya LAN)
const printViaBrowser = (data: any, size: string) => {
  const width = size === "58mm" ? "58mm" : "80mm";
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const itemsHtml = data.items.map((item: any) => `
    <div style="display: flex; justify-content: space-between;">
      <span>${item.qty}x ${item.name}</span>
      <span>${(item.price * item.qty).toLocaleString("id-ID")}</span>
    </div>
  `).join("");

  const htmlContent = `
    <html>
      <head>
        <style>
          @page { margin: 0; size: ${width} auto; }
          body { font-family: monospace; width: ${width}; margin: 0; padding: 10px; font-size: 12px; }
          .center { text-align: center; font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="center">DISBA CAFE</div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>TOTAL</span>
          <span>Rp ${data.total.toLocaleString("id-ID")}</span>
        </div>
        <div class="center" style="margin-top: 10px;">TERIMA KASIH</div>
      </body>
    </html>
  `;

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 500);
  }
};