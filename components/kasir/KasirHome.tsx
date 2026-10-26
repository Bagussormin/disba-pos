import { fetchWithTimeout } from "../../lib/printer";
import { safeJSONParse } from "../../lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, Loader2, ShoppingBag, Search,
  Scissors, Users, Armchair, Star, Compass, QrCode, Wifi, WifiOff
} from "lucide-react";
import {
  testBluetoothPrint,
  printBluetoothReceipt,
} from "../../services/bluetoothPrinter";

export default function KasirHome() {
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]); 
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
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
  const [tenantType, setTenantType] = useState("RESTAURANT");

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
  const [receiptStoreName, setReceiptStoreName] = useState<string | null>(null);
  const [outletProfileName, setOutletProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [shiftSummary, setShiftSummary] = useState({ 
    totalSales: 0, cashSales: 0, transferSales: 0, trxCount: 0 
  });

  const cashInputRef = useRef<HTMLInputElement>(null);
  const prevTableIdRef = useRef<any>(null);
  const dynamicAreas = Array.from(
  new Set(tables.map(t => String(t.area || "Area Lainnya").trim().toUpperCase()))
);
const [testingBluetooth, setTestingBluetooth] = useState(false);

const handleTestBluetooth = async () => {
  if (testingBluetooth) return;

  setTestingBluetooth(true);
  try {
    const result = await testBluetoothPrint();
    console.log("Hasil tes Bluetooth:", result);
    alert("Permintaan tes Bluetooth dikirim. Periksa printer.");
  } catch (error) {
    console.error("Tes Bluetooth gagal:", error);
    const message =
      error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    alert(`Tes Bluetooth gagal: ${message}`);
  } finally {
    setTestingBluetooth(false);
  }
};

console.log("DYNAMIC AREAS:", dynamicAreas);
  
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
    const loadTenantType = async () => {
  const { data, error } = await supabase
    .from("tenants")
    .select("tenant_type")
    .eq("tenant_id", tenantId)
    .single();

  if (data) {
    setTenantType(data.tenant_type);
  }
};

loadTenantType();
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
    console.log("KASIR HOME MOUNT", tenantId);
    if (!tenantId) return;
    checkActiveShift();
    fetchData();
    fetchBanks();
    fetchFiscalSettings();
    fetchMenuItems();

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
    // Jika kasir sedang memilih meja, jangan biarkan alur transaksi retail
    // tanpa meja menimpa pesanan meja yang baru dibuka.
    if (selectedTable) {
      const tableOrder = orders.find(
        order => String(order.table_id) === String(selectedTable.id) && String(order.status || "").toLowerCase() === "open"
      );
      if (tableOrder) {
        setActiveOrder(tableOrder);
        fetchOrderItems(tableOrder.id);
      }
      return;
    }

    // RETAIL tanpa meja memakai transaksi langsung.
    if (tenantType === "RETAIL" && tables.length === 0) {
      const retailOrder = orders.find(order => order.status === "open" && order.waiter_name === "KASIR" && (order.table_id === null || order.table_id === undefined));
      if (retailOrder) {
        setActiveOrder(retailOrder);
        if (prevTableIdRef.current !== retailOrder.id) {
          setDiscount(0); setPaidAmount(0); setPaymentMethod("CASH"); setSelectedBank(null);
          prevTableIdRef.current = retailOrder.id; setTimeout(() => cashInputRef.current?.focus(), 100);
        }
        fetchOrderItems(retailOrder.id);
      } else {
        setActiveOrder(null);
        setOrderItems([]);
        setSelectedTable(null);
        if (!loading) handleCreateRetailOrder();
      }
      return;
    }

    if (selectedTable) {
      const o = orders.find(order => order.table_id === selectedTable.id);
      setActiveOrder(o || null);
      if (prevTableIdRef.current !== selectedTable.id) {
        setDiscount(0); setPaidAmount(0); setPaymentMethod("CASH"); setSelectedBank(null);
        prevTableIdRef.current = selectedTable.id; setTimeout(() => cashInputRef.current?.focus(), 100);
      }
      if (o) fetchOrderItems(o.id); else setOrderItems([]);
    } else { prevTableIdRef.current = null; setActiveOrder(null); setOrderItems([]); }
  }, [tables, orders, selectedTable, tenantType, loading]);

  const fetchFiscalSettings = async () => {
    console.log("fetchFiscalSettings dipanggil, tenantId:", tenantId);
    try {
      const { data } = await supabase.from("receipt_settings").select("tax_rate,service_charge,use_tax,use_service_charge,loyalty_point_rate,store_name").eq("tenant_id", tenantId).maybeSingle();
      if (data) {
        setFiscalSettings({ tax_rate: data.tax_rate ?? 0.10, service_charge: data.service_charge ?? 0.05, use_tax: data.use_tax !== false, use_service_charge: data.use_service_charge !== false, loyalty_point_rate: data.loyalty_point_rate ?? 1000 });
        if (data.store_name) setReceiptStoreName(data.store_name);
      }
    } catch (err) {
      // Using default fiscal settings
    }

    try {
      console.log("TENANT ID:", tenantId);
      const { data: outletData, error } = await supabase.from("outlet_profiles").select("store_name").eq("tenant_id", tenantId).maybeSingle();
      console.log("OUTLET QUERY ERROR:", error);
      console.log("OUTLET QUERY DATA:", outletData);
      if (outletData?.store_name) setOutletProfileName(outletData.store_name);
    } catch (err) {
      // Outlet profile may not be available
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
  console.log("DATA TABLE DARI SUPABASE:", tRes.data);
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
      const { data: orderData } = await supabase.from("order_items").select(`*, menus(name, category, inventory_id)`).eq("order_id", orderId).eq("tenant_id", tenantId);
      if (orderData) {
        const items = orderData.map((item: any) => ({
          id: item.menu_id, 
          order_item_id: item.id, 
          name: item.menus?.name || item.name || `Menu ID: ${item.menu_id}`, 
          qty: item.quantity || 1, 
          price: item.price_at_time || 0,
          category: item.menus?.category || "FOOD",
          inventory_id: item.menus?.inventory_id || null,
        }));
        const { data: tenantData } = await supabase
  .from("tenants")
  .select("tenant_type")
  .eq("tenant_id", tenantId)
  .single();

if (tenantData) {
  setTenantType(tenantData.tenant_type);
}
        setOrderItems(items);
        localStorage.setItem(`disba_cache_order_items_${orderId}`, JSON.stringify(items));
      } else setOrderItems([]);
    } catch (err) {
      // Using cached order items - offline mode
      const cachedItems = localStorage.getItem(`disba_cache_order_items_${orderId}`);
      if (cachedItems) setOrderItems(safeJSONParse(cachedItems, []));
    }
  };

const fetchMenuItems = async () => {
  const cachedMenus = localStorage.getItem("disba_cache_menus");

  // Tampilkan cache terlebih dahulu.
  if (cachedMenus) {
    const parsedMenus = safeJSONParse(cachedMenus, []);
    if (Array.isArray(parsedMenus) && parsedMenus.length > 0) {
      setMenuItems(parsedMenus);
    }
  }

  try {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_available", true)
      .order("name", { ascending: true });

    console.log("TENANT ID KASIR:", tenantId);
    console.log("HASIL MENU SUPABASE:", data, "ERROR:", error);

    if (error) {
      console.error("Gagal mengambil menu:", error);
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      // Ambil stok Inventory untuk ditampilkan pada setiap kartu Menu yang terhubung.
      const { data: stockRows, error: stockError } = await supabase
        .from("inventory")
        .select("id, item_name, current_stock, stock_quantity, unit")
        .eq("tenant_id", tenantId);

      if (stockError) {
        console.error("Gagal mengambil stok Inventory untuk kasir:", stockError);
      }

      const stockById = new Map(
        (stockRows || []).map((row: any) => [
          String(row.id),
          Number(row.current_stock ?? row.stock_quantity ?? 0)
        ])
      );

      const menusWithStock = data.map((menu: any) => ({
        ...menu,
        available_stock: menu.inventory_id
          ? (stockById.get(String(menu.inventory_id)) ?? 0)
          : null
      }));

      setMenuItems(menusWithStock);
      localStorage.setItem("disba_cache_menus", JSON.stringify(menusWithStock));
    } else {
      console.warn(
        "Supabase mengembalikan menu kosong. Cache menu dipertahankan."
      );
    }
  } catch (err) {
    console.error("Kesalahan saat mengambil menu:", err);
  }
};

  const handleAddMenuToOrder = async (menu: any) => {
  console.log("ACTIVE ORDER:", activeOrder);
    if (!activeOrder) return;
    try {
      const existingItem = orderItems.find((item) => item.id === menu.id);
      if (existingItem) {
        const { error } = await supabase.from("order_items").update({ quantity: existingItem.qty + 1 })
          .eq("id", existingItem.order_item_id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
        setOrderItems((prev) => prev.map((item) => item.order_item_id === existingItem.order_item_id ? { ...item, qty: item.qty + 1 } : item));
        return;
      }

      const { error } = await supabase.from("order_items").insert({
        order_id: activeOrder.id,
        tenant_id: tenantId,
        menu_id: menu.id,
        quantity: 1,
        price_at_time: menu.price,
        notes: "CASHIER_ORDER"
      });
      if (error) throw error;
      setOrderItems((prev) => [
        ...prev,
        {
          id: menu.id,
          order_item_id: null,
          name: menu.name,
          qty: 1,
          price: menu.price,
          category: menu.category || "FOOD",
          inventory_id: menu.inventory_id || null,
        }
      ]);
      fetchOrderItems(activeOrder.id);
    } catch (err: any) {
      alert("Gagal menambahkan menu: " + err.message);
    }
  };

  const handleUpdateOrderItemQty = async (item: any, delta: number) => {
    if (!activeOrder) return;
    const newQty = item.qty + delta;
    try {
      if (newQty <= 0) {
        const { error } = await supabase.from("order_items").delete().eq("id", item.order_item_id).eq("tenant_id", tenantId);
        if (error) throw error;
        setOrderItems((prev) => prev.filter((row) => row.order_item_id !== item.order_item_id));
        return;
      }

      const { error } = await supabase.from("order_items").update({ quantity: newQty })
        .eq("id", item.order_item_id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setOrderItems((prev) => prev.map((row) => row.order_item_id === item.order_item_id ? { ...row, qty: newQty } : row));
    } catch (err: any) {
      alert("Gagal memperbarui qty: " + err.message);
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
  
  const handleCreateRetailOrder = async (table?: any) => {
  if (table && (table.target || table.currentTarget)) table = undefined;
  try {
    setLoading(true);

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({
        table_id: table?.id || null,
        tenant_id: tenantId,
        status: "open",
        waiter_name: localStorage.getItem("username") || "KASIR",
        customer_name: null,
        guest_name: null
      })
      .select()
      .single();

    if (error) throw error;

    if (newOrder) {
      // Update state immediately so the order-sync effect can find this table's new order.
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      setActiveOrder(newOrder);
      setOrderItems([]);
      setSelectedTable(table ? table : null);
    }
    fetchData();

  } catch (err:any) {
    alert("Gagal membuat transaksi: " + err.message);
  } finally {
    setLoading(false);
  }
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

  const menuCategories = menuItems.reduce((acc: Record<string, any[]>, menu) => {
    const category = (menu.category || "LAINNYA").toUpperCase();
    if (!acc[category]) acc[category] = [];
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, any[]>);

  const processPayment = async () => {
    console.log("processPayment orderItems:", orderItems);
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
        if (tenantType === "RETAIL") {
          const stockUpdates = orderItems.map(item => {
            if (!item.inventory_id) return Promise.resolve(null);
            return supabase.rpc('reduce_stock_by_inventory', {
              p_inventory_id: item.inventory_id,
              p_qty_sold: item.qty,
              p_tenant_id: tenantId
            });
          });
          await Promise.all(stockUpdates);
        } else {
          const stockReductions = orderItems.map(item => 
            supabase.rpc('reduce_stock_by_recipe', {
              p_menu_id: item.id, 
              p_qty_sold: item.qty,
              p_tenant_id: tenantId,
              p_sales_order_id: receiptNo
            })
          );
          await Promise.all(stockReductions);
        }

        await supabase.from("orders").update({ status: "completed" })
          .eq("id", activeOrder.id).eq("tenant_id", tenantId);
        if (selectedTable?.id) {
          await supabase.from("tables").update({ status: "available" })
            .eq("id", selectedTable.id).eq("tenant_id", tenantId);
        }
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
          table_id: selectedTable?.id || null,
          data: trxPayload
        };
        
        const queue = safeJSONParse(localStorage.getItem("disba_offline_transactions"), []);
        queue.push(offlineTrx);
        localStorage.setItem("disba_offline_transactions", JSON.stringify(queue));

        // Update local memory & cache
        const localTables = selectedTable?.id ? tables.map(t => t.id === selectedTable.id ? { ...t, status: "available" } : t) : tables;
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
  const isAndroidTablet =
    /Android/i.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 0;

  if (isAndroidTablet) {
    await printBluetoothReceipt(receiptData);
  } else {
    await executePrint(receiptData);
  }
} catch (err) {
  console.error("Gagal mencetak struk:", err);
  alert(
    "Transaksi berhasil, tetapi struk gagal dicetak. " +
    "Periksa koneksi printer sebelum mencetak ulang."
  );
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
      const { data: profile } = await supabase.from("outlet_profiles").select("email, name").eq("tenant_id", tenantId).maybeSingle();
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

  const handleLogOut = () => { if (window.confirm("Keluar dari Terminal Kasir?")) { localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/login"); } };

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 font-sans flex flex-col overflow-hidden">
      
      {/* HEADER CONTROL */}
      <header className="shrink-0 flex flex-wrap justify-between items-center gap-2 bg-slate-900/60 border-b border-slate-800/80 p-2 sm:p-3 shadow-2xl backdrop-blur-md">
        <div className="min-w-0 flex flex-wrap items-center gap-3">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <h1 className="text-sm font-extrabold tracking-tight text-white uppercase">
DISBA POS Terminal - {tenantType}
</h1>
          <div className="flex flex-wrap gap-2">
            {tenantType === "RETAIL" && (
  <button
    onClick={handleCreateRetailOrder}
    className="h-8 px-3 bg-blue-600 rounded-xl text-[10px] font-bold text-white"
  >
    + TRANSAKSI BARU
  </button>
)}
</div>
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
<div className="flex-1 flex flex-col xl:flex-row gap-2 p-2 min-h-0 overflow-y-auto xl:overflow-hidden bg-slate-950/20">
        
         {/* PANEL MEJA (SIDEBAR) */}
    <div className="w-full shrink-0 max-h-64 xl:max-h-72 overflow-y-auto no-scrollbar">
      {tables.length === 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">
          <p className="text-sm font-bold">Kursi/meja belum berhasil dimuat.</p>
          <p className="mt-1 text-xs">Tenant aktif: <span className="font-mono">{tenantId || "(tenant_id kosong)"}</span></p>
          <p className="mt-1 text-xs">Database memiliki meja untuk tenant tertentu. Pastikan akun kasir memakai tenant yang sama dengan meja di dashboard admin.</p>
          <button onClick={() => fetchData()} className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">Coba Muat Ulang Meja</button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {tables.map(t => {
          const hasOrder = orders.some(o => o.table_id === t.id);
          const isSelected = selectedTable?.id === t.id;
          const isLocked = t.status === "payment" || t.status === "closed";
          const statusLabel = isSelected ? "Dipilih" : hasOrder ? "Terisi" : isLocked ? "Menunggu pembayaran" : "Kosong";

          return (
            <button
              key={t.id}
              onClick={async () => {
                // Samakan alur dengan WaiterHome: pilih meja dahulu, lalu buka/buat pesanan aktif.
                setSelectedTable(t);
                const existingOrder = orders.find(
                  o => String(o.table_id) === String(t.id) && String(o.status || "").toLowerCase() === "open"
                );
                if (existingOrder) {
                  setActiveOrder(existingOrder);
                  await fetchOrderItems(existingOrder.id);
                  return;
                }
                await handleCreateRetailOrder(t);
              }}
              className={`min-h-[112px] rounded-2xl border-2 transition-all px-2 py-3 text-center font-medium flex flex-col items-center justify-center gap-2 shadow-sm ${
                isSelected
                  ? "border-blue-600 bg-blue-100 text-blue-900"
                  : hasOrder
                    ? "border-amber-500 bg-amber-100 text-amber-800"
                    : isLocked
                      ? "border-red-400 bg-red-100 text-red-800"
                      : "border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-400"
              }`}
            >
              <Armchair size={23} strokeWidth={2.2} />
              <span className="text-base leading-tight">{t.name}</span>
              <span className="text-xs opacity-80">{statusLabel}</span>
            </button>
          );
        })}
      </div>
    </div>

        {/* ORDER DETAILS PANEL */}
        <div className="min-w-0 min-h-[22rem] xl:min-h-0 flex-none xl:flex-1 bg-slate-900/40 rounded-3xl border border-slate-800/80 flex flex-col overflow-hidden backdrop-blur-xl">
          {activeOrder ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800/80 bg-slate-950/20 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-blue-500"/>
                  <h2 className="text-sm font-extrabold text-white">Billing {tenantType === "RETAIL" ? "RETAIL" : selectedTable?.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSplitQuantities({}); setShowSplitModal(true); }} className="h-8 px-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-[10px] font-bold text-orange-400 hover:bg-orange-500 hover:text-white transition-all flex items-center gap-1.5"><Scissors size={12}/> PISAH NOTA</button>
                  <button onClick={() => setSelectedTable(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
                </div>
              </div>
              {tenantType === "RETAIL" && (
  <button
    onClick={() => handleCreateRetailOrder()}
    className="h-8 px-3 bg-blue-600 rounded-xl text-[10px] font-bold text-white"
  >
    + TRANSAKSI BARU
  </button>
)}
              {activeOrder && menuItems.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span>Pilih Menu</span>
                    <span className="text-slate-500">{menuItems.length} item</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                    {Object.entries(menuCategories as Record<string, any[]>).map(([category, items]) => (
                      <div key={category}>
                        <div className="mb-2 text-[9px] font-black uppercase text-slate-500 tracking-wider">{category}</div>

<div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1.5">
  {items.map(menu => (
    <button
      key={menu.id}
      onClick={() => handleAddMenuToOrder(menu)}
      className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/80 p-1.5 text-left text-[10px] font-bold text-slate-200 hover:border-blue-500 hover:bg-slate-900 transition-all"
    >
      <div className="truncate leading-tight">{menu.name}</div>
      <div className="mt-1 text-[9px] text-slate-400 truncate">
        Rp {Number(menu.price).toLocaleString('id-ID')}
      </div>
      {menu.inventory_id && (
        <div className={`mt-1 text-[9px] font-extrabold truncate ${Number(menu.available_stock || 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
          Stok: {Number(menu.available_stock || 0).toLocaleString('id-ID')} {menu.unit || ""}
        </div>
      )}
    </button>
  ))}
</div>

                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-5 no-scrollbar">
                <table className="w-full min-w-[34rem] table-fixed text-left text-[10px]">
                  <thead className="text-[9px] font-bold text-slate-500 border-b border-slate-800 uppercase tracking-wider sticky top-0 bg-[#020617] z-10">
                    <tr>
                      <th className="w-[40%] pb-2">NAMA PRODUK</th>
                      <th className="w-[18%] pb-2 text-center">QTY</th>
                      <th className="w-[21%] pb-2 text-right">HARGA SATUAN</th>
                      <th className="w-[21%] pb-2 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {orderItems.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-2 pr-2">
                          <div className="flex flex-col gap-1">
                            <span className="truncate text-[11px] font-semibold text-slate-200">{item.name}</span>
                            <button onClick={() => handleUpdateOrderItemQty(item, -item.qty)} className="self-start text-[8px] text-red-400 hover:text-red-300 transition-colors">Cancel/Hapus</button>
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => handleUpdateOrderItemQty(item, -1)} className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-900 transition-colors">-</button>
                            <div className="text-[10px] font-mono font-bold text-blue-400">{item.qty}</div>
                            <button onClick={() => handleUpdateOrderItemQty(item, 1)} className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 hover:bg-slate-900 transition-colors">+</button>
                          </div>
                        </td>
                        <td className="py-2 text-right text-[10px] font-mono text-slate-500">Rp {item.price.toLocaleString('id-ID')}</td>
                        <td className="py-2 text-right text-[10px] font-mono font-bold text-slate-100">Rp {(item.qty * item.price).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <ShoppingBag size={24} />
                <p className="text-sm font-bold">{selectedTable ? "Meja dipilih — menyiapkan pesanan" : "Pilih Meja untuk Memulai Billing"}</p>
              </div>
              {menuItems.length > 0 ? (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Daftar Menu ({menuItems.length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {menuItems.map((menu: any) => (
                      <button key={menu.id} onClick={() => alert("Menu tersedia, tetapi transaksi meja belum aktif. Klik meja lagi; jika tetap sama, transaksi gagal dibuat.")} className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs text-white">
                        <div className="font-bold">{menu.name}</div>
                        <div className="mt-1 text-slate-400">Rp {Number(menu.price || 0).toLocaleString("id-ID")}</div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-amber-300">Menu belum berhasil dimuat untuk tenant {tenantId}.</p>
              )}
            </div>
          )}
        </div>

        {/* CHECKOUT PANEL */}
        <div className="w-full xl:w-96 2xl:w-[26rem] xl:shrink-0 min-h-0 max-h-[70vh] xl:h-full xl:max-h-full overflow-y-auto bg-slate-900/40 rounded-3xl border border-slate-800/80 flex flex-col p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
          {activeOrder ? (
            <div className="flex flex-col min-h-full">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider mb-4 border-b border-slate-800 pb-2.5 flex items-center gap-2 uppercase"><CreditCard size={14}/> Ringkasan Pembayaran</h3>
              
              <div className="space-y-2.5 mb-4 bg-slate-950/40 p-3 sm:p-4 rounded-2xl border border-slate-800/60">
                <div className="flex justify-between items-center gap-3 text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span className="whitespace-nowrap text-white font-mono">Rp {getSubtotal().toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between items-center gap-3 text-xs font-bold text-blue-400">
                  <span>DISKON</span>
                  <input type="number" className="w-24 shrink-0 bg-blue-500/10 border border-blue-500/30 rounded-xl px-2.5 py-1 text-right text-blue-300 outline-none font-bold text-xs" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
                {fiscalSettings.use_service_charge && <div className="flex justify-between items-center gap-3 text-[10px] font-bold text-slate-500"><span>SERVICE ({Math.round(fiscalSettings.service_charge*100)}%)</span><span className="whitespace-nowrap text-slate-300 font-mono">Rp {getService().toLocaleString('id-ID')}</span></div>}
                {fiscalSettings.use_tax && <div className="flex justify-between items-center gap-3 text-[10px] font-bold text-slate-500"><span>PAJAK ({Math.round(fiscalSettings.tax_rate*100)}%)</span><span className="whitespace-nowrap text-slate-300 font-mono">Rp {getTax().toLocaleString('id-ID')}</span></div>}
              </div>

              {/* CUSTOMER SELECTOR */}
              <div className="mb-4 relative">
                <p className="text-[10px] font-bold text-yellow-500 mb-1.5 uppercase">Pelanggan CRM (Opsional)</p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 bg-yellow-500/5 border border-yellow-500/25 rounded-2xl p-3">
                  <div className="min-w-0">
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
                <p className="break-words text-xl sm:text-2xl font-black tracking-tight leading-tight text-white mb-5">Rp {getGrandTotal().toLocaleString('id-ID')}</p>
                
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
                <button
  type="button"
  onClick={handleTestBluetooth}
  disabled={testingBluetooth}
  className="w-full py-3 mb-2 rounded-2xl font-bold text-xs
    flex items-center justify-center gap-2
    bg-green-600 text-white hover:bg-green-500
    disabled:opacity-50 transition-all"
>
  <Printer size={15} />
  {testingBluetooth ? "MENGUJI BLUETOOTH..." : "TES CETAK BLUETOOTH"}
</button>
                
                <button onClick={() => setShowPreviewModal(true)} disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} className={`w-full py-4.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${(paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : (paymentMethod === "QRIS" || !!selectedBank)) ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg' : 'bg-slate-900 text-slate-500 opacity-55 cursor-not-allowed'}`}><Printer size={15}/> PRATINJAU NOTA</button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-30 select-none">
              <CheckCircle2 size={28} className="mb-3 text-slate-400"/>
              <p className="text-xs font-bold text-slate-400 uppercase">{tenantType === "RETAIL" ? "Menunggu transaksi RETAIL" : "Pilih Meja untuk Membayar"}</p>
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
            <h3 className="font-extrabold text-lg text-center border-b-2 border-slate-900 border-double pb-2 mb-4">{outletProfileName || receiptStoreName || ""}</h3>
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
