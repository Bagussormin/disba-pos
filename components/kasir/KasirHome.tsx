import { fetchWithTimeout } from "../../lib/printer";
import { safeJSONParse } from "../../lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, Loader2, ShoppingBag, Search,
  Scissors, Users, Star, Compass, QrCode, Wifi, WifiOff
} from "lucide-react";

export default function KasirHome() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]); 
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null); 
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [banks, setBanks] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") || "" : "";

  // --- DYNAMIC FISCAL SETTINGS ---
  const [fiscalSettings, setFiscalSettings] = useState({ tax_rate: 0.10, service_charge: 0.05, use_tax: true, use_service_charge: true, loyalty_point_rate: 1000 });

  // --- CUSTOMER / CRM ---
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // --- SPLIT BILL ---
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});

  const [lastIncomingOrder, setLastIncomingOrder] = useState<number>(0);
  const [showStartShiftModal, setShowStartShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveViewMode, setArchiveViewMode] = useState<"SHIFT_LIST" | "BILL_LIST" | "ITEM_LIST">("SHIFT_LIST");
  const [pastShifts, setPastShifts] = useState<any[]>([]);
  const [archiveTransactions, setArchiveTransactions] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);
  const [selectedShiftLabel, setSelectedShiftLabel] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [shiftSummary, setShiftSummary] = useState({ 
    totalSales: 0, cashSales: 0, transferSales: 0, trxCount: 0 
  });

  const cashInputRef = useRef<HTMLInputElement>(null);
  const prevTableIdRef = useRef<any>(null);
  const dynamicAreas = Array.from(new Set(tables.map(t => (t.area || "Area Lainnya").toUpperCase())));

  // --- OFFLINE SYNC HANDLERS ---
  const syncOfflineTransactions = async () => {
    if (!navigator.onLine || isSyncing) return;
    const queue = localStorage.getItem("disba_offline_transactions");
    if (!queue) return;
    const transactions = safeJSONParse(queue, []);
    if (transactions.length === 0) return;

    setIsSyncing(true);
    let successfullySynced: string[] = [];

    for (const trx of transactions) {
      try {
        const { error } = await supabase.from("transactions").insert(trx.data);
        if (!error) {
          await supabase.from("orders").update({ status: "completed" })
            .eq("id", trx.order_id).eq("tenant_id", tenantId);
          await supabase.from("tables").update({ status: "available" })
            .eq("id", trx.table_id).eq("tenant_id", tenantId);
          successfullySynced.push(trx.id);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi transaksi offline:", err);
      }
    }

    if (successfullySynced.length > 0) {
      const remaining = transactions.filter((t: any) => !successfullySynced.includes(t.id));
      localStorage.setItem("disba_offline_transactions", JSON.stringify(remaining));
      fetchData();
      alert(`✅ Sinkronisasi Berhasil: ${successfullySynced.length} transaksi offline berhasil diunggah ke server!`);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineTransactions();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    checkActiveShift();
    fetchData();
    fetchBanks();
    fetchFiscalSettings();

    // Trigger sync jika online saat load
    if (navigator.onLine) {
      syncOfflineTransactions();
    }

    const channel = supabase.channel(`pos-realtime-${tenantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items', filter: `tenant_id=eq.${tenantId}` }, () => setLastIncomingOrder(Date.now()))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  useEffect(() => { if (activeOrder) fetchOrderItems(activeOrder.id); }, [lastIncomingOrder]);

  useEffect(() => {
    if (selectedTable) {
      const o = orders.find(order => order.table_id === selectedTable.id);
      setActiveOrder(o || null);
      if (prevTableIdRef.current !== selectedTable.id) {
        setDiscount(0); setPaidAmount(0); setPaymentMethod("CASH"); setSelectedBank(null);
        prevTableIdRef.current = selectedTable.id; setTimeout(() => cashInputRef.current?.focus(), 100);
      }
      if (o) fetchOrderItems(o.id); else setOrderItems([]);
    } else { prevTableIdRef.current = null; setActiveOrder(null); setOrderItems([]); }
  }, [tables, orders, selectedTable]);

  const fetchFiscalSettings = async () => {
    try {
      const { data } = await supabase.from("receipt_settings").select("tax_rate,service_charge,use_tax,use_service_charge,loyalty_point_rate").eq("tenant_id", tenantId).maybeSingle();
      if (data) setFiscalSettings({ tax_rate: data.tax_rate ?? 0.10, service_charge: data.service_charge ?? 0.05, use_tax: data.use_tax !== false, use_service_charge: data.use_service_charge !== false, loyalty_point_rate: data.loyalty_point_rate ?? 1000 });
    } catch (err) {
      // Using default fiscal settings
    }
  };

  const searchCustomers = async (q: string) => {
    if (!isOnline) return;
    setCustomerSearch(q);
    if (q.length < 2) { setCustomerResults([]); setShowCustomerDropdown(false); return; }
    const { data } = await supabase.from("customers").select("id,name,phone,points").eq("tenant_id", tenantId).or(`name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5);
    if (data) { setCustomerResults(data); setShowCustomerDropdown(true); }
  };

  const fetchBanks = async () => {
    try {
      const { data } = await supabase.from("merchant_banks").select("*").eq("tenant_id", tenantId).eq("is_active", true);
      if (data) {
        setBanks(data);
        localStorage.setItem("disba_cache_banks", JSON.stringify(data));
      }
    } catch (err) {
      const cached = localStorage.getItem("disba_cache_banks");
      if (cached) setBanks(safeJSONParse(cached, []));
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, oRes] = await Promise.all([
        supabase.from("tables").select("*").eq("tenant_id", tenantId).order("name", { ascending: true }),
        supabase.from("orders").select("*").eq("tenant_id", tenantId).eq("status", "open") 
      ]);
      if (tRes.error) throw tRes.error;
      if (oRes.error) throw oRes.error;

      if (tRes.data) {
        setTables(tRes.data);
        localStorage.setItem("disba_cache_tables", JSON.stringify(tRes.data));
      }
      if (oRes.data) {
        setOrders(oRes.data);
        localStorage.setItem("disba_cache_orders", JSON.stringify(oRes.data));
      }
    } catch (err) {
      // Using cached table and order data - offline mode
      const cachedTables = localStorage.getItem("disba_cache_tables");
      const cachedOrders = localStorage.getItem("disba_cache_orders");
      
      let finalTables = [];
      let finalOrders = [];

      if (cachedTables) {
        finalTables = safeJSONParse(cachedTables, []);
      } else {
        finalTables = [
          { id: 1, name: "Meja 1", status: "available", area: "Area Utama" },
          { id: 2, name: "Meja 2", status: "available", area: "Area Utama" },
          { id: 3, name: "Meja 3", status: "available", area: "Area Utama" },
          { id: 4, name: "Meja 4", status: "available", area: "Area Utama" },
          { id: 5, name: "Meja 5", status: "available", area: "Teras" },
          { id: 6, name: "Meja 6", status: "available", area: "Teras" }
        ];
        localStorage.setItem("disba_cache_tables", JSON.stringify(finalTables));
      }

      if (cachedOrders) {
        finalOrders = safeJSONParse(cachedOrders, []);
      } else {
        finalOrders = [];
        localStorage.setItem("disba_cache_orders", JSON.stringify(finalOrders));
      }

      setTables(finalTables);
      setOrders(finalOrders);
    }
  };

  const fetchOrderItems = async (orderId: string) => {
    try {
      const { data: orderData } = await supabase.from("order_items").select(`*, menus(name, category)`).eq("order_id", orderId).eq("tenant_id", tenantId);
      if (orderData) {
        const items = orderData.map((item: any) => ({
          id: item.menu_id, 
          order_item_id: item.id, 
          name: item.menus?.name || item.name || `Menu ID: ${item.menu_id}`, 
          qty: item.quantity || 1, 
          price: item.price_at_time || 0,
          category: item.menus?.category || "FOOD" 
        }));
        setOrderItems(items);
        localStorage.setItem(`disba_cache_order_items_${orderId}`, JSON.stringify(items));
      } else setOrderItems([]);
    } catch (err) {
      // Using cached order items - offline mode
      const cachedItems = localStorage.getItem(`disba_cache_order_items_${orderId}`);
      if (cachedItems) setOrderItems(safeJSONParse(cachedItems, []));
    }
  };

  const fetchShiftHistory = async (mode: "BILL_LIST" | "ITEM_LIST") => {
    if (!isOnline) return alert("Menu arsip rekap hanya tersedia saat online.");
    setLoading(true);
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("start_time", { ascending: false })
      .limit(30);

    if (!error) {
      setPastShifts(data || []);
      setArchiveViewMode("SHIFT_LIST");
      setShowArchiveModal(true);
      (window as any).nextMode = mode;
    }
    setLoading(false);
  };

  const handleSelectShift = async (shift: any) => {
    setLoading(true);
    const targetMode = (window as any).nextMode || "BILL_LIST";
    
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("shift_id", shift.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (!error && transactions) {
      setSelectedShiftLabel(`${new Date(shift.start_time).toLocaleDateString('id-ID')} | ${shift.cashier_name}`);
      
      if (targetMode === "BILL_LIST") {
        setArchiveTransactions(transactions);
        setArchiveViewMode("BILL_LIST");
      } else {
        const summary: any = {};
        transactions.forEach((trx: any) => {
          const items = typeof trx.items === 'string' ? safeJSONParse(trx.items, []) : trx.items;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const name = (item.name || "Unknown").toUpperCase();
              if (!summary[name]) summary[name] = 0;
              summary[name] += Number(item.qty || 0);
            });
          }
        });
        setItemSales(Object.keys(summary).map(name => ({ name, qty: summary[name] })).sort((a, b) => b.qty - a.qty));
        setArchiveViewMode("ITEM_LIST");
      }
    }
    setLoading(false);
  };

  const handleStartShift = async () => {
    const username = localStorage.getItem("username") || "KASIR";
    if (isOnline) {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("shifts").insert({
          tenant_id: tenantId,
          cashier_name: username,
          starting_cash: startCash,
          status: "open",
          start_time: new Date().toISOString()
        }).select().single();

        if (error) throw error;
        if (data) {
          setCurrentShift(data);
          setShowStartShiftModal(false);
        }
      } catch (err: any) {
        alert("Gagal membuka shift: " + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      const offlineShift = {
        id: "offline_shift_" + Date.now(),
        cashier_name: username,
        starting_cash: startCash,
        status: "open",
        start_time: new Date().toISOString()
      };
      setCurrentShift(offlineShift);
      setShowStartShiftModal(false);
    }
  };

  const openCloseShiftModal = async () => {
    if (!currentShift) return;
    setLoading(true);
    try {
      let trxList = [];
      if (isOnline) {
        const { data } = await supabase.from("transactions")
          .select("total, payment_method")
          .eq("shift_id", currentShift.id)
          .eq("tenant_id", tenantId);
        trxList = data || [];
      } else {
        const queue = safeJSONParse(localStorage.getItem("disba_offline_transactions"), []);
        trxList = queue.map((q: any) => ({
          total: q.data.total,
          payment_method: q.data.payment_method
        }));
      }

      const totalSales = trxList.reduce((sum, t) => sum + Number(t.total || 0), 0);
      const cashSales = trxList.filter(t => t.payment_method === "CASH").reduce((sum, t) => sum + Number(t.total || 0), 0);
      const transferSales = trxList.filter(t => t.payment_method === "TRANSFER" || t.payment_method === "QRIS").reduce((sum, t) => sum + Number(t.total || 0), 0);

      setShiftSummary({
        totalSales,
        cashSales,
        transferSales,
        trxCount: trxList.length
      });
      setShowCloseShiftModal(true);
    } catch (err: any) {
      alert("Gagal menyiapkan summary shift: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitBill = async () => {
    if (!activeOrder || !selectedTable) return;
    
    const targetTableName = prompt("Masukkan nama/nomor meja tujuan untuk tagihan baru (misal: 1B, atau meja kosong lainnya):");
    if (!targetTableName) return;

    setLoading(true);
    try {
      let targetTable = tables.find(t => t.name.toUpperCase() === targetTableName.trim().toUpperCase());
      if (!targetTable) {
        const { data: newT, error: newTError } = await supabase.from("tables").insert({
          name: targetTableName.trim(),
          status: "available",
          tenant_id: tenantId,
          area: selectedTable.area || "SPLIT"
        }).select().single();
        if (newTError) throw newTError;
        targetTable = newT;
      }

      const hasExistingOrder = orders.some(o => o.table_id === targetTable.id);
      let targetOrderId = null;
      
      if (hasExistingOrder) {
        const existingOrder = orders.find(o => o.table_id === targetTable.id);
        targetOrderId = existingOrder.id;
      } else {
        const { data: newOrder, error: newOrderError } = await supabase.from("orders").insert({
          table_id: targetTable.id,
          status: "open",
          tenant_id: tenantId,
          waiter_name: activeOrder.waiter_name || "KASIR",
          customer_name: activeOrder.customer_name || null
        }).select().single();
        if (newOrderError) throw newOrderError;
        targetOrderId = newOrder.id;

        await supabase.from("tables").update({ status: "occupied" }).eq("id", targetTable.id).eq("tenant_id", tenantId);
      }

      for (const item of orderItems) {
        const splitQty = splitQuantities[item.order_item_id] || 0;
        if (splitQty <= 0) continue;

        if (splitQty === item.qty) {
          const { error } = await supabase.from("order_items")
            .update({ order_id: targetOrderId })
            .eq("id", item.order_item_id)
            .eq("tenant_id", tenantId);
          if (error) throw error;
        } else {
          const { error: updateError } = await supabase.from("order_items")
            .update({ quantity: item.qty - splitQty })
            .eq("id", item.order_item_id)
            .eq("tenant_id", tenantId);
          if (updateError) throw updateError;

          const { data: origItem } = await supabase.from("order_items")
            .select("*")
            .eq("id", item.order_item_id)
            .single();

          if (origItem) {
            const { error: insertError } = await supabase.from("order_items").insert({
              order_id: targetOrderId,
              menu_id: origItem.menu_id,
              quantity: splitQty,
              price_at_time: origItem.price_at_time,
              notes: origItem.notes,
              tenant_id: tenantId
            });
            if (insertError) throw insertError;
          }
        }
      }

      const { data: remainingItems } = await supabase.from("order_items")
        .select("id")
        .eq("order_id", activeOrder.id);
      
      if (!remainingItems || remainingItems.length === 0) {
        await supabase.from("orders").delete().eq("id", activeOrder.id).eq("tenant_id", tenantId);
        await supabase.from("tables").update({ status: "available" }).eq("id", selectedTable.id).eq("tenant_id", tenantId);
        setSelectedTable(null);
      }

      alert("✅ Berhasil memisahkan bill!");
      setShowSplitModal(false);
      setSplitQuantities({});
      fetchData();
    } catch (err: any) {
      alert("Gagal memisahkan bill: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSubtotal = () => orderItems.reduce((a, b) => a + (b.qty * b.price), 0);
  const safeDiscount = Math.min(discount, getSubtotal());
  const getNetSubtotal = () => getSubtotal() - safeDiscount;
  const getService = () => fiscalSettings.use_service_charge ? Math.round(getNetSubtotal() * fiscalSettings.service_charge) : 0;
  const getTax = () => fiscalSettings.use_tax ? Math.round((getNetSubtotal() + getService()) * fiscalSettings.tax_rate) : 0;
  const getGrandTotal = () => getNetSubtotal() + getService() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  const processPayment = async () => {
    if (!activeOrder || !currentShift || loading) return;
    if (paymentMethod === "CASH" && paidAmount < getGrandTotal()) return;
    if (paymentMethod === "TRANSFER" && !selectedBank) return alert("Harap Pilih Bank!");

    setLoading(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(2, 10).replace(/-/g, ""); 
      const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
      
      let count = 0;
      if (isOnline) {
        const { count: c } = await supabase.from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", startOfDay);
        count = c || 0;
      } else {
        count = Math.floor(Math.random() * 900) + 100;
      }
        
      const urutan = (count + 1).toString().padStart(3, '0');
      const receiptNo = `INV/NES/${dateStr}/${urutan}`;
      
      let tenantConfig: any = null;
      try {
        const { data } = await supabase.from("receipt_settings")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();
        tenantConfig = data;
      } catch (e) {
        tenantConfig = { store_name: "NES HOUSE", address: "", contact: "", footer_text: "Terima Kasih" };
      }

      const trxPayload = {
        shift_id: currentShift.id,
        tenant_id: tenantId, 
        receipt_no: receiptNo,
        total: getGrandTotal(),
        items: orderItems, 
        subtotal: getSubtotal(), 
        discount: safeDiscount, 
        service_charge: getService(), 
        pb1: getTax(), 
        table_name: selectedTable?.name, 
        payment_method: paymentMethod, 
        bank_details: paymentMethod === "TRANSFER" ? selectedBank : (paymentMethod === "QRIS" ? { bank_name: "QRIS STATIS" } : null),
        cashier: localStorage.getItem("username") || "KASIR",
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || null
      };

      if (isOnline) {
        // --- PROSES ONLINE ---
        const { data: newTrx, error: trxError } = await supabase.from("transactions").insert(trxPayload).select().single();
        if (trxError) throw trxError;

        // Potong stok
        const stockReductions = orderItems.map(item => 
          supabase.rpc('reduce_stock_by_recipe', {
            p_menu_id: item.id, 
            p_qty_sold: item.qty,
            p_tenant_id: tenantId,
            p_sales_order_id: receiptNo
          })
        );
        await Promise.all(stockReductions);

        await supabase.from("orders").update({ status: "completed" })
          .eq("id", activeOrder.id).eq("tenant_id", tenantId);
        await supabase.from("tables").update({ status: "available" })
          .eq("id", selectedTable.id).eq("tenant_id", tenantId);
          
        if (selectedCustomer?.id) {
          await supabase.rpc('update_customer_points', {
            p_customer_id: selectedCustomer.id,
            p_tenant_id: tenantId,
            p_amount_spent: getGrandTotal(),
            p_point_rate: fiscalSettings.loyalty_point_rate
          });
        }
      } else {
        // --- PROSES OFFLINE RESILIENCE ---
        const offlineTrx = {
          id: Date.now().toString(),
          order_id: activeOrder.id,
          table_id: selectedTable.id,
          data: trxPayload
        };
        
        const queue = safeJSONParse(localStorage.getItem("disba_offline_transactions"), []);
        queue.push(offlineTrx);
        localStorage.setItem("disba_offline_transactions", JSON.stringify(queue));

        // Update local memory & cache
        const localTables = tables.map(t => t.id === selectedTable.id ? { ...t, status: "available" } : t);
        const localOrders = orders.filter(o => o.id !== activeOrder.id);
        
        setTables(localTables);
        setOrders(localOrders);
        localStorage.setItem("disba_cache_tables", JSON.stringify(localTables));
        localStorage.setItem("disba_cache_orders", JSON.stringify(localOrders));
      }

      // --- PRINT RESI (LOKAL BRIDGE SELALU AKTIF) ---
      const receiptData = {
        receipt_no: receiptNo, 
        tableName: selectedTable?.name || "Takeaway", 
        cashierName: localStorage.getItem("username") || "KASIR", 
        items: orderItems, 
        subtotal: getSubtotal(), 
        discount: safeDiscount, 
        serviceCharge: getService(), 
        tax: getTax(), 
        total: getGrandTotal(), 
        paymentMethod: paymentMethod, 
        paid: paymentMethod === "CASH" ? paidAmount : getGrandTotal(), 
        change: paymentMethod === "CASH" ? getChange() : 0, 
        storeName: tenantConfig?.store_name || "NES HOUSE", 
        address: tenantConfig?.address || "", 
        contact: tenantConfig?.contact || "", 
        footerText: tenantConfig?.footer_text || "Terima Kasih"
      };
      
      try { 
        await executePrint(receiptData); 
      } catch (err) { 
        // Printer connection error 
      }

      setOrderItems([]); setPaidAmount(0); setShowPreviewModal(false); setSelectedTable(null);
      setSelectedCustomer(null); setCustomerSearch(""); fetchData();
      
      if (isOnline) {
        alert("✅ Transaksi Berhasil!");
      } else {
        alert("⚠️ POS OFFLINE: Transaksi disimpan secara lokal & dicetak. Akan sinkron otomatis saat internet aktif!");
      }

    } catch (e: any) { 
      // Transaction error occurred
      alert("❌ Gagal: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const checkActiveShift = async () => {
    try {
      const { data } = await supabase.from("shifts").select("*").eq("status", "open").eq("tenant_id", tenantId).maybeSingle();
      if (data) { setCurrentShift(data); setShowStartShiftModal(false); } else { setShowStartShiftModal(true); }
    } catch (e) {
      // Using locally cached shift data
      setCurrentShift({ id: "offline_shift", cashier_name: "KASIR OFFLINE", starting_cash: 0, status: "open", start_time: new Date().toISOString() });
      setShowStartShiftModal(false);
    }
  };

  const handleCloseShift = async () => {
    if (endingCash === 0 && !window.confirm("Uang fisik nol? Yakin?")) return;
    setLoading(true);
    try {
      const expectedCash = Number(currentShift?.starting_cash || 0) + shiftSummary.cashSales;
      const selisih = Number(endingCash) - expectedCash;
      
      if (isOnline) {
        const { error } = await supabase.from("shifts").update({
          status: 'closed', end_time: new Date().toISOString(), total_sales: Number(shiftSummary.totalSales), cash_sales: Number(shiftSummary.cashSales), transfer_sales: Number(shiftSummary.transferSales), expected_ending_cash: expectedCash, actual_ending_cash: Number(endingCash), difference: selisih
        }).eq("id", currentShift.id).eq("tenant_id", tenantId);
        if (error) throw error; 
      }

      // Print closing settlement
      await handlePrintShiftClosing(selisih);
      
      // Auto-email closing settlement
      if (isOnline) {
        await handleEmailShiftClosing(selisih);
      }
      
      setShowCloseShiftModal(false);
      localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/"); 
    } catch (e: any) { 
      alert("❌ Gagal Tutup Shift: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleEmailShiftClosing = async (selisih: number) => {
    try {
      // 1. Ambil email outlet
      const { data: profile } = await supabase.from("outlet_profile").select("email, name").eq("tenant_id", tenantId).maybeSingle();
      if (!profile || !profile.email) {
        // Email configuration incomplete
        return;
      }

      // 2. Ambil IP Bridge dari receipt_settings
      const { data: settings } = await supabase.from("receipt_settings").select("bridge_ip").eq("tenant_id", tenantId).maybeSingle();
      const bridgeIp = settings?.bridge_ip || "127.0.0.1";
      const baseUrl = bridgeIp.includes("http") ? bridgeIp : `http://${bridgeIp}:4000`;

      // 3. Impor dinamis jsPDF
      const jsPDFModule = await import("jspdf");
      const doc = new jsPDFModule.default();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header Desain
      doc.setFillColor(2, 6, 23); // Dark slate
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN PENUTUPAN SHIFT (SETTLEMENT)", 15, 18);
      
      doc.setFontSize(10);
      doc.text(profile.name || tenantId, 15, 24);
      
      // Konten detail
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      
      let y = 45;
      doc.text(`Kasir          : ${currentShift.cashier_name || "-"}`, 15, y); y += 8;
      doc.text(`Mulai Shift    : ${new Date(currentShift.start_time).toLocaleString('id-ID')}`, 15, y); y += 8;
      doc.text(`Tutup Shift    : ${new Date().toLocaleString('id-ID')}`, 15, y); y += 12;
      
      doc.setDrawColor(220, 220, 220);
      doc.line(15, y, pageWidth - 15, y); y += 10;
      
      doc.setFont("helvetica", "bold");
      doc.text("RINGKASAN PENJUALAN", 15, y); y += 8;
      doc.setFont("helvetica", "normal");
      
      doc.text(`Total Omzet    : Rp ${shiftSummary.totalSales.toLocaleString('id-ID')}`, 15, y); y += 8;
      doc.text(`Penjualan Tunai: Rp ${shiftSummary.cashSales.toLocaleString('id-ID')}`, 15, y); y += 8;
      doc.text(`Penjualan Bank : Rp ${shiftSummary.transferSales.toLocaleString('id-ID')}`, 15, y); y += 12;
      
      doc.line(15, y, pageWidth - 15, y); y += 10;
      
      doc.setFont("helvetica", "bold");
      doc.text("AUDIT UANG LACI", 15, y); y += 8;
      doc.setFont("helvetica", "normal");
      
      doc.text(`Modal Kas Awal : Rp ${currentShift.starting_cash.toLocaleString('id-ID')}`, 15, y); y += 8;
      doc.text(`Kas Diharapkan : Rp ${(currentShift.starting_cash + shiftSummary.cashSales).toLocaleString('id-ID')}`, 15, y); y += 8;
      doc.text(`Fisik Aktual   : Rp ${endingCash.toLocaleString('id-ID')}`, 15, y); y += 10;
      
      if (selisih !== 0) {
        doc.setTextColor(selisih < 0 ? 220 : 34, 38, 38);
        doc.setFont("helvetica", "bold");
      }
      doc.text(`Selisih Laci   : Rp ${selisih.toLocaleString('id-ID')}`, 15, y);
      
      const pdfBase64 = doc.output('datauristring');
      
      // Tembak email ke local node bridge
      await fetchWithTimeout(`${baseUrl}/send-report-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          outlet_name: profile.name || tenantId,
          email_to: profile.email,
          period: `Settlement Shift (${new Date().toLocaleDateString('id-ID')})`,
          summary: {
            subtotal: shiftSummary.totalSales,
            service: 0,
            tax: 0,
            total: shiftSummary.totalSales
          },
          pdf_attachment: pdfBase64
        })
      });
      // Settlement email sent
    } catch (e) {
      console.error("Gagal mengirim email penutupan shift otomatis:", e);
    }
  };

  const handlePrintShiftClosing = async (selisih: number) => {
    const { data: printSettings } = await supabase.from("receipt_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
    
    let trxList = [];
    try {
      const { data } = await supabase.from("transactions").select("*").eq("shift_id", currentShift.id).eq("tenant_id", tenantId);
      trxList = data || [];
    } catch (e) {
      // Using locally cached transaction data
    }

    const summaryData = trxList || [];
    const subtotal = summaryData.reduce((a, b) => a + (Number(b.subtotal) || 0), 0);
    const diskonBill = summaryData.reduce((a, b) => a + (Number(b.discount) || 0), 0);
    const serviceCharge = summaryData.reduce((a, b) => a + (Number(b.service_charge) || 0), 0);
    const totalPenjualan = summaryData.reduce((a, b) => a + (Number(b.total) || 0), 0);
    
    const cashSalesOnly = summaryData
      .filter(t => t.payment_method === "CASH")
      .reduce((a, b) => a + (Number(b.total) || 0), 0);
    
    const kasDiharapkan = Number(currentShift?.starting_cash || 0) + cashSalesOnly;

    const reportData = {
        storeName: printSettings?.store_name || "NES HOUSE COLD BREW",
        cashierName: currentShift.cashier_name || "KASIR",
        closingData: {
          startTime: new Date(currentShift.start_time).toLocaleString('id-ID'),
          endTime: new Date().toLocaleString('id-ID'),
          totalPenjualan,
          subtotal,
          diskonBill,
          service: serviceCharge,
          pembulatan: 0,
          kasDiharapkan,
          awalLaci: Number(currentShift?.starting_cash || 0),
          kasPenjualan: cashSalesOnly,
          kasAktual: Number(endingCash),
          kasSelisih: selisih,
          totalDiharapkan: totalPenjualan,
          totalAktual: (totalPenjualan - cashSalesOnly) + Number(endingCash),
          totalSelisih: selisih
        }
    };

    try { 
      await fetchWithTimeout("http://localhost:4000/print-settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData)
      });
    } catch (e) { console.error("Gagal print closing:", e); }
  };

  const handleLogOut = () => { if (window.confirm("Keluar dari Terminal Kasir?")) { localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/"); } };

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER CONTROL */}
      <header className="flex justify-between items-center bg-slate-900/60 border-b border-slate-800/80 p-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <h1 className="text-sm font-extrabold tracking-tight text-white uppercase">DISBA POS Terminal</h1>
          
          {/* STATUS KONEKSI (ONLINE/OFFLINE RESILIENCE INDICATOR) */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold tracking-wider ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchShiftHistory("BILL_LIST")} className="h-8 px-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl text-[10px] font-bold tracking-wider text-slate-300 transition-all flex items-center gap-1.5"><FileText size={12}/> ARSIP</button>
          <button onClick={() => fetchShiftHistory("ITEM_LIST")} className="h-8 px-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl text-[10px] font-bold tracking-wider text-slate-300 transition-all flex items-center gap-1.5"><BarChart3 size={12}/> REKAP</button>
          <button onClick={openCloseShiftModal} className="h-8 px-3.5 bg-orange-600 hover:bg-orange-500 border border-orange-500/20 text-[10px] font-bold tracking-wider text-white transition-all flex items-center gap-1.5"><Lock size={12}/> TUTUP SHIFT</button>
          <button onClick={handleLogOut} className="h-8 w-8 flex items-center justify-center bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-xl text-red-400 transition-colors"><LogOut size={14}/></button>
        </div>
      </header>

      {/* CORE BODY */}
      <div className="flex-1 flex gap-2 p-2 min-h-0 overflow-hidden bg-slate-950/20">
        
        {/* PANEL MEJA (SIDEBAR) */}
        <div className="w-52 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-3 overflow-y-auto no-scrollbar flex flex-col gap-5 backdrop-blur-xl">
          {dynamicAreas.map(area => (
            <div key={area} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-0.5 opacity-60">
                <MapPin size={10} className="text-blue-500"/>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{area}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tables.filter(t => (t.area || "Area Lainnya").toUpperCase() === area).map(t => {
                   const hasOrder = orders.some(o => o.table_id === t.id); 
                   return (
                    <button 
                      key={t.id} 
                      onClick={() => setSelectedTable(t)} 
                      className={`h-14 rounded-2xl border transition-all text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-md relative ${
                        selectedTable?.id === t.id 
                          ? 'border-blue-500 bg-blue-600/20 text-white' 
                          : hasOrder 
                            ? 'border-orange-500/50 bg-orange-500/10 text-orange-400' 
                            : t.status === 'payment' || t.status === 'closed' 
                              ? 'border-red-500 bg-red-500/10 text-red-400' 
                              : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {(t.status === 'payment' || t.status === 'closed') && <Lock size={8} className="mb-0.5" />}
                      <span>{t.name}</span>
                    </button>
                   );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ORDER DETAILS PANEL */}
        <div className="flex-1 bg-slate-900/40 rounded-3xl border border-slate-800/80 flex flex-col overflow-hidden backdrop-blur-xl">
          {activeOrder ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-blue-500"/>
                  <h2 className="text-sm font-extrabold text-white">Billing {selectedTable?.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSplitQuantities({}); setShowSplitModal(true); }} className="h-8 px-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-400 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1.5"><Scissors size={12}/> PISAH NOTA</button>
                  <button onClick={() => setSelectedTable(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-bold text-slate-500 border-b border-slate-800 pb-3 uppercase tracking-wider sticky top-0 bg-[#020617] z-10">
                    <tr>
                      <th className="pb-3">NAMA PRODUK</th>
                      <th className="pb-3 text-center">QTY</th>
                      <th className="pb-3 text-right">HARGA SATUAN</th>
                      <th className="pb-3 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5"><span className="text-xs font-semibold text-slate-200">{item.name}</span></td>
                        <td className="py-3.5 text-center"><span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20">{item.qty}x</span></td>
                        <td className="py-3.5 text-right text-xs font-mono text-slate-500">Rp {item.price.toLocaleString('id-ID')}</td>
                        <td className="py-3.5 text-right text-xs font-mono font-bold text-slate-100">Rp {(item.qty * item.price).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
              <ShoppingBag size={80} strokeWidth={1.5} className="text-slate-400"/>
              <p className="text-xs font-bold mt-4 tracking-widest text-slate-400 uppercase">Pilih Meja untuk Memulai Billing</p>
            </div>
          )}
        </div>

        {/* CHECKOUT PANEL */}
        <div className="w-80 bg-slate-900/40 rounded-3xl border border-slate-800/80 flex flex-col p-4 shadow-2xl backdrop-blur-xl">
          {activeOrder ? (
            <div className="flex flex-col min-h-full">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider mb-4 border-b border-slate-800 pb-2.5 flex items-center gap-2 uppercase"><CreditCard size={14}/> Ringkasan Pembayaran</h3>
              
              <div className="space-y-2.5 mb-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span className="text-white font-mono">Rp {getSubtotal().toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between items-center text-xs font-bold text-blue-400">
                  <span>DISKON</span>
                  <input type="number" className="w-24 bg-blue-500/10 border border-blue-500/30 rounded-xl px-2.5 py-1 text-right text-blue-300 outline-none font-bold text-xs" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
                {fiscalSettings.use_service_charge && <div className="flex justify-between items-center text-[10px] font-bold text-slate-500"><span>SERVICE ({Math.round(fiscalSettings.service_charge*100)}%)</span><span className="text-slate-300 font-mono">Rp {getService().toLocaleString('id-ID')}</span></div>}
                {fiscalSettings.use_tax && <div className="flex justify-between items-center text-[10px] font-bold text-slate-500"><span>PAJAK ({Math.round(fiscalSettings.tax_rate*100)}%)</span><span className="text-slate-300 font-mono">Rp {getTax().toLocaleString('id-ID')}</span></div>}
              </div>

              {/* CUSTOMER SELECTOR */}
              <div className="mb-4 relative">
                <p className="text-[10px] font-bold text-yellow-500 mb-1.5 uppercase">Pelanggan CRM (Opsional)</p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-3">
                    <div>
                      <p className="text-xs font-bold text-yellow-400">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{selectedCustomer.phone} · {selectedCustomer.points || 0} pts</p>
                    </div>
                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-slate-500 hover:text-red-400"><X size={14}/></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Users size={12} className="absolute left-3 top-3 text-slate-500"/>
                    <input type="text" placeholder="Masukkan nama atau nomor HP..." className="w-full bg-slate-950/60 border border-slate-800/80 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-yellow-500 transition-colors"
                      value={customerSearch} onChange={(e) => searchCustomers(e.target.value)} disabled={!isOnline} />
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-[#0f172a] border border-slate-800 rounded-2xl mt-1.5 z-50 overflow-hidden shadow-2xl">
                        {customerResults.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-600/10 transition-colors border-b border-slate-800 last:border-0">
                            <p className="text-xs font-bold text-white">{c.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{c.phone} · <Star size={10} className="inline text-yellow-400 mr-0.5"/> {c.points} pts</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-slate-800/60 pt-4">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">TOTAL BAYAR</p>
                <p className="text-2xl font-black tracking-tight text-white mb-5">Rp {getGrandTotal().toLocaleString('id-ID')}</p>
                
                {/* 3-COLUMN PAYMENT METHOD SELECTOR (CASH, BANK, QRIS) */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); setPaidAmount(0); }} className={`py-3 rounded-2xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'CASH' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-405'}`}><Banknote size={14}/> TUNAI</button>
                  <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`py-3 rounded-2xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-405'}`}><CreditCard size={14}/> BANK</button>
                  <button onClick={() => { setPaymentMethod("QRIS"); setPaidAmount(getGrandTotal()); setSelectedBank(null); }} className={`py-3 rounded-2xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === 'QRIS' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900/60 border-slate-800 text-slate-405'}`}><QrCode size={14}/> QRIS</button>
                </div>

                {paymentMethod === "TRANSFER" && (
                  <div className="mb-4 space-y-1.5">
                    <p className="text-[9px] font-bold text-purple-400 uppercase px-1">Pilih Rekening Merchant:</p>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                      {banks.map(b => (
                        <button key={b.id} onClick={() => setSelectedBank(b)} className={`w-full p-3 rounded-2xl border text-left transition-all relative ${selectedBank?.id === b.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400'}`}>
                          <p className="text-[10px] font-bold text-white">{b.bank_name}</p>
                          <p className="text-xs font-mono font-bold text-white/90 mt-0.5">{b.account_number}</p>
                          {selectedBank?.id === b.id && <CheckCircle2 size={12} className="absolute top-3 right-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethod === "QRIS" && (
                  <div className="mb-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
                    <p className="text-[9px] font-bold text-emerald-400 uppercase mb-2">SCAN QRIS MERCHANT</p>
                    <div className="bg-white p-2.5 rounded-2xl">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris-static-merchant-${tenantId}-${getGrandTotal()}`} 
                        alt="QRIS Static QR" 
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="text-[8px] text-slate-500 mt-2 text-center">Scan QR di atas untuk menyelesaikan pembayaran non-tunai.</p>
                  </div>
                )}

                {paymentMethod === "CASH" && (
                  <div className="mb-4">
                    <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Jumlah Uang Diterima:</p>
                    <input ref={cashInputRef} type="number" className="w-full bg-blue-500/10 border border-blue-500/30 rounded-2xl py-3 px-3 text-xl font-bold text-blue-300 outline-none focus:border-blue-400 text-center" placeholder="0" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                    {paidAmount >= getGrandTotal() && (
                      <div className="mt-2 flex justify-between items-center bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Kembalian:</span>
                        <span className="text-base font-mono font-bold text-emerald-400">Rp {getChange().toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <button onClick={() => setShowPreviewModal(true)} disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} className={`w-full py-4.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${(paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : (paymentMethod === "QRIS" || !!selectedBank)) ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg' : 'bg-slate-900 text-slate-500 opacity-55 cursor-not-allowed'}`}><Printer size={15}/> PRATINJAU NOTA</button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-30 select-none">
              <CheckCircle2 size={28} className="mb-3 text-slate-400"/>
              <p className="text-xs font-bold text-slate-400 uppercase">Pilih Meja untuk Membayar</p>
            </div>
          )}
        </div>
      </div>

      {/* SHIFT ARSIP MODAL */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[8000] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl flex flex-col max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div className="flex items-center gap-2">
                {archiveViewMode !== "SHIFT_LIST" && (
                  <button onClick={() => setArchiveViewMode("SHIFT_LIST")} className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 transition-colors"><ChevronRight className="rotate-180" size={18}/></button>
                )}
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {archiveViewMode === "SHIFT_LIST" ? "Daftar Shift Karyawan" : archiveViewMode === "BILL_LIST" ? "Daftar Transaksi" : "Rekap Produk Terjual"}
                </h3>
              </div>
              <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {archiveViewMode === "SHIFT_LIST" ? (
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-800/60 text-xs font-semibold text-slate-300">
                    {pastShifts.map((s) => (
                      <tr key={s.id} onClick={() => handleSelectShift(s)} className="hover:bg-slate-800/40 cursor-pointer transition-colors">
                        <td className="p-4 text-slate-500">{new Date(s.start_time).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-white font-bold">{s.cashier_name}</td>
                        <td className="p-4 text-right text-emerald-400">Rp {Number(s.total_sales || 0).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-center text-slate-600"><ChevronRight size={14}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : archiveViewMode === "BILL_LIST" ? (
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-slate-800/60 text-xs font-semibold">
                    {archiveTransactions.map((trx) => (
                      <tr key={trx.id}>
                        <td className="p-4 text-slate-500">{new Date(trx.created_at).toLocaleTimeString()}</td>
                        <td className="p-4 text-blue-400 font-bold">{trx.receipt_no}</td>
                        <td className="p-4 text-right text-slate-200">Rp {trx.total.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button onClick={async () => executePrint({...trx, items: typeof trx.items === 'string' ? safeJSONParse(trx.items, []) : trx.items, reprint: true})} className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 rounded-xl transition-colors"><Printer size={14}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-5 space-y-2">
                   {itemSales.map((item, idx) => (
                     <div key={idx} className="flex justify-between p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                       <span className="text-xs text-slate-300 font-semibold">{item.name}</span>
                       <span className="text-sm text-blue-400 font-bold">{item.qty} Pcs</span>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* START SHIFT MODAL */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-[#020617]/95 flex items-center justify-center z-[7000] p-4 backdrop-blur-md">
          <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-sm shadow-2xl">
            <Wallet className="text-blue-500 mx-auto mb-4 animate-bounce" size={48} />
            <h2 className="text-lg font-bold mb-1 uppercase tracking-wider text-white">Mulai Buka Shift</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">Masukkan modal kas awal di laci:</p>
            <input type="number" autoFocus className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4.5 text-center text-3xl text-white outline-none mb-6 font-bold font-mono focus:border-blue-500 transition-colors" placeholder="Rp 0" onChange={(e) => setStartCash(Number(e.target.value))} />
            <button onClick={handleStartShift} className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold uppercase tracking-wider text-xs">Buka Shift Kasir</button>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[7000] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-orange-500/20 w-full max-w-sm text-center shadow-2xl">
            <AlertTriangle className="text-orange-500 mx-auto mb-4" size={40} />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Penutupan Shift Kasir</h2>
            <div className="space-y-4 mb-6 text-left text-xs uppercase">
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60">
                <p className="text-[9px] text-slate-500 font-bold">Total Omzet Penjualan</p>
                <p className="text-xl font-bold text-white font-mono mt-1">Rp {shiftSummary.totalSales.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] text-orange-400 font-bold ml-1">Uang Tunai Aktual di Laci:</p>
                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 text-center text-2xl text-orange-400 outline-none font-bold font-mono focus:border-orange-500 transition-colors" placeholder="Rp 0" onChange={(e) => setEndingCash(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCloseShiftModal(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl uppercase font-bold text-xs">Batal</button>
              <button onClick={handleCloseShift} className="flex-[2] py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl text-white uppercase font-bold text-xs">Akhiri Shift</button>
            </div>
          </div>
        </div>
      )}

      {/* BILL PREVIEW PAPER NOTA */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[6000] p-4 backdrop-blur-md">
          <div className="bg-white text-slate-900 p-6 rounded-2xl w-full max-w-[320px] font-mono shadow-2xl relative">
            <h3 className="font-extrabold text-lg text-center border-b-2 border-slate-900 border-double pb-2 mb-4">NES HOUSE COLD BREW</h3>
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between"><span>Meja:</span> <span>{selectedTable?.name}</span></div>
              <div className="flex justify-between"><span>Metode:</span> <span className="font-bold">{paymentMethod}</span></div>
              <div className="border-b border-slate-300 border-dashed my-2.5"></div>
              <div className="max-h-40 overflow-y-auto no-scrollbar">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span>{item.qty} {item.name}</span>
                    <span>{(item.qty * item.price).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-b border-slate-300 border-dashed my-2.5"></div>
              <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-slate-900 mt-1"><span>TOTAL HARGA:</span><span>{getGrandTotal().toLocaleString()}</span></div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors">Batal</button>
              <button onClick={processPayment} disabled={loading} className="flex-[2] py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors">{loading ? "Menyimpan..." : <><Printer size={14}/> Cetak & Bayar</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT BILL MODAL */}
      {showSplitModal && activeOrder && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[7500] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Scissors className="text-orange-400" size={18} />
                <h2 className="text-sm font-extrabold text-white">Pisah Nota (Split Bill)</h2>
              </div>
              <button onClick={() => setShowSplitModal(false)} className="text-slate-500 hover:text-white"><X size={18}/></button>
            </div>
            
            <p className="text-[10px] text-slate-400 mb-4">Tentukan kuantitas produk yang ingin dipindahkan ke bill pecahan baru:</p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar mb-5">
              {orderItems.map((item, i) => {
                const pk = item.order_item_id;
                const currentQty = splitQuantities[pk] || 0;
                return (
                  <div key={i} className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-800/80 bg-slate-950/20">
                    <div>
                      <p className="text-xs font-bold text-white">{item.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Tersedia: {item.qty}x · Rp {item.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setSplitQuantities(prev => ({ ...prev, [pk]: Math.max(0, currentQty - 1) }))}
                        className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs hover:bg-slate-800 flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-orange-400 font-mono">{currentQty}</span>
                      <button
                        onClick={() => setSplitQuantities(prev => ({ ...prev, [pk]: Math.min(item.qty, currentQty + 1) }))}
                        className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs hover:bg-slate-800 flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setShowSplitModal(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-xs text-slate-300">Batal</button>
              <button 
                onClick={handleSplitBill} 
                disabled={Object.values(splitQuantities).reduce((a, b) => a + b, 0) === 0 || loading}
                className="flex-[2] py-4 bg-orange-600 disabled:bg-slate-850 hover:bg-orange-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={14}/> : <><Scissors size={14}/> Proses Pisah Nota</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
