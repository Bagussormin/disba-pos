import { fetchWithTimeout } from "../../lib/printer";
import { safeJSONParse } from "../../lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { executePrint, executeShiftClosingPrint } from "../../lib/printer";
import { 
  LogOut, Receipt, MapPin, AlertTriangle, Wallet, Printer, Banknote, X, 
  BarChart3, FileText, Lock, CreditCard, ChevronRight, CheckCircle2, Loader2, ShoppingBag, Search,
  Scissors, Users, Armchair, Star, Compass, QrCode, Wifi, WifiOff, Calendar, ChevronLeft
} from "lucide-react";
import {
  testBluetoothPrint,
  printBluetoothReceipt,
} from "../../services/bluetoothPrinter";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_NAMES_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

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
  const [fiscalSettings, setFiscalSettings] = useState({ loyalty_point_rate: 1000 });

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
  
  // --- REKAP: cetak ulang bill berdasarkan tanggal ---
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [rekapDate, setRekapDate] = useState<string>("");
  const [rekapMonth, setRekapMonth] = useState<Date>(() => new Date());
  const [rekapBills, setRekapBills] = useState<any[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [reprintConfig, setReprintConfig] = useState<any | null>(null);
  const rekapReqRef = useRef(0);

  // --- ARSIP & LAPORAN: cetak laporan shift ---
  const [shiftModalMode, setShiftModalMode] = useState<"ARSIP" | "LAPORAN" | null>(null);
  const [shiftList, setShiftList] = useState<any[]>([]);
  const [shiftListLoading, setShiftListLoading] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [previewBill, setPreviewBill] = useState<any | null>(null); // bill yang struknya sedang ditampilkan

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [selectedBank, setSelectedBank] = useState<any | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);
  const [receiptStoreName, setReceiptStoreName] = useState<string | null>(null);
  const [outletProfileName, setOutletProfileName] = useState<string | null>(null);
  const cashierName = localStorage.getItem("username")?.trim() || "Kasir";
  const outletName =
    localStorage.getItem("tenant_name")?.trim() ||
    outletProfileName ||
    receiptStoreName ||
    tenantId ||
    "Outlet";
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
  const [pendingTable, setPendingTable] = useState<any | null>(null); // meja yang menunggu nama tamu
  const [guestNameInput, setGuestNameInput] = useState("");
  const [selectedMenuCategory, setSelectedMenuCategory] = useState("SEMUA");
  const [menuSearch, setMenuSearch] = useState("");

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
      const { data } = await supabase.from("receipt_settings").select("loyalty_point_rate,store_name").eq("tenant_id", tenantId).maybeSingle();
      if (data) {
        setFiscalSettings({ loyalty_point_rate: data.loyalty_point_rate ?? 1000 });
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

      if (Array.isArray(tRes.data) && tRes.data.length > 0) {
        console.log("DATA TABLE DARI SUPABASE:", tRes.data);
        setTables(tRes.data);
        localStorage.setItem("disba_cache_tables", JSON.stringify(tRes.data));
      } else {
        // Jangan hapus meja yang sudah tersimpan jika query sementara mengembalikan array kosong.
        const cachedTables = safeJSONParse(
          localStorage.getItem("disba_cache_tables") || "[]",
          []
        );
        setTables((currentTables) => {
          const preservedTables = currentTables.length > 0 ? currentTables : cachedTables;
          return preservedTables;
        });
      }
      if (oRes.data) {
        setOrders(oRes.data);
        localStorage.setItem("disba_cache_orders", JSON.stringify(oRes.data));
      }
    } catch (err) {
      // Using cached table and order data - offline mode
      const cachedTables = localStorage.getItem("disba_cache_tables");
      const cachedOrders = localStorage.getItem("disba_cache_orders");
      
      let finalTables: any[] = [];
      let finalOrders: any[] = [];

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
    // Cache dipisahkan per tenant agar menu outlet lain tidak tertukar.
    const cacheKey = `disba_cache_menus_${tenantId}`;
    const cachedMenus = localStorage.getItem(cacheKey);
    if (cachedMenus) {
      const parsedMenus = safeJSONParse(cachedMenus, []);
      if (Array.isArray(parsedMenus)) setMenuItems(parsedMenus);
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

      if (error) throw error;

      // Jika filter is_available=true tidak mengembalikan menu, coba ambil menu tenant
      // lalu tampilkan yang tidak secara eksplisit dinonaktifkan.
      let resolvedMenus = Array.isArray(data) ? data : [];
      if (resolvedMenus.length === 0) {
        const { data: tenantMenus, error: tenantMenusError } = await supabase
          .from("menus")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true });

        if (tenantMenusError) throw tenantMenusError;
        resolvedMenus = (tenantMenus || []).filter(
          (menu: any) => menu.is_available !== false
        );
        console.log("MENU FALLBACK TENANT:", resolvedMenus);
      }

      if (Array.isArray(resolvedMenus)) {
        const { data: stockRows, error: stockError } = await supabase
          .from("inventory")
          .select("id, item_name, current_stock, stock_quantity, unit")
          .eq("tenant_id", tenantId);

        if (stockError) console.error("Gagal mengambil stok Inventory untuk kasir:", stockError);

        const stockById = new Map(
          (stockRows || []).map((row: any) => [
            String(row.id),
            Number(row.current_stock ?? row.stock_quantity ?? 0)
          ])
        );
        const menusWithStock = resolvedMenus.map((menu: any) => ({
          ...menu,
          available_stock: menu.inventory_id
            ? (stockById.get(String(menu.inventory_id)) ?? 0)
            : null
        }));

        setMenuItems(menusWithStock);
        localStorage.setItem(cacheKey, JSON.stringify(menusWithStock));
        // Backward-compatible cache for older screens.
        localStorage.setItem("disba_cache_menus", JSON.stringify(menusWithStock));
      }
    } catch (err: any) {
      console.error("Kesalahan saat mengambil menu:", err);
      alert("Menu gagal dimuat untuk " + tenantId + ": " + (err?.message || "Kesalahan tidak diketahui"));
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

  // ============ REKAP / ARSIP / LAPORAN ============
  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Ambil semua bill pada satu tanggal (jam lokal 00:00 - 24:00).
  const fetchBillsByDate = async (dateKey: string) => {
    const reqId = ++rekapReqRef.current;
    setRekapLoading(true);
    try {
      const [y, m, d] = dateKey.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("tenant_id", tenantId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (reqId === rekapReqRef.current) setRekapBills(data || []);
    } catch (err: any) {
      if (reqId === rekapReqRef.current) setRekapBills([]);
      alert("Gagal memuat bill: " + (err?.message || "Kesalahan tidak diketahui"));
    } finally {
      if (reqId === rekapReqRef.current) setRekapLoading(false);
    }
  };

  const openRekapModal = async () => {
    if (!isOnline) return alert("Rekap bill hanya tersedia saat online.");
    const today = new Date();
    const key = toDateKey(today);
    setShowRekapModal(true);
    setRekapMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setRekapDate(key);
    setRekapBills([]);
    try {
      const { data } = await supabase.from("receipt_settings").select("*").eq("tenant_id", tenantId).maybeSingle();
      setReprintConfig(data || null);
    } catch (e) {
      setReprintConfig(null);
    }
    await fetchBillsByDate(key);
  };

  const selectRekapDate = (dateKey: string) => {
    setRekapDate(dateKey);
    void fetchBillsByDate(dateKey);
  };

  // Cetak ulang satu bill. Format data disamakan dengan struk saat pembayaran.
  const reprintBill = async (trx: any) => {
    if (printingId) return;
    setPrintingId(String(trx.id));
    try {
      const parsedItems = typeof trx.items === "string" ? safeJSONParse(trx.items, []) : trx.items;
      const cfg = reprintConfig || {};
      const total = Number(trx.total || 0);
      const receiptData = {
        ...trx,
        receipt_no: trx.receipt_no,
        tableName: trx.table_name || "Takeaway",
        cashierName: trx.cashier || "KASIR",
        items: Array.isArray(parsedItems) ? parsedItems : [],
        subtotal: Number(trx.subtotal || 0),
        discount: Number(trx.discount || 0),
        tax: Number(trx.pb1 || 0),
        total,
        paymentMethod: trx.payment_method,
        // Uang diterima & kembalian tidak disimpan di transaksi, jadi dicetak pas.
        paid: total,
        change: 0,
        storeName: cfg.store_name || receiptStoreName || outletProfileName || "NES HOUSE",
        address: cfg.address || "",
        contact: cfg.contact || "",
        footerText: cfg.footer_text || "Terima Kasih",
        reprint: true,
      };

      const isAndroidTablet =
        /Android/i.test(navigator.userAgent) &&
        navigator.maxTouchPoints > 0;

      if (isAndroidTablet) {
        await printBluetoothReceipt(receiptData);
      } else {
        await executePrint(receiptData);
      }
    } catch (err: any) {
      console.error("Gagal mencetak ulang bill:", err);
      alert("Bill gagal dicetak ulang. Periksa koneksi printer.");
    } finally {
      setPrintingId(null);
    }
  };

  // ARSIP = riwayat 30 shift terakhir. LAPORAN = shift hari ini (termasuk yang masih berjalan).
  const openShiftModal = async (mode: "ARSIP" | "LAPORAN") => {
    if (!isOnline) {
      return alert(mode === "ARSIP" ? "Arsip shift hanya tersedia saat online." : "Laporan shift hanya tersedia saat online.");
    }
    setShiftModalMode(mode);
    setShiftList([]);
    setShiftListLoading(true);
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_time", { ascending: false })
        .limit(30);
      if (error) throw error;

      let rows: any[] = data || [];
      if (mode === "LAPORAN") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        rows = rows.filter(
          (sh: any) => new Date(sh.start_time) >= startOfToday || sh.status === "open"
        );
      }
      setShiftList(rows);
    } catch (err: any) {
      alert("Gagal memuat daftar shift: " + (err?.message || "Kesalahan tidak diketahui"));
      setShiftModalMode(null);
    } finally {
      setShiftListLoading(false);
    }
  };

  const reprintShiftReport = async (shift: any) => {
    if (printingId) return;
    setPrintingId(String(shift.id));
    try {
      const isOpen = shift.status === "open";
      await printShiftReportFor(shift, {
        closedAt: !isOpen && shift.end_time ? new Date(shift.end_time) : new Date(),
        endingCashValue: Number(shift.actual_ending_cash ?? 0),
        selisihValue: Number(shift.difference ?? 0),
        interim: isOpen,
      });
    } catch (err: any) {
      console.error("Gagal mencetak laporan shift:", err);
      alert("Laporan shift gagal dicetak: " + (err?.message || "Periksa koneksi printer."));
    } finally {
      setPrintingId(null);
    }
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
      let trxList: any[] = [];
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
  const getTax = () => Math.round(getNetSubtotal() * 0.10);
  const getGrandTotal = () => getNetSubtotal() + getTax();
  const getChange = () => Math.max(0, paidAmount - getGrandTotal());

  // Kelompokkan menu per kategori (huruf besar, spasi dipangkas).
  const menuCategories = menuItems.reduce((acc: Record<string, any[]>, menu: any) => {
    const category = String(menu.category || "LAINNYA").trim().toUpperCase();
    if (!acc[category]) acc[category] = [];
    acc[category].push(menu);
    return acc;
  }, {} as Record<string, any[]>);

  // Menu yang tampil sesuai kategori yang dipilih.
  // Saat kasir mengetik di kolom cari, pencarian berlaku untuk SEMUA kategori.
  const searchQuery = menuSearch.trim().toLowerCase();
  const filteredMenuItems: any[] = searchQuery
    ? menuItems.filter((menu: any) =>
        String(menu.name || "").toLowerCase().includes(searchQuery)
      )
    : selectedMenuCategory === "SEMUA"
      ? menuItems
      : menuCategories[selectedMenuCategory] || [];

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
        service_charge: 0, 
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

      // Cetak laporan setelah shift berhasil ditutup.
      // Jika printer gagal, status shift tetap tertutup dan proses logout tetap berjalan.
      try {
        await handlePrintShiftClosing(selisih);
      } catch (printError: any) {
        console.error("Laporan shift gagal dicetak:", printError);
        alert("Shift berhasil ditutup, tetapi laporan gagal dicetak. Periksa printer lalu cetak ulang dari arsip jika tersedia.");
      }
      
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

  // Cetak laporan shift untuk shift mana pun (saat tutup shift, cetak ulang arsip, atau laporan sementara).
  const printShiftReportFor = async (
    shift: any,
    opts: { closedAt: Date; endingCashValue?: number; selisihValue?: number; interim?: boolean }
  ) => {
    const closedAt = opts.closedAt;
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("items, subtotal, discount, service_charge, total, payment_method")
      .eq("shift_id", shift.id)
      .eq("tenant_id", tenantId);

    if (error) {
      throw new Error("Gagal mengambil transaksi untuk laporan shift: " + error.message);
    }

    // Gabungkan item dengan ID/nama yang sama, hitung qty dan total nilai jual.
    const salesByItem = new Map<string, { name: string; qty: number; price: number; total: number }>();
    (transactions || []).forEach((trx: any) => {
      const rawItems = typeof trx.items === "string"
        ? safeJSONParse(trx.items, [])
        : trx.items;
      if (!Array.isArray(rawItems)) return;

      rawItems.forEach((item: any) => {
        const name = String(item.name || item.menu_name || "Barang").trim();
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const price = Number(item.price ?? item.price_at_time ?? 0);
        if (!qty || qty <= 0) return;

        const key = String(item.id ?? item.menu_id ?? name).toLowerCase();
        const existing = salesByItem.get(key);
        if (existing) {
          existing.qty += qty;
          existing.total += qty * price;
        } else {
          salesByItem.set(key, { name, qty, price, total: qty * price });
        }
      });
    });

    const items = Array.from(salesByItem.values())
      .sort((a, b) => a.name.localeCompare(b.name, "id"))
      .map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        total: item.total,
      }));

    const trxList = transactions || [];
    const subtotal = trxList.reduce((sum: number, trx: any) => sum + Number(trx.subtotal || 0), 0);
    const diskonBill = trxList.reduce((sum: number, trx: any) => sum + Number(trx.discount || 0), 0);
    const serviceCharge = trxList.reduce((sum: number, trx: any) => sum + Number(trx.service_charge || 0), 0);
    const totalPenjualan = trxList.reduce((sum: number, trx: any) => sum + Number(trx.total || 0), 0);
    const cashSales = trxList
      .filter((trx: any) => trx.payment_method === "CASH")
      .reduce((sum: number, trx: any) => sum + Number(trx.total || 0), 0);
    const kasDiharapkan = Number(shift?.starting_cash || 0) + cashSales;

    // Shift yang masih berjalan belum punya uang fisik, jadi dicetak sebagai laporan sementara.
    const kasAktual = opts.interim ? kasDiharapkan : Number(opts.endingCashValue ?? 0);
    const kasSelisih = opts.interim ? 0 : Number(opts.selisihValue ?? 0);
    const baseStoreName = receiptStoreName || outletProfileName || "DISBA POS";

    await executeShiftClosingPrint({
      storeName: opts.interim ? `${baseStoreName} (SEMENTARA)` : baseStoreName,
      cashierName: shift?.cashier_name || localStorage.getItem("username") || "KASIR",
      items,
      closingData: {
        date: closedAt.toLocaleDateString("id-ID", {
          day: "2-digit", month: "long", year: "numeric"
        }),
        startTime: new Date(shift.start_time).toLocaleString("id-ID"),
        endTime: closedAt.toLocaleString("id-ID"),
        totalPenjualan,
        subtotal,
        diskonBill,
        service: serviceCharge,
        kasDiharapkan,
        kasAktual,
        kasSelisih,
        awalLaci: Number(shift?.starting_cash || 0),
        kasPenjualan: cashSales,
        totalItemTerjual: items.reduce((sum, item) => sum + item.qty, 0),
      },
    });
  };

  // Dipakai saat tutup shift (perilaku sama seperti sebelumnya).
  const handlePrintShiftClosing = async (selisih: number) => {
    await printShiftReportFor(currentShift, {
      closedAt: new Date(),
      endingCashValue: Number(endingCash),
      selisihValue: Number(selisih),
    });
  };

  const handleLogOut = () => { if (window.confirm("Keluar dari Terminal Kasir?")) { localStorage.removeItem("role"); localStorage.removeItem("username"); window.location.replace("/login"); } };

  // Membuka meja. Isinya sama dengan onClick kartu meja sebelumnya; satu-satunya beda:
  // guest_name kini berisi nama tamu dari kasir (null bila meja sudah punya pesanan).
  const handleOpenTable = async (t: any, guestName: string | null) => {
    // Buka meja secara eksplisit dari database agar state lama tidak menghalangi menu.
    setSelectedTable(t);
    // Muat menu lagi saat meja dipilih supaya panel tidak bergantung pada state awal.
    void fetchMenuItems();
    setLoading(true);
    try {
      const { data: existing, error: lookupError } = await supabase
        .from("orders")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("table_id", t.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (lookupError) throw lookupError;

      let order = existing;
      if (!order) {
        const { data: created, error: createError } = await supabase
          .from("orders")
          .insert({
            tenant_id: tenantId,
            table_id: t.id,
            status: "open",
            waiter_name: localStorage.getItem("username") || "KASIR",
            customer_name: null,
            guest_name: guestName
          })
          .select("*")
          .single();
        if (createError) throw createError;
        order = created;
      }

      if (!order) throw new Error("Pesanan meja tidak berhasil dibuka.");
      // Tampilkan panel billing segera setelah pesanan ditemukan/dibuat.
      // Pemuatan detail item dan menu berjalan terpisah agar tidak menghalangi panel.
      setSelectedTable(t);
      setActiveOrder(order);
      setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
      setOrderItems([]);
      setLoading(false);
      void fetchOrderItems(order.id);
      void fetchMenuItems();
    } catch (err: any) {
      console.error("GAGAL MEMBUKA MEJA:", err);
      alert("Meja gagal dibuka: " + (err?.message || "Kesalahan tidak diketahui"));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmGuestName = () => {
    const name = guestNameInput.trim();
    if (!pendingTable || !name) return;
    const table = pendingTable;
    setPendingTable(null);
    setGuestNameInput("");
    void handleOpenTable(table, name);
  };

  const handleCancelGuestName = () => {
    setPendingTable(null);
    setGuestNameInput("");
  };

  // TAMPILAN SAJA: halaman meja saat belum ada meja dipilih, lalu menu + transaksi setelah meja dibuka.
  // Hanya membaca state yang sudah ada; tidak mengubah logika apa pun.
  const isOrderView = !!selectedTable || (tenantType === "RETAIL" && tables.length === 0);

  // Data kalender modal Rekap.
  const todayKey = toDateKey(new Date());
  const rekapYear = rekapMonth.getFullYear();
  const rekapMon = rekapMonth.getMonth();
  const rekapFirstOffset = (new Date(rekapYear, rekapMon, 1).getDay() + 6) % 7; // minggu mulai Senin
  const rekapDaysInMonth = new Date(rekapYear, rekapMon + 1, 0).getDate();
  const rekapIsCurrentMonth = `${rekapYear}-${String(rekapMon + 1).padStart(2, "0")}` >= todayKey.slice(0, 7);
  const rekapTotal = rekapBills.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const previewItems: any[] = previewBill
    ? (Array.isArray(previewBill.items)
        ? previewBill.items
        : typeof previewBill.items === "string"
          ? safeJSONParse(previewBill.items, [])
          : [])
    : [];
  const previewPaymentLabel =
    previewBill?.payment_method === "CASH" ? "Tunai"
    : previewBill?.payment_method === "TRANSFER" ? "Transfer Bank"
    : previewBill?.payment_method || "";
  const rekapDateLabel = rekapDate
    ? (() => {
        const [y, m, d] = rekapDate.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
      })()
    : "";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f3f5f9] font-sans text-[#1c2433] md:flex-row">
      <aside className="hidden w-20 shrink-0 flex-col bg-[#16233b] text-slate-200 shadow-xl md:flex">
        <div className="flex justify-center px-2 pb-3 pt-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f08a24] text-xl font-black text-white"
            title="DISBA POS"
          >
            D
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-1.5 py-2" aria-label="Navigasi kasir">
          <button
            type="button"
            onClick={() => document.getElementById("kasir-tables")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            title="Kasir"
            className="flex w-full flex-col items-center gap-1 rounded-xl bg-[#1f6fe0] px-1 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
          >
            <Armchair size={22} />
            <span className="text-[11px] font-medium leading-none">Kasir</span>
          </button>
          <button
            type="button"
            onClick={() => void openShiftModal("LAPORAN")}
            title="Cetak laporan shift hari ini"
            className="flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[#9fb0cf] transition-colors hover:bg-[#21345a] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
          >
            <BarChart3 size={22} />
            <span className="text-[11px] font-medium leading-none">Laporan</span>
          </button>
        </nav>

        <div className="space-y-3 border-t border-white/10 px-2 py-3">
          <div className="flex flex-col items-center gap-1 text-center" title={outletName}>
            <p className="w-full truncate text-[11px] font-semibold text-white">{outletName}</p>
            <div className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${isOnline ? "text-emerald-400" : "text-red-300"}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </div>
          </div>
          <div className="flex justify-center" title={cashierName}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-200">
              {cashierName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      
      {/* HEADER CONTROL */}
      <header className="flex min-h-[56px] shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#e3e7ef] bg-white px-3 py-2 sm:px-4 md:flex-nowrap md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-[#1c2433]">
              Dashboard Kasir
            </h1>
            <p className="truncate text-xs font-medium text-[#6b7588]">{outletName} · {tenantType}</p>
          </div>
          <div className="flex gap-2">
            {tenantType === "RETAIL" && (
              <button
                onClick={() => handleCreateRetailOrder()}
                className="h-10 rounded-xl bg-[#1f6fe0] px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                + TRANSAKSI BARU
              </button>
            )}
          </div>
          {/* STATUS KONEKSI (ONLINE/OFFLINE RESILIENCE INDICATOR) */}
          <div className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <div className="hidden max-w-36 items-center gap-2 truncate rounded-lg bg-[#f3f5f9] px-2.5 py-2 text-xs font-semibold text-[#1c2433] sm:flex xl:max-w-48" title={cashierName}>
            <Users size={14} className="shrink-0 text-[#1f6fe0]" />
            <span className="truncate">{cashierName}</span>
          </div>
          <button onClick={() => void openShiftModal("ARSIP")} title="Cetak ulang laporan shift" aria-label="Arsip" className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e3e7ef] bg-white px-3 text-xs font-bold tracking-wide text-slate-600 transition-colors hover:bg-slate-50"><FileText size={15} /><span className="hidden lg:inline">ARSIP</span></button>
          <button onClick={() => void openRekapModal()} title="Cetak ulang bill per tanggal" aria-label="Rekap" className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e3e7ef] bg-white px-3 text-xs font-bold tracking-wide text-slate-600 transition-colors hover:bg-slate-50"><Receipt size={15} /><span className="hidden lg:inline">REKAP</span></button>
          <button onClick={openCloseShiftModal} title="Tutup shift" aria-label="Tutup shift" className="flex h-10 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-bold tracking-wide text-orange-700 transition-colors hover:bg-orange-100"><Lock size={15} /><span className="hidden lg:inline">TUTUP SHIFT</span></button>
          <button onClick={handleLogOut} aria-label="Keluar" title="Keluar" className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"><LogOut size={16}/></button>
        </div>
      </header>

      {/* CORE BODY */}
      <div className={`grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto bg-[#f3f5f9] p-3 sm:p-4 ${isOrderView ? "[@media(orientation:portrait)_and_(min-width:1024px)]:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)] [@media(orientation:landscape)_and_(min-width:768px)]:grid-cols-[minmax(0,1fr)_clamp(300px,30vw,400px)]" : ""} [@media(orientation:landscape)_and_(min-width:768px)]:grid-rows-[minmax(0,1fr)] [@media(orientation:landscape)_and_(min-width:768px)]:gap-3 [@media(orientation:landscape)_and_(min-width:768px)]:overflow-hidden [@media(orientation:landscape)_and_(min-width:768px)]:p-3`}>
        
        {/* PANEL MEJA (SIDEBAR) */}
        <section id="kasir-tables" aria-labelledby="kasir-tables-title" className={`min-h-0 w-full min-w-0 overflow-y-auto rounded-2xl border border-[#e3e7ef] bg-white p-3 shadow-sm [@media(orientation:landscape)_and_(min-width:768px)]:h-full [@media(orientation:landscape)_and_(min-width:768px)]:max-h-full ${isOrderView ? "hidden" : ""}`}>
          {tables.length === 0 && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="text-sm font-bold">Meja belum berhasil dimuat.</p>
              <p className="mt-1 text-xs">Pastikan akun kasir dan meja menggunakan outlet yang sama.</p>
              <button onClick={() => fetchData()} className="mt-3 min-h-10 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white">Coba Muat Ulang Meja</button>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0">
              <h2 id="kasir-tables-title" className="text-base font-bold text-[#1c2433]">Meja Restoran</h2>
              <p className="mt-0.5 text-xs text-[#6b7588]">Pilih meja untuk membuka transaksi.</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#6b7588]">{tables.length} meja</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(160px,100%),1fr))] gap-3">
            {tables.map(t => {
              const hasOrder = orders.some(o => o.table_id === t.id);
              const tableGuest = orders.find(o => o.table_id === t.id)?.guest_name;
              const isSelected = selectedTable?.id === t.id;
              const isLocked = t.status === "payment" || t.status === "closed";
              const statusLabel = isLocked ? "Menunggu pembayaran" : hasOrder ? "Terisi" : "Tersedia";

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    // Meja yang belum punya pesanan meminta nama tamu dulu; meja terisi dibuka langsung.
                    if (!hasOrder) { setPendingTable(t); setGuestNameInput(""); return; }
                    void handleOpenTable(t, null);
                  }}
                  className={`flex min-h-[84px] w-full flex-col items-start justify-between gap-1 rounded-2xl border-2 px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200"
                      : isLocked
                        ? "border-[#d99a06] bg-[#fdf4d9] text-[#7a5600] hover:brightness-95"
                        : hasOrder
                          ? "border-[#d64545] bg-[#fbe7e7] text-red-900 hover:brightness-95"
                          : "border-[#1d9a6c] bg-[#e6f5ee] text-emerald-900 hover:brightness-95"
                  }`}
                >
                  <span className="min-w-0 text-xs font-semibold leading-tight">{isSelected ? `Dipilih · ${statusLabel}` : statusLabel}</span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Armchair size={16} strokeWidth={2} className="shrink-0" />
                    <span className="break-words text-base font-bold leading-tight">{t.name}</span>
                  </span>
                  {tableGuest && <span className="w-full truncate text-xs font-medium opacity-80">Tamu: {tableGuest}</span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* ORDER DETAILS PANEL */}
        <div id="kasir-order-panel" className={`${isOrderView ? "flex" : "hidden"} min-h-[min(68vh,720px)] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e3e7ef] bg-white shadow-sm [@media(orientation:landscape)_and_(min-width:768px)]:h-full [@media(orientation:landscape)_and_(min-width:768px)]:min-h-0`}>
          {activeOrder ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e3e7ef] bg-white p-3 sm:px-4">
                <div className="flex items-center gap-2.5">
                  <Receipt size={16} className="text-[#1f6fe0]"/>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[#1c2433]">Billing {tenantType === "RETAIL" ? "RETAIL" : selectedTable?.name}</h2>
                    {activeOrder?.guest_name && <p className="truncate text-xs font-medium text-[#6b7588]">Tamu: {activeOrder.guest_name}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSplitQuantities({}); setShowSplitModal(true); }} className="flex h-10 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100"><Scissors size={12}/> PISAH NOTA</button>
                  <button onClick={() => setSelectedTable(null)} title="Kembali ke daftar meja" className="flex h-10 items-center gap-1.5 rounded-xl border border-[#e3e7ef] bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"><X size={18}/><span>Ke Meja</span></button>
                </div>
              </div>
              {/* AREA ISI: menu (kiri) + daftar pesanan (kanan). Di layar < 1280px keduanya bertumpuk. */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 xl:flex-row">

                {/* PILIH MENU */}
                {menuItems.length > 0 && (
                  <section
                    id="kasir-menu-section"
                    className="flex min-h-[300px] min-w-0 flex-[3] flex-col overflow-hidden rounded-xl border border-[#e3e7ef] bg-[#f8f9fc] p-3 xl:min-h-0"
                  >
                    <div className="mb-2 flex shrink-0 items-center justify-between text-xs font-bold uppercase tracking-widest text-[#6b7588]">
                      <span>Pilih Menu</span>
                      <span className="font-semibold">{filteredMenuItems.length} item</span>
                    </div>

                    {/* KOLOM CARI MENU */}
                    <div className="relative mb-3 shrink-0">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        inputMode="search"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setMenuSearch("");
                          // Enter menambahkan menu bila hasil pencarian tinggal satu.
                          if (e.key === "Enter" && filteredMenuItems.length === 1) {
                            e.preventDefault();
                            void handleAddMenuToOrder(filteredMenuItems[0]);
                            setMenuSearch("");
                          }
                        }}
                        placeholder="Cari menu..."
                        aria-label="Cari menu"
                        className="h-11 w-full rounded-xl border border-[#e3e7ef] bg-white pl-9 pr-10 text-sm text-[#1c2433] outline-none transition-colors focus:border-[#1f6fe0]"
                      />
                      {menuSearch && (
                        <button
                          type="button"
                          onClick={() => setMenuSearch("")}
                          aria-label="Hapus pencarian"
                          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* TOMBOL KATEGORI: dibungkus ke baris berikutnya agar semua terlihat */}
                    <div className="mb-3 flex shrink-0 flex-wrap gap-2">
                      {["SEMUA", ...Object.keys(menuCategories)].map((category) => (
                        <button
                          key={category}
                          onClick={() => { setSelectedMenuCategory(category); setMenuSearch(""); }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                            !searchQuery && selectedMenuCategory === category
                              ? "bg-[#1f6fe0] text-white"
                              : "border border-[#e3e7ef] bg-white text-[#6b7588] hover:border-[#1f6fe0]"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>

                    {/* DAFTAR PRODUK (hanya bagian ini yang bisa di-scroll) */}
                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                      {filteredMenuItems.length === 0 && (
                        <p className="px-2 py-8 text-center text-xs font-semibold text-[#6b7588]">
                          {searchQuery ? `Tidak ada menu dengan nama "${menuSearch.trim()}".` : "Belum ada menu di kategori ini."}
                        </p>
                      )}
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-2">
                        {filteredMenuItems.map((menu: any) => (
                          <button
                            key={menu.id}
                            onClick={() => handleAddMenuToOrder(menu)}
                            className="min-h-[76px] min-w-0 rounded-xl border border-[#e3e7ef] bg-white p-2.5 text-left transition-all hover:border-[#1f6fe0] active:scale-[0.98]"
                          >
                            <div className="text-[13px] font-semibold leading-snug text-[#1c2433]">{menu.name}</div>
                            <div className="mt-1 truncate text-[13px] font-bold text-[#1f6fe0]">
                              Rp {Number(menu.price).toLocaleString("id-ID")}
                            </div>
                            {menu.inventory_id && (
                              <div
                                className={`mt-1 truncate text-xs font-bold ${
                                  Number(menu.available_stock || 0) > 0 ? "text-emerald-600" : "text-red-500"
                                }`}
                              >
                                Stok: {Number(menu.available_stock || 0).toLocaleString("id-ID")} {menu.unit || ""}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* DAFTAR PESANAN */}
                <section
                  id="kasir-order-items"
                  className="flex min-h-[260px] min-w-0 flex-[2] flex-col overflow-hidden rounded-xl border border-[#e3e7ef] bg-white xl:min-h-0"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-[#e3e7ef] px-3 py-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#6b7588]">Pesanan</h3>
                    <span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#6b7588]">
                      {orderItems.reduce((n, it) => n + it.qty, 0)} item
                    </span>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {orderItems.length === 0 ? (
                      <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-4 text-center text-[#6b7588]">
                        <ShoppingBag size={24} />
                        <p className="text-xs font-semibold">Belum ada barang. Pilih menu di sebelah untuk menambahkan.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#e3e7ef]">
                        {orderItems.map((item, i) => (
                          <li key={item.order_item_id ?? `${item.id}-${i}`} className="px-3 py-2.5 transition-colors hover:bg-[#f8f9fc]">
                            <div className="flex items-start justify-between gap-2">
                              <span className="min-w-0 break-words text-[13px] font-semibold leading-snug text-[#1c2433]">{item.name}</span>
                              <span className="shrink-0 font-mono text-xs font-bold text-[#1c2433]">
                                Rp {(item.qty * item.price).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleUpdateOrderItemQty(item, -1)} className="h-9 w-9 rounded-lg border border-[#e3e7ef] bg-white text-lg font-semibold leading-none text-[#1f6fe0] transition-colors hover:bg-[#e8f0fd]">-</button>
                                <div className="min-w-[2rem] text-center text-sm font-bold text-[#1c2433]">{item.qty}</div>
                                <button onClick={() => handleUpdateOrderItemQty(item, 1)} className="h-9 w-9 rounded-lg border border-[#e3e7ef] bg-white text-lg font-semibold leading-none text-[#1f6fe0] transition-colors hover:bg-[#e8f0fd]">+</button>
                                <span className="ml-2 font-mono text-xs text-[#6b7588]">@ Rp {Number(item.price).toLocaleString("id-ID")}</span>
                              </div>
                              <button onClick={() => handleUpdateOrderItemQty(item, -item.qty)} className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">Hapus</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center justify-between border-t border-[#e3e7ef] bg-[#f8f9fc] px-3 py-2.5 text-xs font-bold text-[#6b7588]">
                    <span>SUBTOTAL</span>
                    <span className="font-mono text-sm text-[#1c2433]">Rp {getSubtotal().toLocaleString("id-ID")}</span>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="mb-4 flex items-center gap-2 text-[#6b7588]">
                <ShoppingBag size={24} />
                <p className="text-sm font-bold">{selectedTable ? "Meja dipilih — menyiapkan pesanan" : "Pilih Meja untuk Memulai Billing"}</p>
              </div>
              {menuItems.length > 0 ? (
                <>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6b7588]">Daftar Menu ({menuItems.length})</p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(140px,100%),1fr))] gap-2">
                    {menuItems.map((menu: any) => (
                      <button key={menu.id} onClick={async () => {
                        try {
                          let order = activeOrder;
                          if (!order && selectedTable) {
                            const { data, error } = await supabase.from("orders").insert({
                              tenant_id: tenantId, table_id: selectedTable.id, status: "open",
                              waiter_name: localStorage.getItem("username") || "KASIR",
                              customer_name: null, guest_name: null
                            }).select("*").single();
                            if (error) throw error;
                            order = data;
                            setActiveOrder(order);
                            setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
                          }
                          if (!order) {
                            alert("Pilih MEJA 01 terlebih dahulu, lalu klik menu lagi.");
                            return;
                          }
                          const { error } = await supabase.from("order_items").insert({
                            order_id: order.id, tenant_id: tenantId, menu_id: menu.id,
                            quantity: 1, price_at_time: menu.price, notes: "CASHIER_ORDER"
                          });
                          if (error) throw error;
                          await fetchOrderItems(order.id);
                        } catch (err: any) {
                          console.error("GAGAL TAMBAH MENU:", err);
                          alert("Menu gagal ditambahkan: " + (err?.message || "Kesalahan tidak diketahui"));
                        }
                      }} className="min-w-0 min-h-[76px] rounded-xl border border-[#e3e7ef] bg-white p-2.5 text-left transition-all hover:border-[#1f6fe0] active:scale-[0.98]">
                        <div className="text-[13px] font-semibold leading-snug text-[#1c2433]">{menu.name}</div>
                        <div className="mt-1 truncate text-[13px] font-bold text-[#1f6fe0]">Rp {Number(menu.price || 0).toLocaleString("id-ID")}</div>
                        {menu.inventory_id && (
                          <div className={`mt-1 truncate text-xs font-bold ${Number(menu.available_stock || 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            Stok: {Number(menu.available_stock || 0).toLocaleString("id-ID")} {menu.unit || ""}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-amber-700">Menu belum berhasil dimuat untuk tenant {tenantId}.</p>
              )}
            </div>
          )}
        </div>

        {/* CHECKOUT PANEL */}
        <div className={`${isOrderView ? "flex" : "hidden"} min-h-[480px] w-full min-w-0 max-h-full flex-col overflow-y-auto rounded-2xl border border-[#e3e7ef] bg-white p-3 shadow-sm [@media(orientation:landscape)_and_(min-width:768px)]:h-full [@media(orientation:landscape)_and_(min-width:768px)]:min-h-0`}>
          {activeOrder ? (
            <div className="flex flex-col min-h-full">
              <h3 className="mb-3 flex items-center gap-2 border-b border-[#e3e7ef] pb-2.5 text-xs font-bold uppercase tracking-wider text-[#6b7588]"><CreditCard size={14}/> Ringkasan Pembayaran</h3>
              
              <div className="mb-3 space-y-2 rounded-2xl border border-[#e3e7ef] bg-[#f8f9fc] p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#6b7588]"><span>SUBTOTAL</span><span className="whitespace-nowrap font-mono text-sm text-[#1c2433]">Rp {getSubtotal().toLocaleString('id-ID')}</span></div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#1f6fe0]">
                  <span>DISKON</span>
                  <input type="number" className="w-28 shrink-0 rounded-xl border border-[#c9d8f3] bg-[#e8f0fd] px-2.5 py-1.5 text-right text-sm font-bold text-[#1f6fe0] outline-none focus:border-[#1f6fe0]" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))} />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold text-[#6b7588]"><span>PAJAK (10%)</span><span className="whitespace-nowrap font-mono text-sm text-[#1c2433]">Rp {getTax().toLocaleString('id-ID')}</span></div>
              </div>

              {/* CUSTOMER SELECTOR */}
              <div className="mb-3 relative">
                <p className="mb-1.5 text-xs font-bold uppercase text-amber-600">Pelanggan CRM (Opsional)</p>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-amber-800">{selectedCustomer.name}</p>
                      <p className="mt-0.5 text-xs text-[#6b7588]">{selectedCustomer.phone} · {selectedCustomer.points || 0} pts</p>
                    </div>
                    <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Users size={12} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="text" placeholder="Masukkan nama atau nomor HP..." className="w-full rounded-2xl border border-[#e3e7ef] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1c2433] outline-none transition-colors focus:border-amber-500 disabled:bg-[#f3f5f9] disabled:text-slate-400"
                      value={customerSearch} onChange={(e) => searchCustomers(e.target.value)} disabled={!isOnline} />
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[#e3e7ef] bg-white shadow-xl">
                        {customerResults.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setShowCustomerDropdown(false); }}
                            className="w-full border-b border-[#e3e7ef] px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-[#e8f0fd]">
                            <p className="text-sm font-bold text-[#1c2433]">{c.name}</p>
                            <p className="mt-0.5 text-xs text-[#6b7588]">{c.phone} · <Star size={10} className="mr-0.5 inline text-amber-500"/> {c.points} pts</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-[#e3e7ef] pt-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#1f6fe0]">TOTAL BAYAR</p>
                <p className="mb-3 break-words text-2xl font-black leading-tight tracking-tight text-[#1c2433] sm:text-3xl">Rp {getGrandTotal().toLocaleString('id-ID')}</p>
                
                {/* 3-COLUMN PAYMENT METHOD SELECTOR (CASH, BANK, QRIS) */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button onClick={() => { setPaymentMethod("CASH"); setSelectedBank(null); setPaidAmount(0); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition-all ${paymentMethod === 'CASH' ? 'bg-[#1f6fe0] border-[#1f6fe0] text-white' : 'border-[#e3e7ef] bg-white text-[#1c2433] hover:bg-[#f3f5f9]'}`}><Banknote size={14}/> TUNAI</button>
                  <button onClick={() => { setPaymentMethod("TRANSFER"); setPaidAmount(getGrandTotal()); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition-all ${paymentMethod === 'TRANSFER' ? 'bg-purple-600 border-purple-600 text-white' : 'border-[#e3e7ef] bg-white text-[#1c2433] hover:bg-[#f3f5f9]'}`}><CreditCard size={14}/> BANK</button>
                  <button onClick={() => { setPaymentMethod("QRIS"); setPaidAmount(getGrandTotal()); setSelectedBank(null); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition-all ${paymentMethod === 'QRIS' ? 'bg-[#1d9a6c] border-[#1d9a6c] text-white' : 'border-[#e3e7ef] bg-white text-[#1c2433] hover:bg-[#f3f5f9]'}`}><QrCode size={14}/> QRIS</button>
                </div>

                {paymentMethod === "TRANSFER" && (
                  <div className="mb-4 space-y-1.5">
                    <p className="px-1 text-xs font-bold uppercase text-purple-600">Pilih Rekening Merchant:</p>
                    <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto no-scrollbar">
                      {banks.map(b => (
                        <button key={b.id} onClick={() => setSelectedBank(b)} className={`relative w-full rounded-2xl border p-3 text-left transition-all ${selectedBank?.id === b.id ? 'bg-purple-600 border-purple-600 text-white' : 'border-[#e3e7ef] bg-white text-[#1c2433]'}`}>
                          <p className="text-xs font-bold">{b.bank_name}</p>
                          <p className="mt-0.5 font-mono text-sm font-bold">{b.account_number}</p>
                          {selectedBank?.id === b.id && <CheckCircle2 size={12} className="absolute top-3 right-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {paymentMethod === "QRIS" && (
                  <div className="mb-4 flex flex-col items-center justify-center rounded-2xl border border-[#e3e7ef] bg-[#f8f9fc] p-4">
                    <p className="mb-2 text-xs font-bold uppercase text-emerald-700">SCAN QRIS MERCHANT</p>
                    <div className="rounded-2xl border border-[#e3e7ef] bg-white p-2.5">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=qris-static-merchant-${tenantId}-${getGrandTotal()}`} 
                        alt="QRIS Static QR" 
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="mt-2 text-center text-xs text-[#6b7588]">Scan QR di atas untuk menyelesaikan pembayaran non-tunai.</p>
                  </div>
                )}

                {paymentMethod === "CASH" && (
                  <div className="mb-4">
                    <p className="mb-1 text-xs font-bold uppercase text-[#1f6fe0]">Jumlah Uang Diterima:</p>
                    <input ref={cashInputRef} type="number" className="w-full rounded-2xl border border-[#c9d8f3] bg-[#e8f0fd] px-3 py-3 text-center text-2xl font-bold text-[#1f6fe0] outline-none focus:border-[#1f6fe0]" placeholder="0" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} />
                    {paidAmount >= getGrandTotal() && (
                      <div className="mt-2 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <span className="text-xs font-bold uppercase text-emerald-700">Kembalian:</span>
                        <span className="font-mono text-base font-bold text-emerald-700">Rp {getChange().toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleTestBluetooth}
                  disabled={testingBluetooth}
                  className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#c8e6d8] bg-[#e6f5ee] py-2.5 text-xs font-bold text-[#1d7a58] transition-all hover:bg-[#d4eee2] disabled:opacity-50"
                >
                  <Printer size={15} />
                  {testingBluetooth ? "MENGUJI BLUETOOTH..." : "TES CETAK BLUETOOTH"}
                </button>
                
                {selectedTable && (
                  <button type="button" onClick={() => setSelectedTable(null)} className="mb-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f6fe0] py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:brightness-95">
                    SIMPAN PESANAN
                  </button>
                )}
                <button onClick={() => setShowPreviewModal(true)} disabled={loading || (paymentMethod === "CASH" && paidAmount < getGrandTotal()) || (paymentMethod === "TRANSFER" && !selectedBank)} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-all ${(paymentMethod === "CASH" ? paidAmount >= getGrandTotal() : (paymentMethod === "QRIS" || !!selectedBank)) ? 'bg-[#1d9a6c] text-white shadow-lg hover:brightness-95' : 'bg-[#e3e7ef] text-[#6b7588] cursor-not-allowed'}`}><Printer size={15}/> PRATINJAU NOTA</button>
              </div>
            </div>
          ) : (
            <div className="flex h-full select-none flex-col items-center justify-center px-4 text-center opacity-60">
              <CheckCircle2 size={28} className="mb-3 text-slate-400"/>
              <p className="text-xs font-bold uppercase text-slate-500">{tenantType === "RETAIL" ? "Menunggu transaksi RETAIL" : "Pilih Meja untuk Membayar"}</p>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* MODAL NAMA TAMU */}
      {pendingTable && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[8000] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{pendingTable.name}</h3>
            <p className="mt-1 mb-4 text-xs text-slate-400">Masukkan nama tamu untuk memulai pesanan.</p>
            <input
              autoFocus
              type="text"
              value={guestNameInput}
              onChange={(e) => setGuestNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleConfirmGuestName(); } }}
              placeholder="Nama tamu"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-base text-white outline-none focus:border-blue-500"
            />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={handleCancelGuestName} className="min-h-12 flex-1 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700">BATAL</button>
              <button type="button" onClick={handleConfirmGuestName} disabled={!guestNameInput.trim() || loading} className="min-h-12 flex-1 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">MULAI PESANAN</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REKAP: cetak ulang bill per tanggal */}
      {showRekapModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[8000] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rekap Bill · Cetak Ulang</h3>
              </div>
              <button onClick={() => setShowRekapModal(false)} aria-label="Tutup" className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
              {/* KALENDER */}
              <div className="shrink-0 border-b border-slate-800 p-4 md:w-80 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRekapMonth(new Date(rekapYear, rekapMon - 1, 1))}
                    aria-label="Bulan sebelumnya"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <p className="text-sm font-bold text-white">{MONTH_NAMES_ID[rekapMon]} {rekapYear}</p>
                  <button
                    type="button"
                    onClick={() => setRekapMonth(new Date(rekapYear, rekapMon + 1, 1))}
                    disabled={rekapIsCurrentMonth}
                    aria-label="Bulan berikutnya"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-slate-500">
                  {DAY_NAMES_ID.map(dn => <div key={dn} className="py-1">{dn}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: rekapFirstOffset }).map((_, i) => <div key={`kosong-${i}`} />)}
                  {Array.from({ length: rekapDaysInMonth }, (_, i) => i + 1).map(day => {
                    const key = `${rekapYear}-${String(rekapMon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isFuture = key > todayKey;
                    const isSelected = key === rekapDate;
                    const isToday = key === todayKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isFuture}
                        onClick={() => selectRekapDate(key)}
                        className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isFuture
                              ? "cursor-not-allowed text-slate-700"
                              : isToday
                                ? "border border-blue-500/60 text-blue-300 hover:bg-slate-800"
                                : "text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setRekapMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    selectRekapDate(todayKey);
                  }}
                  className="mt-3 h-10 w-full rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  HARI INI
                </button>
              </div>

              {/* DAFTAR BILL */}
              <div className="flex min-h-[260px] min-w-0 flex-1 flex-col md:min-h-0">
                <div className="shrink-0 border-b border-slate-800 px-4 py-3">
                  <p className="text-xs font-bold text-white">{rekapDateLabel}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {rekapLoading
                      ? "Memuat bill..."
                      : `${rekapBills.length} bill · Rp ${rekapTotal.toLocaleString("id-ID")}`}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {rekapLoading ? (
                    <div className="flex h-full min-h-[120px] items-center justify-center text-slate-500"><Loader2 className="animate-spin" size={22} /></div>
                  ) : rekapBills.length === 0 ? (
                    <p className="px-4 py-10 text-center text-xs font-semibold text-slate-500">Tidak ada bill pada tanggal ini.</p>
                  ) : (
                    <ul className="divide-y divide-slate-800/60">
                      {rekapBills.map((trx) => (
                        <li key={trx.id}>
                          <button
                            type="button"
                            onClick={() => setPreviewBill(trx)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/40"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-blue-400">{trx.receipt_no}</p>
                              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                {new Date(trx.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {trx.table_name || "Takeaway"} · {trx.payment_method}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-slate-200">Rp {Number(trx.total || 0).toLocaleString("id-ID")}</span>
                            <ChevronRight size={16} className="shrink-0 text-slate-500" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STRUK BILL (dari Rekap): lihat dulu, lalu cetak */}
      {previewBill && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[8500] p-4 backdrop-blur-md" onClick={() => setPreviewBill(null)}>
          <div className="flex max-h-[92vh] w-full max-w-[340px] flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-t-2xl bg-white p-5 font-mono text-slate-900 shadow-2xl">
              <h3 className="text-center text-base font-extrabold uppercase">
                {reprintConfig?.store_name || receiptStoreName || outletProfileName || ""}
              </h3>
              {reprintConfig?.address && <p className="mt-1 text-center text-[10px] leading-snug">{reprintConfig.address}</p>}
              {reprintConfig?.contact && <p className="text-center text-[10px]">{reprintConfig.contact}</p>}
              <p className="mt-2 border-y border-dashed border-slate-400 py-1 text-center text-[10px] font-bold tracking-widest">SALINAN STRUK</p>

              <div className="mt-2 space-y-0.5 text-[10px]">
                <div className="flex justify-between gap-2"><span>No</span><span className="text-right">{previewBill.receipt_no}</span></div>
                <div className="flex justify-between gap-2"><span>Tanggal</span><span className="text-right">{new Date(previewBill.created_at).toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between gap-2"><span>Meja</span><span className="text-right">{previewBill.table_name || "Takeaway"}</span></div>
                <div className="flex justify-between gap-2"><span>Kasir</span><span className="text-right">{previewBill.cashier || "KASIR"}</span></div>
                {previewBill.customer_name && (
                  <div className="flex justify-between gap-2"><span>Pelanggan</span><span className="text-right">{previewBill.customer_name}</span></div>
                )}
              </div>

              <div className="my-2 border-b border-dashed border-slate-400" />
              <div className="space-y-1.5 text-[11px]">
                {previewItems.map((item: any, i: number) => {
                  const qty = Number(item.qty ?? item.quantity ?? 0);
                  const price = Number(item.price ?? item.price_at_time ?? 0);
                  return (
                    <div key={i}>
                      <p className="break-words font-semibold">{item.name || item.menu_name || "Barang"}</p>
                      <div className="flex justify-between text-[10px]">
                        <span>{qty} x {price.toLocaleString("id-ID")}</span>
                        <span>{(qty * price).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="my-2 border-b border-dashed border-slate-400" />

              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between"><span>Subtotal</span><span>{Number(previewBill.subtotal || 0).toLocaleString("id-ID")}</span></div>
                {Number(previewBill.discount || 0) > 0 && (
                  <div className="flex justify-between"><span>Diskon</span><span>-{Number(previewBill.discount).toLocaleString("id-ID")}</span></div>
                )}
                {Number(previewBill.pb1 || 0) > 0 && (
                  <div className="flex justify-between"><span>Pajak (PB1)</span><span>{Number(previewBill.pb1).toLocaleString("id-ID")}</span></div>
                )}
                <div className="mt-1 flex justify-between border-t border-slate-900 pt-1 text-sm font-extrabold"><span>TOTAL</span><span>{Number(previewBill.total || 0).toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between pt-1 text-[10px]"><span>Pembayaran</span><span>{previewPaymentLabel}</span></div>
              </div>

              <p className="mt-3 text-center text-[10px]">{reprintConfig?.footer_text || "Terima Kasih"}</p>
            </div>

            <div className="flex gap-2 rounded-b-2xl bg-slate-900 p-3">
              <button
                onClick={() => setPreviewBill(null)}
                className="h-12 flex-1 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
              >
                TUTUP
              </button>
              <button
                onClick={() => void reprintBill(previewBill)}
                disabled={printingId !== null}
                className="flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {printingId === String(previewBill.id) ? <Loader2 className="animate-spin" size={14}/> : <Printer size={14}/>}
                CETAK STRUK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ARSIP (riwayat shift) & LAPORAN (shift hari ini) */}
      {shiftModalMode && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[8000] p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {shiftModalMode === "ARSIP" ? "Arsip · Cetak Ulang Laporan Shift" : "Laporan Shift Hari Ini"}
                </h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  {shiftModalMode === "ARSIP"
                    ? "Pilih shift yang laporannya ingin dicetak ulang (30 shift terakhir)."
                    : "Shift yang sedang berjalan dicetak sebagai laporan sementara."}
                </p>
              </div>
              <button onClick={() => setShiftModalMode(null)} aria-label="Tutup" className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {shiftListLoading ? (
                <div className="flex min-h-[160px] items-center justify-center text-slate-500"><Loader2 className="animate-spin" size={22} /></div>
              ) : shiftList.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs font-semibold text-slate-500">
                  {shiftModalMode === "ARSIP" ? "Belum ada riwayat shift." : "Belum ada shift hari ini."}
                </p>
              ) : (
                <ul className="divide-y divide-slate-800/60">
                  {shiftList.map((sh) => {
                    const isOpen = sh.status === "open";
                    return (
                      <li key={sh.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-white">{sh.cashier_name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {new Date(sh.start_time).toLocaleString("id-ID")}
                            {sh.end_time ? ` – ${new Date(sh.end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </p>
                        </div>
                        {isOpen ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-400">BERJALAN</span>
                        ) : (
                          <span className="shrink-0 text-xs font-bold text-emerald-400">Rp {Number(sh.total_sales || 0).toLocaleString("id-ID")}</span>
                        )}
                        <button
                          onClick={() => void reprintShiftReport(sh)}
                          disabled={printingId !== null}
                          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600/10 px-3 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-600/20 disabled:opacity-40"
                        >
                          {printingId === String(sh.id) ? <Loader2 className="animate-spin" size={14}/> : <Printer size={14}/>}
                          CETAK
                        </button>
                      </li>
                    );
                  })}
                </ul>
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
