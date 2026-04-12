import { supabase } from "./supabase";

// --- 1. AMBIL SETTINGAN DARI HQ PANEL ---
const getReceiptSettings = async () => {
  const tenantId = localStorage.getItem("tenant_id") || "NES_HOUSE_001";
  const { data } = await supabase
    .from("receipt_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data;
};

// --- 2. EKSEKUSI STRUK KASIR (DENGAN PB1 & SERVICE) ---
export const executePrint = async (receiptData: any) => {
  const bridgeIp = "192.168.1.56"; 
  const cashierIp = "192.168.1.27";
  
  const settings = await getReceiptSettings();

  // HITUNG PAJAK & SERVICE
  const items = receiptData.items || [];
  const subtotal = items.reduce((acc: number, item: any) => acc + (item.qty * (item.price || 0)), 0);
  
  const serviceCharge = Math.round(subtotal * 0.07); // 7% Service
  const pb1 = Math.round((subtotal + serviceCharge) * 0.10); // 10% PB1
  const grandTotal = subtotal + serviceCharge + pb1;

  try {
    await fetch(`http://${bridgeIp}:4000/print-receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // SEBELUMNYA:
        target_ip: cashierIp,
        ip_kasir: cashierIp,
        header_title: settings?.store_name || "NES HOUSE COLD BREW",
        header_address: settings?.address || "JL. SUDIRMAN NO. 61 AB PEMATANG SIANTAR",
        header_contact: settings?.contact || "",
        footer_text: settings?.footer_text || "Terima Kasih Atas Kunjungan Anda",
        
        // Data angka untuk struk
        subtotal: subtotal,
        service_charge: serviceCharge,
        tax_pb1: pb1,
        total: grandTotal,
        
        // Data transaksi lainnya
        items: items,
        receipt_no: receiptData.receipt_no,
        table_name: receiptData.tableName,
        cashier: receiptData.cashierName,
        payment_method: receiptData.paymentMethod
      })
    });
  } catch (e) { 
    console.error("Gagal koneksi ke laptop bridge");
  }
};

// --- 3. EKSEKUSI TIKET DAPUR & BAR ---
export const executeKitchenPrint = async (receiptData: any) => {
  const bridgeIp = "192.168.1.56";
  const ipDapur = "192.168.1.30";
  const ipBar = "192.168.1.24";

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
    fetch(`http://${bridgeIp}:4000/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_bar: ipBar, items: itemsBar, table_name: receiptData.tableName, waiter: receiptData.cashierName })
    });
  }

  if (itemsDapur.length > 0) {
    fetch(`http://${bridgeIp}:4000/print-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip_dapur: ipDapur, items: itemsDapur, table_name: receiptData.tableName, waiter: receiptData.cashierName })
    });
  }
};