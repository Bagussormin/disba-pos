
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  Building2,
  ShieldAlert,
  CalendarClock,
  Power,
  Plus,
  Search,
  MoreVertical,
  Save,
  X,
  Activity,
  Globe,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Store,
  RefreshCw,
  LogOut,
  Filter,
  Wallet,
} from "lucide-react";

interface Tenant {
  tenant_id: string;
  business_name: string;
  plan_name: string;
  subscription_end: string;
  is_active: boolean;
  features: {
    pos: boolean;
    has_hpp: boolean;
    has_inventory: boolean;
    has_qr: boolean;
  };
  created_at: string;
}

type StatusFilter = "ALL" | "ACTIVE" | "EXPIRED" | "INACTIVE";

const PAGE_SIZE = 10;

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const isTenantExpired = (date: string) => {
  if (!date) return true;

  const expiry = new Date(`${date.slice(0, 10)}T23:59:59`);
  return expiry.getTime() < Date.now();
};

const formatDate = (date: string) => {
  if (!date) return "-";

  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function DisbaCentral() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState({
    email: "bagus.arifian",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [globalStats, setGlobalStats] = useState({
    totalTurnover: 0,
    todayTurnover: 0,
    revenueByTenant: {} as Record<string, number>,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    tenant_id: "",
    business_name: "",
    plan_name: "ESSENTIAL",
    subscription_end: new Date(
      new Date().setMonth(new Date().getMonth() + 1)
    )
      .toISOString()
      .split("T")[0],
    is_active: true,
  });

  useEffect(() => {
    const supreme = localStorage.getItem("supreme_auth");
    const role = localStorage.getItem("role");

    if (supreme === "true" && role === "founder") {
      setIsAuthenticated(true);
      void fetchTenants();
      void fetchGlobalFinancials();
    }
  }, []);

  const handleSupremeLogin = (e: React.FormEvent) => {
    e.preventDefault();

    const email = authData.email.toLowerCase().trim();
    const password = authData.password.trim();

    // Mempertahankan mekanisme login yang saat ini digunakan.
    // Autentikasi Founder perlu diamankan melalui server pada tahap berikutnya.
    const isFounder =
      email === "bagus.arifianto29@gmail.com" &&
      password === "bagusatika29";

    if (!isFounder) {
      alert("AKSES DITOLAK: Email atau password Founder tidak sesuai.");
      return;
    }

    localStorage.clear();
    localStorage.setItem("supreme_auth", "true");
    localStorage.setItem("role", "founder");
    localStorage.setItem("username", "Bagus");

    setIsAuthenticated(true);

    window.setTimeout(() => {
      window.location.href = "/founder";
    }, 300);
  };

  const fetchTenants = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setTenants(data as Tenant[]);
      }
    } catch (error) {
      console.error("Gagal mengambil data outlet:", error);
      alert("Gagal memuat data outlet. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalFinancials = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("total, tenant_id, created_at");

      if (error) throw error;

      const transactions = (data || []) as {
        total: number;
        tenant_id: string;
        created_at: string;
      }[];

      const todayStr = new Date().toLocaleDateString("en-CA");

      const total = transactions.reduce(
        (sum, transaction) => sum + Number(transaction.total || 0),
        0
      );

      const todayTotal = transactions
        .filter(
          (transaction) =>
            transaction.created_at?.slice(0, 10) === todayStr
        )
        .reduce(
          (sum, transaction) => sum + Number(transaction.total || 0),
          0
        );

      const tenantMap = transactions.reduce(
        (result, transaction) => {
          const id = transaction.tenant_id;
          if (id) {
            result[id] =
              (result[id] || 0) + Number(transaction.total || 0);
          }
          return result;
        },
        {} as Record<string, number>
      );

      setGlobalStats({
        totalTurnover: total,
        todayTurnover: todayTotal,
        revenueByTenant: tenantMap,
      });
    } catch (error) {
      console.error("Gagal mengambil statistik keuangan:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: "",
      business_name: "",
      plan_name: "ESSENTIAL",
      subscription_end: new Date(
        new Date().setMonth(new Date().getMonth() + 1)
      )
        .toISOString()
        .split("T")[0],
      is_active: true,
    });

    setIsEditMode(false);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formattedId = formData.tenant_id
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    let selectedFeatures: Tenant["features"];

    if (formData.plan_name === "ESSENTIAL") {
      selectedFeatures = {
        pos: true,
        has_hpp: false,
        has_inventory: false,
        has_qr: false,
      };
    } else if (formData.plan_name === "BUSINESS") {
      selectedFeatures = {
        pos: true,
        has_hpp: true,
        has_inventory: true,
        has_qr: false,
      };
    } else {
      selectedFeatures = {
        pos: true,
        has_hpp: true,
        has_inventory: true,
        has_qr: true,
      };
    }

    try {
      const { error: tenantError } = await supabase
        .from("tenants")
        .upsert({
          tenant_id: formattedId,
          business_name: formData.business_name.trim(),
          plan_name: formData.plan_name,
          subscription_end: formData.subscription_end,
          is_active: formData.is_active,
          features: selectedFeatures,
        });

      if (tenantError) throw tenantError;

      if (!isEditMode) {
        const { error: receiptError } = await supabase
          .from("receipt_settings")
          .insert({
            tenant_id: formattedId,
            store_name: formData.business_name.trim(),
            address: "ALAMAT BELUM DISET",
            contact: "KONTAK BELUM DISET",
            footer_text: "TERIMA KASIH",
          });

        if (receiptError) {
          console.warn(
            "Outlet tersimpan, tetapi receipt settings perlu diperiksa:",
            receiptError.message
          );
        }
      }

      setIsModalOpen(false);
      resetForm();

      await fetchTenants();
      await fetchGlobalFinancials();

      alert(`OUTLET BERHASIL DISIMPAN: ${formattedId}`);
    } catch (error: any) {
      alert("GAGAL MENYIMPAN OUTLET: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (
    tenantId: string,
    currentStatus: boolean
  ) => {
    const message = currentStatus
      ? `Nonaktifkan lisensi outlet ${tenantId}?`
      : `Aktifkan kembali lisensi outlet ${tenantId}?`;

    if (!window.confirm(message)) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ is_active: !currentStatus })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      await fetchTenants();
    } catch (error: any) {
      alert("Gagal mengubah status outlet: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const impersonateTenant = (tenantId: string) => {
    if (
      !window.confirm(
        `Masuk ke Backoffice outlet ${tenantId}?`
      )
    ) {
      return;
    }

    const targetTenant = tenants.find(
      (tenant) => tenant.tenant_id === tenantId
    );

    if (!targetTenant) {
      alert("Outlet tidak ditemukan.");
      return;
    }

    // Pertahankan penanda supreme_auth untuk alur kembali ke Founder.
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("tenant_name");

    localStorage.setItem("role", "admin");
    localStorage.setItem("username", "Bagus");
    localStorage.setItem("tenant_id", tenantId);
    localStorage.setItem(
      "tenant_name",
      targetTenant.business_name
    );
    localStorage.setItem("is_admin", "true");
    localStorage.setItem("access_mode", "founder_impersonate");

    window.location.href = "/admin/dashboard";
  };

  const handleCentralLogout = () => {
    localStorage.removeItem("supreme_auth");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("tenant_id");
    localStorage.removeItem("tenant_name");
    localStorage.removeItem("is_admin");
    localStorage.removeItem("access_mode");

    window.location.href = "/outlet-login";
  };

  const filteredTenants = tenants.filter((tenant) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      tenant.business_name?.toLowerCase().includes(search) ||
      tenant.tenant_id?.toLowerCase().includes(search);

    const expired = isTenantExpired(tenant.subscription_end);

    let matchesStatus = true;

    if (statusFilter === "ACTIVE") {
      matchesStatus = tenant.is_active && !expired;
    } else if (statusFilter === "EXPIRED") {
      matchesStatus = tenant.is_active && expired;
    } else if (statusFilter === "INACTIVE") {
      matchesStatus = !tenant.is_active;
    }

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTenants.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedTenants = filteredTenants.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const activeCount = tenants.filter(
    (tenant) =>
      tenant.is_active && !isTenantExpired(tenant.subscription_end)
  ).length;

  const expiredCount = tenants.filter(
    (tenant) =>
      tenant.is_active && isTenantExpired(tenant.subscription_end)
  ).length;

  const inactiveCount = tenants.filter(
    (tenant) => !tenant.is_active
  ).length;

  const statCards = [
    {
      label: "Total Omzet",
      value: formatRupiah(globalStats.totalTurnover),
      icon: Wallet,
      color: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Omzet Hari Ini",
      value: formatRupiah(globalStats.todayTurnover),
      icon: Activity,
      color: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Outlet Aktif",
      value: activeCount.toLocaleString("id-ID"),
      icon: Store,
      color: "text-sky-400",
      iconBg: "bg-sky-500/10",
    },
    {
      label: "Perlu Perhatian",
      value: (expiredCount + inactiveCount).toLocaleString("id-ID"),
      icon: ShieldAlert,
      color: "text-amber-400",
      iconBg: "bg-amber-500/10",
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060b16] flex items-center justify-center p-5 text-white font-sans">
        <div className="w-full max-w-md bg-[#0c1424] border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
            <ShieldCheck className="text-blue-400" size={32} />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight">
              DISBA <span className="text-blue-400">CENTRAL</span>
            </h1>
            <p className="text-xs text-slate-500 mt-3">
              FOUNDER CONTROL CENTER
            </p>
          </div>

          <form onSubmit={handleSupremeLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Email Founder
              </label>
              <input
                type="text"
                placeholder="Email Founder"
                required
                autoComplete="username"
                className="w-full bg-[#060b16] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors"
                value={authData.email}
                onChange={(e) =>
                  setAuthData({
                    ...authData,
                    email: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Password Founder"
                required
                autoComplete="current-password"
                className="w-full bg-[#060b16] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors"
                value={authData.password}
                onChange={(e) =>
                  setAuthData({
                    ...authData,
                    password: e.target.value,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              Masuk ke FounderHQ
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-600 mt-8">
            DISBA POS · ENTERPRISE CONTROL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b16] text-slate-100 font-sans">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-[#0a1120] border-r border-white/[0.07]">
          <div className="px-6 py-6 border-b border-white/[0.07]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Building2 size={21} />
              </div>
              <div>
                <h1 className="font-black tracking-tight text-lg">
                  DISBA<span className="text-blue-400">.</span>
                </h1>
                <p className="text-[9px] tracking-[0.18em] text-slate-500">
                  FOUNDERHQ
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-5">
            <p className="px-3 mb-3 text-[9px] tracking-[0.18em] font-bold text-slate-600">
              WORKSPACE
            </p>

            <a
              href="#overview"
              className="flex items-center gap-3 px-3 py-3 rounded-xl bg-blue-500/10 text-blue-300 text-sm font-semibold"
            >
              <LayoutDashboard size={17} />
              Dashboard
            </a>

            <a
              href="#outlets"
              className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              <Store size={17} />
              Manajemen Outlet
            </a>
          </div>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300">
                  System Online
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                DISBA POS platform monitoring
              </p>
            </div>

            <button
              type="button"
              onClick={handleCentralLogout}
              className="w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut size={17} />
              Logout Founder
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="min-w-0 flex-1">
          <div className="max-w-[1600px] mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            {/* HEADER */}
            <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-7">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400 font-bold">
                    Platform Online
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Founder Dashboard
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Pantau outlet, lisensi, dan performa DISBA POS.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void fetchTenants();
                    void fetchGlobalFinancials();
                  }}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh Data
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold shadow-lg shadow-blue-950/30 transition-colors"
                >
                  <Plus size={18} />
                  Tambah Outlet
                </button>

                <button
                  type="button"
                  onClick={handleCentralLogout}
                  className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-semibold"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </header>

            {/* OVERVIEW */}
            <section id="overview" className="scroll-mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 mb-7">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-[#0c1424] border border-white/[0.07] rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-medium">
                          {stat.label}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold tracking-tight mt-3 break-words">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${stat.iconBg} ${stat.color}`}
                      >
                        <stat.icon size={20} />
                      </div>
                    </div>
                    <div className="mt-4 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full w-2/3 rounded-full ${stat.iconBg}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* STATUS SUMMARY */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Aktif & Valid</p>
                    <p className="text-lg font-bold">{activeCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <CalendarClock size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Lisensi Kedaluwarsa</p>
                    <p className="text-lg font-bold">{expiredCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.04] p-4">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Outlet Nonaktif</p>
                    <p className="text-lg font-bold">{inactiveCount}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* OUTLET MANAGEMENT */}
            <section
              id="outlets"
              className="scroll-mt-5 bg-[#0c1424] border border-white/[0.07] rounded-2xl overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-white/[0.07]">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      Manajemen Outlet
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Kelola outlet dan lisensi dari satu tempat.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative sm:w-72">
                      <Search
                        size={17}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Cari nama atau ID outlet..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-[#060b16] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500/60 transition-colors"
                      />
                    </div>

                    <div className="relative sm:w-48">
                      <Filter
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(
                            e.target.value as StatusFilter
                          );
                          setCurrentPage(1);
                        }}
                        className="w-full appearance-none bg-[#060b16] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500/60"
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="ACTIVE">Aktif & Valid</option>
                        <option value="EXPIRED">Kedaluwarsa</option>
                        <option value="INACTIVE">Nonaktif</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[850px]">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Outlet
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Paket
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Status
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Masa Aktif
                      </th>
                      <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Total Omzet
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.05]">
                    {loading && tenants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-16 text-center text-slate-500"
                        >
                          <Activity
                            size={22}
                            className="animate-spin mx-auto mb-3"
                          />
                          Memuat data outlet...
                        </td>
                      </tr>
                    ) : paginatedTenants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-16 text-center"
                        >
                          <Store
                            size={28}
                            className="mx-auto mb-3 text-slate-600"
                          />
                          <p className="text-sm font-semibold text-slate-300">
                            Outlet tidak ditemukan
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Coba ubah kata kunci atau filter status.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedTenants.map((tenant) => {
                        const expired = isTenantExpired(
                          tenant.subscription_end
                        );
                        const revenue =
                          globalStats.revenueByTenant[
                            tenant.tenant_id
                          ] || 0;

                        const statusLabel = !tenant.is_active
                          ? "Nonaktif"
                          : expired
                          ? "Kedaluwarsa"
                          : "Aktif";

                        const statusClass = !tenant.is_active
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : expired
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                        return (
                          <tr
                            key={tenant.tenant_id}
                            className="hover:bg-white/[0.025] transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-300">
                                  <Building2 size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-100">
                                    {tenant.business_name}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                                    {tenant.tenant_id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/10 text-blue-300 text-[10px] font-bold">
                                {tenant.plan_name || "ESSENTIAL"}
                              </span>
                              <p className="text-[10px] text-slate-600 mt-2">
                                {tenant.features?.has_inventory
                                  ? "Inventory"
                                  : "POS"}
                                {tenant.features?.has_qr ? " · QR" : ""}
                                {tenant.features?.has_hpp ? " · HPP" : ""}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold ${statusClass}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {statusLabel}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <CalendarClock
                                  size={14}
                                  className={
                                    expired
                                      ? "text-amber-400"
                                      : "text-slate-500"
                                  }
                                />
                                {formatDate(tenant.subscription_end)}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-slate-200">
                                {formatRupiah(revenue)}
                              </p>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  title="Masuk Backoffice"
                                  onClick={() =>
                                    impersonateTenant(tenant.tenant_id)
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-colors"
                                >
                                  <LayoutDashboard size={14} />
                                  Backoffice
                                </button>

                                <button
                                  type="button"
                                  title="Edit outlet"
                                  onClick={() => {
                                    setFormData({
                                      tenant_id: tenant.tenant_id,
                                      business_name: tenant.business_name,
                                      plan_name:
                                        tenant.plan_name || "ESSENTIAL",
                                      subscription_end:
                                        tenant.subscription_end,
                                      is_active: tenant.is_active,
                                    });
                                    setIsEditMode(true);
                                    setIsModalOpen(true);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.07] text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                  <MoreVertical size={17} />
                                </button>

                                <button
                                  type="button"
                                  title={
                                    tenant.is_active
                                      ? "Nonaktifkan outlet"
                                      : "Aktifkan outlet"
                                  }
                                  onClick={() =>
                                    void toggleStatus(
                                      tenant.tenant_id,
                                      tenant.is_active
                                    )
                                  }
                                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                                    tenant.is_active
                                      ? "bg-red-500/[0.06] border-red-500/15 text-red-400 hover:bg-red-500 hover:text-white"
                                      : "bg-emerald-500/[0.06] border-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                  }`}
                                >
                                  <Power size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-6 py-4 border-t border-white/[0.07]">
                <p className="text-xs text-slate-500">
                  Menampilkan{" "}
                  <span className="text-slate-200 font-semibold">
                    {filteredTenants.length === 0
                      ? 0
                      : (safePage - 1) * PAGE_SIZE + 1}
                    {"–"}
                    {Math.min(
                      safePage * PAGE_SIZE,
                      filteredTenants.length
                    )}
                  </span>{" "}
                  dari{" "}
                  <span className="text-slate-200 font-semibold">
                    {filteredTenants.length}
                  </span>{" "}
                  outlet
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="px-3 text-xs text-slate-400">
                    Halaman{" "}
                    <span className="text-white font-semibold">
                      {safePage}
                    </span>{" "}
                    / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </section>

            <footer className="flex flex-col sm:flex-row justify-between gap-2 py-6 text-[10px] text-slate-600">
              <span>DISBA POS · FOUNDER CONTROL CENTER</span>
              <span>PLATFORM MANAGEMENT</span>
            </footer>
          </div>
        </main>
      </div>

      {/* MODAL TAMBAH / EDIT OUTLET */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#0c1424] border border-white/10 w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 sm:px-7 py-5 bg-[#0c1424] border-b border-white/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 text-blue-400 flex items-center justify-center">
                  <Building2 size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {isEditMode ? "Edit Outlet" : "Tambah Outlet"}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Konfigurasi outlet dan lisensi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
                aria-label="Tutup modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-5 sm:p-7 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  ID Outlet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ALPHA_CORE_01"
                  disabled={isEditMode}
                  className="w-full bg-[#060b16] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors disabled:opacity-40"
                  value={formData.tenant_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tenant_id: e.target.value,
                    })
                  }
                />
                <p className="text-[10px] text-slate-600 mt-2">
                  ID outlet digunakan sebagai identitas unik sistem.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Nama Bisnis / Outlet
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama outlet"
                  className="w-full bg-[#060b16] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      business_name: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Paket Layanan
                  </label>
                  <select
                    className="w-full bg-[#060b16] border border-white/10 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500"
                    value={formData.plan_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plan_name: e.target.value,
                      })
                    }
                  >
                    <option value="ESSENTIAL">ESSENTIAL</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="ULTIMATE">ULTIMATE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Tanggal Berakhir
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full bg-[#060b16] border border-white/10 rounded-xl px-3 py-3.5 text-sm outline-none focus:border-blue-500"
                    value={formData.subscription_end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscription_end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-blue-400" />
                  <p className="text-xs font-semibold text-blue-300">
                    Fitur Paket
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  ESSENTIAL: POS dasar. BUSINESS: POS, HPP, dan
                  Inventory. ULTIMATE: seluruh fitur termasuk QR Order.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-semibold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <Activity size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {loading ? "Menyimpan..." : "Simpan Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
