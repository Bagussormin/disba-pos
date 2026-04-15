import { supabase } from "./supabase";

// --- 1. AMBIL SETTINGAN LENGKAP (Termasuk Bridge IP) ---
const getTenantSettings = async () => {
  const tenantId = localStorage.getItem("tenant_id") || "NES_HOUSE_001";
  const { data, error } = await supabase
    .from("receipt_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  
  if (error) console.error("Gagal ambil setting tenant:", error);
  return data;
};

// =========================================================================
// 🖨️ ENGINE 1: WEB NATIVE PRINT (USB, BLUETOOTH, VIRTUAL, ZERO-CONFIG)
// =========================================================================
const printViaBrowser = (receiptData: any, settings: any, pb1: number, serviceCharge: number, subtotal: number, grandTotal: number) => {
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert("Pop-up diblokir. Harap izinkan pop-up untuk mencetak struk web.");
    return false;
  }

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${receiptData.receipt_no || Math.random().toString(36).substring(7)}</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; color: #000; font-size: 11px; padding: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; margin: 6px 0; padding-bottom: 2px; }
          .flex { display: flex; justify-content: space-between; }
          .mt { margin-top: 8px; }
          @media print {
            @page { margin: 0; }
            body { width: 100%; margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="text-center bold" style="font-size: 16px;">${settings?.store_name || "DISBA POS TERMINAL"}</div>
        ${settings?.address ? `<div class="text-center">${settings.address}</div>` : ''}
        <div class="border-b mt"></div>
        <div>NO   : ${receiptData.receipt_no || "-"}</div>
        <div>MEJA : ${receiptData.tableName || "-"}</div>
        <div>KASIR: ${receiptData.cashierName || "-"}</div>
        <div>JAM  : ${new Date().toLocaleString('id-ID')}</div>
        <div class="border-b mt"></div>
  `;

  const items = receiptData.items || [];
  items.forEach((i: any) => {
    html += `
        <div>${(i.name || "ITEM").toUpperCase()}</div>
        <div class="flex">
          <span>${i.qty} x ${(i.price || 0).toLocaleString('id-ID')}</span>
          <span>${(i.qty * (i.price || 0)).toLocaleString('id-ID')}</span>
        </div>
    `;
  });

  html += `
        <div class="border-b mt"></div>
        <div class="flex"><span>SUBTOTAL:</span> <span>${subtotal.toLocaleString('id-ID')}</span></div>
        <div class="flex bold mt" style="font-size: 13px;"><span>TOTAL:</span> <span>${grandTotal.toLocaleString('id-ID')}</span></div>
        <div class="border-b mt"></div>
        <div class="text-center bold mt">*** ${receiptData.paymentMethod || "LUNAS"} ***</div>
        ${settings?.footer_text ? `<div class="text-center mt">${settings.footer_text}</div>` : `<div class="text-center mt">Terima Kasih</div>`}
        
        <script>
          // Trigger Print Automatis
          setTimeout(() => {
            window.print();
            window.close();
          }, 800);
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};

// =========================================================================
// 🖨️ ENGINE 2: LAN STATIC IP PRINT (VIA NODE BRIDGE TCP)
// =========================================================================
export const executePrint = async (receiptData: any) => {
  const settings = await getTenantSettings();
  
  const bridgeIp = settings?.bridge_ip || ""; 
  const cashierIp = settings?.cashier_printer_ip || "";

  // Kalkulasi Keuangan
  const items = receiptData.items || [];
  const subtotal = items.reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0);
  const serviceCharge = Math.round(subtotal * 0.05); 
  const pb1 = Math.round((subtotal + serviceCharge) * 0.10); 
  const grandTotal = subtotal + serviceCharge + pb1;

  // AUTO SWITCH ENGINE - FALLBACK MODE
  // Jika bridgeIp di set "WEB_MODE" atau kosong murni, langsung ke Browser Print (USB/Bluetooth Universal)
  if (!bridgeIp || bridgeIp.toUpperCase() === "WEB_MODE" || bridgeIp === "0.0.0.0") {
    console.log("🖨️ [DUAL ENGINE] -> Beralih ke WEB NATIVE MODE (Aman tanpa server lokal)");
    return printViaBrowser(receiptData, settings, pb1, serviceCharge, subtotal, grandTotal);
  }

  // Jika tetap ingin masuk mode TCP LAN Bridge:
  const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;
  console.log("🖨️ [DUAL ENGINE] -> Menggunakan TCP LAN Bridge / Node Server di:", baseUrl);

  try {
    const response = await fetch(`${baseUrl}/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_ip: cashierIp,
        ip_kasir: cashierIp,
        header_title: settings?.store_name || "NES HOUSE",
        header_address: settings?.address || "",
        header_contact: settings?.contact || "",
        footer_text: settings?.footer_text || "Terima Kasih",
        subtotal: subtotal,
        service_charge: serviceCharge,
        tax_pb1: pb1,
        total: grandTotal,
        items: items,
        receipt_no: receiptData.receipt_no,
        table_name: receiptData.tableName,
        cashier: receiptData.cashierName,
        payment_method: receiptData.paymentMethod
      })
    });
    
    // Jika Bridge Error di servernya
    if (!response.ok) {
      console.warn("⚠️ TCP Bridge Gagal Menembak. Fallback ke Web Mode Otomatis!");
      return printViaBrowser(receiptData, settings, pb1, serviceCharge, subtotal, grandTotal);
    }
    return true;
    
  } catch (e) { 
    console.warn("⚠️ Tidak Terdapat Print Bridge Server Aktif. Fitur Pengaman (Fallback) Web Mode Diaktifkan Otomatis.");
    // Proteksi pamungkas: kalau server Node (server.js) sedang mati/lumpuh/error mixed content,
    // langsung berikan struk HTML PopUp agar kasir tetap bisa cetak.
    return printViaBrowser(receiptData, settings, pb1, serviceCharge, subtotal, grandTotal);
  }
};

// --- 3. EKSEKUSI TIKET DAPUR & BAR (Dinamis TCP) ---
// *Note: Dapur dan Bar sangat direkomendasikan tetap menggunakan LAN TCP,
// karena Windows Print Browser tidak dapat dialihkan ke dapur secara tersembunyi.
export const executeKitchenPrint = async (receiptData: any) => {
  const settings = await getTenantSettings();
  const bridgeIp = settings?.bridge_ip || "";
  
  if (!bridgeIp || bridgeIp.toUpperCase() === "WEB_MODE" || bridgeIp === "0.0.0.0") {
      console.warn("🚫 (Info) Mode Dapur/Bar dibatalkan karena tidak ada Print Bridge Aktif. Kertas pesanan harus diberikan secara manual oleh waiter.");
      return;
  }

  const ipDapur = settings?.kitchen_printer_ip || "127.0.0.1";
  const ipBar = settings?.bar_printer_ip || "127.0.0.1";
  const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

  const keywordsBar = [
    "BEER", "BINTANG", "HEINEKEN", "ANKER", "SOJU", "VIBE", "WHISKEY", "VODKA",
    "COFFEE", "KOPI", "TEA", "TEH", "JUICE", "JUS", "SMOOTHIES", "NON COFFEE",
    "MOCKTAIL", "SIGNATURE", "COCKTAIL", "BOTLE ALCOHOL", "JUNGLE JUICE", 
    "VAPE", "ROKOK", "ADD ON BAR", "PARAMAD", "MINUMAN"
  ];

  const itemsBar = receiptData.items.filter((item: any) => {
    const cat = (item.category || "").toUpperCase();
    const name = (item.name || "").toUpperCase();
    return keywordsBar.some(kw => cat.includes(kw) || name.includes(kw));
  });

  const itemsDapur = receiptData.items.filter((item: any) => {
    const cat = (item.category || "").toUpperCase();
    const name = (item.name || "").toUpperCase();
    return !keywordsBar.some(kw => cat.includes(kw) || name.includes(kw));
  });

  if (itemsBar.length > 0) {
    fetch(`${baseUrl}/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_bar: ipBar, items: itemsBar, table_name: receiptData.tableName, waiter: receiptData.cashierName })
    }).catch(err => console.error("Bar Print Error:", err));
  }

  if (itemsDapur.length > 0) {
    fetch(`${baseUrl}/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_dapur: ipDapur, items: itemsDapur, table_name: receiptData.tableName, waiter: receiptData.cashierName })
    }).catch(err => console.error("Kitchen Print Error:", err));
  }
};