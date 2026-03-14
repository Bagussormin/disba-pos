import { supabase } from "./supabase"; // Pastikan path ini benar untuk file supabase.ts Anda

export const executePrint = async (receiptData: any) => {
  // 1. BACA SETTINGAN PRINTER DARI MEMORI KASIR/ADMIN
  const tenantId = localStorage.getItem("tenant_id") || "UNKNOWN_TENANT";
  const printerType = localStorage.getItem(`disba_printer_type_${tenantId}`) || "browser";
  const paperSize = localStorage.getItem(`disba_printer_size_${tenantId}`) || "58mm";
  const lanIp = localStorage.getItem(`disba_printer_lan_ip_${tenantId}`) || "";

  console.log(`Memulai cetak via: ${printerType.toUpperCase()} untuk Outlet: ${tenantId}`);

  // 2. MENGAMBIL PROFIL OUTLET DARI DATABASE (Dinamis)
  let outletProfile = {
    name: tenantId.replace(/_/g, " "),
    address: "Alamat belum diatur",
    phone: "Telp belum diatur",
    email: "Email belum diatur"
  };

  try {
    const { data } = await supabase
      .from("outlet_profile")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (data) {
      outletProfile = {
        name: data.name || outletProfile.name,
        address: data.address || outletProfile.address,
        phone: data.phone || outletProfile.phone,
        email: data.email || outletProfile.email
      };
    }
  } catch (err) {
    console.error("Gagal mengambil profil outlet untuk struk:", err);
  }

  // 3. LOGIKA PERCABANGAN PRINTER
  if (printerType === "lan") {
    if (!lanIp) {
      alert("Alamat IP Printer LAN belum disetting di Admin!");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/print-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_ip: lanIp, 
          
          // 🔥 DATA HEADER DINAMIS DARI DATABASE
          header_title: outletProfile.name.toUpperCase(),
          header_address: outletProfile.address,
          header_contact: `Telp: ${outletProfile.phone} | Email: ${outletProfile.email}`,
          footer_thanks: "--- TERIMA KASIH ---",
          footer_message: "Silakan berkunjung kembali",
          footer_wifi: "Powered by DISBA POS", // Diganti menjadi promosi sistem Anda
          
          payment_method: receiptData.paymentMethod, 
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
    printViaBrowser(receiptData, paperSize, outletProfile);
  }
};

// Fungsi Print Browser Biasa (Dinamis)
const printViaBrowser = (data: any, size: string, profile: any) => {
  const width = size === "58mm" ? "58mm" : "80mm";
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0px";
  iframe.style.height = "0px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const itemsHtml = data.items.map((item: any) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span>${item.qty}x ${item.name}</span>
      <span>${(item.price * item.qty).toLocaleString("id-ID")}</span>
    </div>
  `).join("");

  const htmlContent = `
    <html>
      <head>
        <style>
          @page { margin: 0; size: ${width} auto; }
          body { font-family: 'Courier New', Courier, monospace; width: ${width}; margin: 0; padding: 10px; font-size: 12px; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          .header-title { font-size: 16px; font-weight: 900; margin-bottom: 2px; text-transform: uppercase; }
          .header-sub { font-size: 10px; margin-bottom: 2px; }
          .footer-text { font-size: 10px; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="center header-title">${profile.name}</div>
        <div class="center header-sub">${profile.address}</div>
        <div class="center header-sub">Telp: ${profile.phone}</div>
        <div class="divider"></div>
        
        <div style="font-size: 10px; margin-bottom: 5px;">
          <div>Waktu: ${new Date().toLocaleString('id-ID')}</div>
          <div>Meja : ${data.tableName || "Takeaway"}</div>
          <div>Kasir: ${data.cashierName || localStorage.getItem("username") || "Kasir"}</div>
          <div>No   : ${data.receipt_no || "AUTO-GEN"}</div>
        </div>
        <div class="divider"></div>

        ${itemsHtml}
        
        <div class="divider"></div>

        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>Subtotal</span>
          <span>Rp ${data.subtotal.toLocaleString("id-ID")}</span>
        </div>
        
        ${data.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>Discount</span>
          <span>-Rp ${data.discount.toLocaleString("id-ID")}</span>
        </div>` : ''}
        
        ${data.serviceCharge > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>Service</span>
          <span>Rp ${data.serviceCharge.toLocaleString("id-ID")}</span>
        </div>` : ''}
        
        ${data.tax > 0 ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
          <span>PB1 (10%)</span>
          <span>Rp ${data.tax.toLocaleString("id-ID")}</span>
        </div>` : ''}
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
          <span>TOTAL</span>
          <span>Rp ${data.total.toLocaleString("id-ID")}</span>
        </div>
        
        ${data.paymentMethod === "CASH" ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
            <span>Tunai</span>
            <span>Rp ${data.paid.toLocaleString("id-ID")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>Kembali</span>
            <span>Rp ${data.change.toLocaleString("id-ID")}</span>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px;">
            <span>Metode Bayar</span>
            <span>${data.paymentMethod || "NON-TUNAI"}</span>
          </div>
        `}

        <div class="divider" style="margin-top: 15px;"></div>
        <div class="center bold footer-text">--- TERIMA KASIH ---</div>
        <div class="center footer-text">Silakan berkunjung kembali</div>
        <div class="center footer-text" style="margin-top: 8px;">Powered by DISBA POS</div>
        <div style="height: 40px;"></div> </body>
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