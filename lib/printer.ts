import { supabase } from "./supabase"; 

// --- 1. MESIN PENCETAK BLUETOOTH / BROWSER (SANGAT AMAN) ---
const printStrukBrowser = (receiptData: any, paperSize: string = "58mm") => {
  // Membuat layar transparan sementara (iframe) agar aplikasi tidak berpindah halaman
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  const width = paperSize === "80mm" ? "75mm" : "58mm";

  // Merakit daftar pesanan
  let itemsHtml = "";
  if (receiptData.items && receiptData.items.length > 0) {
    receiptData.items.forEach((i: any) => {
      itemsHtml += `
        <div style="margin-bottom: 4px;">${i.name.toUpperCase()}</div>
        <div style="display: flex; justify-content: space-between;">
          <span>${i.qty} x ${Number(i.price || 0).toLocaleString('id-ID')}</span>
          <span>Rp${(i.qty * Number(i.price || 0)).toLocaleString('id-ID')}</span>
        </div>
      `;
    });
  }

  // Merakit desain struk standar thermal
  const html = `
    <html>
    <head>
      <title>Print Struk</title>
      <style>
        @page { margin: 0; }
        body { font-family: monospace; width: ${width}; margin: 0 auto; padding: 10px; font-size: 12px; color: #000; }
        .center { text-align: center; }
        .line { border-bottom: 1px dashed #000; margin: 8px 0; }
        .flex { display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      <div class="center">
        <h3>${receiptData.storeName || "DISBA POS"}</h3>
        <p style="margin:2px 0;">${receiptData.address || ""}</p>
      </div>
      <div class="line"></div>
      <div class="flex"><span>NO:</span><span>${receiptData.orderId || "-"}</span></div>
      <div class="flex"><span>MEJA:</span><span>${receiptData.tableName || "-"}</span></div>
      <div class="flex"><span>KASIR:</span><span>${receiptData.cashierName || "-"}</span></div>
      <div class="flex"><span>TGL:</span><span>${new Date().toLocaleString('id-ID')}</span></div>
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="flex"><span>SUBTOTAL</span><span>Rp${Number(receiptData.subtotal || 0).toLocaleString('id-ID')}</span></div>
      ${receiptData.tax ? `<div class="flex"><span>PB1</span><span>Rp${Number(receiptData.tax).toLocaleString('id-ID')}</span></div>` : ''}
      <div class="line"></div>
      <div class="flex" style="font-weight:bold; font-size:14px; margin-top:5px;"><span>TOTAL</span><span>Rp${Number(receiptData.total || 0).toLocaleString('id-ID')}</span></div>
      <div class="line"></div>
      <div class="center" style="margin-top: 10px; font-style: italic;">
        ${receiptData.footerText || "TERIMA KASIH"}
      </div>
    </body>
    </html>
  `;

  // Mengeksekusi perintah Print ke OS (Windows/Android)
  if (iframe.contentWindow) {
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Menghapus layar transparan setelah selesai
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 500);
  }
};

// --- 2. FUNGSI UTAMA: CETAK STRUK KASIR (SaaS READY) ---
export const executePrint = async (receiptData: any) => {
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";
  
  // Mambaca memori dari halaman PrinterSettings tadi
  const printerType = localStorage.getItem(`disba_type_kasir_${tenantId}`) || localStorage.getItem(`disba_printer_type_${tenantId}`) || "browser";
  const paperSize = localStorage.getItem(`disba_printer_size_${tenantId}`) || "58mm";
  const bridgeIp = localStorage.getItem("printer_ip") || "127.0.0.1";
  const lanIp = localStorage.getItem(`disba_ip_kasir_${tenantId}`) || "";

  if (printerType === "lan") {
    try {
      console.log("🚀 Menembak Kasir via LAN Node.js...");
      await fetch(`http://${bridgeIp}:4000/print-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_ip: lanIp,
          header_title: receiptData.storeName || "DISBA POS",
          header_address: receiptData.address || "",
          header_contact: receiptData.contact || "",
          payment_method: receiptData.paymentMethod || "CASH",
          table_name: receiptData.tableName || "Takeaway",
          cashier: receiptData.cashierName || localStorage.getItem("username") || "KASIR",
          items: receiptData.items,
          subtotal: receiptData.subtotal || 0,
          total: receiptData.total || 0,
          receipt_no: receiptData.orderId || "-"
        })
      });
    } catch (e) { console.error("❌ Gagal koneksi Kasir LAN:", e); }
  } 
  else if (printerType === "browser" || printerType === "off") {
    console.log("🖨️ Menembak Kasir via Bluetooth/Browser...");
    printStrukBrowser(receiptData, paperSize);
  }
};

// --- 3. FUNGSI KHUSUS: CETAK TIKET DAPUR & BAR (DENGAN X-RAY) ---
export const executeKitchenPrint = async (receiptData: any) => {
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";
  const bridgeIp = localStorage.getItem("printer_ip") || "127.0.0.1";
  
  // 🔥 PENGAMAN: Ubah semua jadi huruf kecil agar tidak miss
  const typeDapur = (localStorage.getItem(`disba_type_dapur_${tenantId}`) || "lan").toLowerCase();
  const typeBar = (localStorage.getItem(`disba_type_bar_${tenantId}`) || "lan").toLowerCase();
  const ipDapur = localStorage.getItem(`disba_ip_dapur_${tenantId}`);
  const ipBar = localStorage.getItem(`disba_ip_bar_${tenantId}`);

  console.log("==================================");
  console.log("🔍 [X-RAY] STATUS PRINTER SETTINGS");
  console.log(`DAPUR -> Tipe: ${typeDapur} | IP: ${ipDapur}`);
  console.log(`BAR   -> Tipe: ${typeBar} | IP: ${ipBar}`);
  console.log("==================================");

  const itemsDapur: any[] = [];
  const itemsBar: any[] = [];

  const keywordsMinuman = ["DRINK", "BEVERAGE", "KOPI", "COFFEE", "TEA", "TEH", "ES", "ICE", "JUICE", "JUS", "MILK", "SUSU", "LATTE", "ESPRESSO", "SQUASH", "SMOOTHIE", "MOCKTAIL", "SYRUP", "SIRUP", "BOTOL", "BOTTLE"];
  const keywordsPaket = ["PAKET", "COMBO", "BUNDLING", "PROMO", "SET MENU"];

  receiptData.items.forEach((item: any) => {
      // Jika kosong, anggap FOOD agar tetap tercetak di dapur
      const cat = (item.category || "FOOD").toUpperCase(); 
      console.log(`📋 [MEMERIKSA ITEM] Nama: ${item.name} | Kategori Asli: ${cat}`);
      
      const isPaket = keywordsPaket.some(kw => cat.includes(kw));
      const isMinuman = keywordsMinuman.some(kw => cat.includes(kw));

      if (isPaket) {
          itemsDapur.push(item);
          itemsBar.push(item);
          console.log(`   --> MASUK KE: DAPUR & BAR (Target Paket)`);
      } else if (isMinuman) {
          itemsBar.push(item);
          console.log(`   --> MASUK KE: BAR (Target Minuman)`);
      } else {
          // 🔥 PERBAIKAN: Semua yang BUKAN minuman/paket otomatis masuk Dapur (Aman dari kebocoran)
          itemsDapur.push(item);
          console.log(`   --> MASUK KE: DAPUR (Target Makanan / Lainnya)`);
      }
  });

  console.log(`\n📊 [HASIL RADAR] Antrean Dapur: ${itemsDapur.length} | Antrean Bar: ${itemsBar.length}`);

  // 🚀 1. TEMBAK KE DAPUR
  if (itemsDapur.length > 0) {
      if (typeDapur === "lan" && ipDapur) {
          console.log(`🔥 [EKSEKUSI] Menembak ${itemsDapur.length} Item ke DAPUR (${ipDapur})...`);
          try {
              await fetch(`http://${bridgeIp}:4000/print-order`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      ip_dapur: ipDapur,
                      table_name: receiptData.tableName || "Takeaway",
                      waiter: receiptData.cashierName || localStorage.getItem("username") || "KASIR",
                      items: itemsDapur 
                  })
              });
          } catch (error) { console.error("❌ GAGAL KONTAK DAPUR:", error); }
      } else {
          console.log(`⚠️ [BATAL DAPUR] Tipe bukan LAN atau IP kosong!`);
      }
  }

  // 🚀 2. TEMBAK KE BAR
  if (itemsBar.length > 0) {
      if (typeBar === "lan" && ipBar) {
          console.log(`🔥 [EKSEKUSI] Menembak ${itemsBar.length} Item ke BAR (${ipBar})...`);
          try {
              await fetch(`http://${bridgeIp}:4000/print-order`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      ip_bar: ipBar,
                      table_name: receiptData.tableName || "Takeaway",
                      waiter: receiptData.cashierName || localStorage.getItem("username") || "KASIR",
                      items: itemsBar 
                  })
              });
          } catch (error) { console.error("❌ GAGAL KONTAK BAR:", error); }
      } else {
          console.log(`⚠️ [BATAL BAR] Tipe bukan LAN atau IP kosong!`);
      }
  }
};