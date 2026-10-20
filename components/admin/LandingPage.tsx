
import React, { useState } from "react";
import {
  LogIn,
  ArrowRight,
  CheckCircle2,
  ShoppingCart,
  Package,
  ChartNoAxesCombined,
  Users,
  Coffee,
  Shirt,
  Store,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  MonitorSmartphone,
  Zap,
  ChevronRight,
} from "lucide-react";

import logoDisba from "./assets/logo-disba.png";

interface LandingPageProps {
  onEnterSystem?: () => void;
}

const WHATSAPP_NUMBER = "6282164187865";

const whatsappMessage =
  "Halo Admin DISBA POS, saya tertarik mendaftar dan ingin mengetahui paket berlangganan yang tersedia.";

const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  whatsappMessage
)}`;

const features = [
  {
    icon: ShoppingCart,
    title: "Transaksi Penjualan",
    description:
      "Bantu proses transaksi lebih praktis dan terorganisasi untuk aktivitas usaha sehari-hari.",
    number: "01",
  },
  {
    icon: Package,
    title: "Manajemen Inventori",
    description:
      "Kelola data produk dan pantau stok barang agar pengelolaan persediaan lebih teratur.",
    number: "02",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Laporan Bisnis",
    description:
      "Pantau informasi penjualan dan gunakan data untuk membantu mengambil keputusan.",
    number: "03",
  },
  {
    icon: Users,
    title: "Manajemen Pengguna",
    description:
      "Kelola akun tim dan atur peran pengguna sesuai kebutuhan operasional bisnis.",
    number: "04",
  },
];

const businessTypes = [
  { icon: Store, name: "Toko Retail" },
  { icon: Coffee, name: "Kafe & Restoran" },
  { icon: Shirt, name: "Laundry" },
  { icon: Sparkles, name: "Salon & Jasa" },
];

export default function LandingPage({
  onEnterSystem,
}: LandingPageProps) {
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEnter = () => {
    setLoading(true);

    if (onEnterSystem) {
      onEnterSystem();
    } else {
      window.location.href = "/outlet-login";
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050816] font-sans text-white selection:bg-blue-500/40 selection:text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-0 h-[420px] w-[420px] rounded-full bg-blue-600/15 blur-[140px]" />
        <div className="absolute -right-48 top-[35%] h-[420px] w-[420px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* NAVBAR */}
      <header className="relative z-30 border-b border-white/[0.07] bg-[#050816]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#beranda"
            className="flex items-center gap-3"
            aria-label="DISBA POS Beranda"
          >
            <div className="h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1.5 shadow-lg shadow-blue-950/30">
              <img
                src={logoDisba}
                alt="Logo DISBA POS"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div className="text-xl font-black tracking-tight">
                DISBA<span className="text-blue-500">.</span>POS
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Business Management
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#beranda"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Beranda
            </a>
            <a
              href="#fitur"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Fitur
            </a>
            <a
              href="#bisnis"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Untuk Bisnis
            </a>
            <a
              href="#tentang"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Tentang
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <button
              onClick={handleEnter}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              <LogIn size={16} />
              Masuk
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
            >
              Daftar Sekarang
              <ArrowRight size={16} />
            </a>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-white/10 p-2.5 text-slate-300 sm:hidden"
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-white/[0.07] bg-[#080d20] px-5 py-5 sm:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ["Beranda", "#beranda"],
                ["Fitur", "#fitur"],
                ["Untuk Bisnis", "#bisnis"],
                ["Tentang", "#tentang"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className="rounded-xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  {label}
                </a>
              ))}

              <button
                onClick={() => {
                  closeMobileMenu();
                  handleEnter();
                }}
                disabled={loading}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 font-bold"
              >
                <LogIn size={17} />
                Masuk ke Sistem
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold"
              >
                Daftar Sekarang
                <ArrowRight size={17} />
              </a>
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section
          id="beranda"
          className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:px-12 lg:pb-32 lg:pt-28"
        >
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/[0.08] px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.19em] text-blue-300 sm:text-xs">
                Solusi Digital untuk Bisnis Anda
              </span>
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[1.12] tracking-tight sm:text-5xl md:text-6xl lg:text-[64px]">
              Kelola Bisnis Lebih{" "}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Cerdas.
              </span>
              <br />
              Bertumbuh Lebih Cepat.
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
              Kenalkan cara kerja yang lebih terorganisasi bersama DISBA POS.
              Kelola transaksi, stok barang, tim, dan laporan usaha melalui
              satu platform yang dirancang untuk mendukung aktivitas bisnis
              sehari-hari.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-extrabold shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/30"
              >
                Daftar Sekarang
                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </a>

              <a
                href="#fitur"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-7 py-4 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                Jelajahi Fitur
                <ChevronRight size={17} />
              </a>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400" />
                Pengelolaan bisnis terpusat
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-blue-400" />
                Dirancang untuk berbagai usaha
              </span>
            </div>
          </div>

          {/* PRODUCT PREVIEW */}
          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-8 rounded-full bg-blue-600/[0.13] blur-[80px]" />

            <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1124]/95 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <ChartNoAxesCombined size={19} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Business Overview</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      DISBA POS Dashboard Preview
                    </p>
                  </div>
                </div>

                <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400">
                  Dashboard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 sm:p-6">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      Transaksi
                    </span>
                    <ShoppingCart size={16} className="text-blue-400" />
                  </div>
                  <p className="mt-4 text-xl font-black tracking-tight sm:text-2xl">
                    Penjualan
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    Kelola transaksi usaha
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      Persediaan
                    </span>
                    <Package size={16} className="text-cyan-400" />
                  </div>
                  <p className="mt-4 text-xl font-black tracking-tight sm:text-2xl">
                    Inventori
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">
                    Kelola produk dan stok
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        Ringkasan Bisnis
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Informasi operasional dalam satu platform
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                      <MonitorSmartphone size={20} />
                    </div>
                  </div>

                  <div className="mt-6 flex h-24 items-end gap-2 sm:h-32">
                    {[34, 52, 42, 68, 48, 76, 60, 88, 65, 96, 72, 82].map(
                      (height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-blue-700/70 to-cyan-400/90"
                          style={{ height: `${height}%` }}
                        />
                      )
                    )}
                  </div>

                  <div className="mt-3 flex justify-between text-[9px] text-slate-600">
                    <span>Visualisasi ilustratif</span>
                    <span>Contoh tampilan</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-white/[0.07] bg-white/[0.02] px-5 py-4 sm:px-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">
                    Satu Platform, Banyak Kebutuhan
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Dirancang untuk mendukung pengelolaan bisnis Anda
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-2 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#111a31]/95 p-4 shadow-xl sm:flex sm:-left-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-xs font-bold">Lebih Terorganisasi</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Kelola bisnis dengan praktis
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTRODUCTION */}
        <section
          id="tentang"
          className="border-y border-white/[0.07] bg-white/[0.02]"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-blue-400">
                Kenali DISBA POS
              </p>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Teknologi yang Membantu Anda Mengelola Bisnis
              </h2>
            </div>

            <div className="space-y-4 text-sm leading-7 text-slate-400 sm:text-base">
              <p>
                DISBA POS adalah platform Point of Sale (POS) yang membantu
                pemilik usaha mengelola kegiatan operasional melalui sistem
                digital. Mulai dari pencatatan transaksi hingga pengelolaan
                produk dan pengguna, semuanya dirancang agar lebih terstruktur.
              </p>
              <p>
                Cocok untuk bisnis yang ingin beralih dari pencatatan manual
                menuju pengelolaan usaha yang lebih praktis. Dengan informasi
                yang lebih tertata, Anda dapat lebih mudah memantau aktivitas
                bisnis dan merencanakan langkah berikutnya.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          id="fitur"
          className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
        >
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                Fitur Unggulan
              </span>
            </div>

            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Semua Lebih Teratur.
              <br />
              <span className="text-blue-400">Bisnis Lebih Terarah.</span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
              Fitur yang membantu Anda menangani kebutuhan operasional bisnis
              dari satu sistem, sesuai modul yang tersedia pada paket Anda.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.number}
                  className="group rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-blue-500/[0.045]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/15 bg-blue-500/10 text-blue-400 transition group-hover:bg-blue-500/20">
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-slate-700">
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="mt-7 text-lg font-extrabold tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {feature.description}
                  </p>

                  <div className="mt-6 h-px w-10 bg-blue-500/50 transition-all group-hover:w-full" />
                </article>
              );
            })}
          </div>
        </section>

        {/* BUSINESS TYPES */}
        <section
          id="bisnis"
          className="border-y border-white/[0.07] bg-[#080d1d]/80"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-blue-400">
                Untuk Berbagai Jenis Usaha
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Bisnis Anda, Solusi yang Tepat
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
                Dari toko kecil hingga bisnis dengan kebutuhan operasional
                yang berkembang, DISBA POS dirancang untuk mendukung beragam
                aktivitas usaha.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {businessTypes.map((business) => {
                const Icon = business.icon;

                return (
                  <div
                    key={business.name}
                    className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-7 text-center transition hover:border-blue-400/25 hover:bg-blue-500/[0.045] sm:py-9"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                      <Icon size={25} />
                    </div>

                    <h3 className="mt-4 text-sm font-bold sm:text-base">
                      {business.name}
                    </h3>
                  </div>
                );
              })}
            </div>

            <p className="mt-5 text-center text-xs leading-6 text-slate-500">
              Jenis usaha lainnya juga dapat dikonsultasikan dengan tim DISBA
              POS untuk menyesuaikan kebutuhan sistem.
            </p>
          </div>
        </section>

        {/* HOW TO START */}
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-blue-400">
                Mulai Bersama Kami
              </p>

              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                Memulai Digitalisasi Bisnis Tidak Harus Rumit.
              </h2>

              <p className="mt-5 text-sm leading-7 text-slate-400 sm:text-base">
                Ceritakan kebutuhan usaha Anda kepada tim DISBA POS. Kami
                dapat membantu menjelaskan pilihan paket, fitur yang tersedia,
                dan langkah awal penggunaan sistem.
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-4 text-sm font-extrabold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
              >
                Konsultasi via WhatsApp
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="space-y-4">
              {[
                {
                  number: "01",
                  title: "Hubungi Tim DISBA POS",
                  description:
                    "Sampaikan jenis usaha dan kebutuhan operasional Anda.",
                },
                {
                  number: "02",
                  title: "Pilih Paket yang Sesuai",
                  description:
                    "Diskusikan fitur dan biaya berlangganan dengan admin.",
                },
                {
                  number: "03",
                  title: "Siapkan Bisnis Anda",
                  description:
                    "Ikuti langkah pendaftaran dan persiapan penggunaan sistem.",
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-sm font-black text-blue-400">
                    {step.number}
                  </div>

                  <div>
                    <h3 className="font-extrabold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 pb-20 sm:px-8 sm:pb-28 lg:px-12">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-blue-400/20 bg-gradient-to-br from-[#101d42] via-[#0b1530] to-[#080d1c] px-6 py-12 text-center sm:px-12 sm:py-16 lg:px-20 lg:py-20">
            <div className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full bg-blue-500/20 blur-[90px]" />
            <div className="pointer-events-none absolute -bottom-36 -left-16 h-72 w-72 rounded-full bg-cyan-500/10 blur-[90px]" />

            <div className="relative mx-auto max-w-3xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                <Sparkles size={26} />
              </div>

              <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-5xl">
                Saatnya Mengelola Bisnis dengan Lebih Baik.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Kenali fitur DISBA POS, diskusikan kebutuhan usaha Anda, dan
                temukan paket yang sesuai untuk membantu bisnis berkembang.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-xl bg-blue-600 px-7 py-4 text-sm font-extrabold shadow-xl shadow-blue-950/40 transition hover:bg-blue-500"
                >
                  Daftar via WhatsApp
                  <ArrowRight size={17} />
                </a>

                <button
                  onClick={handleEnter}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 text-sm font-bold transition hover:bg-white/[0.09] disabled:opacity-50"
                >
                  <LogIn size={17} />
                  {loading ? "Membuka sistem..." : "Sudah Punya Akun"}
                </button>
              </div>

              <p className="mt-5 text-xs text-slate-500">
                Hubungi admin untuk informasi paket dan pendaftaran.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.07] bg-[#040611]/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <a href="#beranda" className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1.5">
              <img
                src={logoDisba}
                alt="Logo DISBA POS"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <p className="font-black tracking-tight">
                DISBA<span className="text-blue-500">.</span>POS
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Smart Business Management
              </p>
            </div>
          </a>

          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-500">
            <a href="#fitur" className="transition hover:text-white">
              Fitur
            </a>
            <a href="#bisnis" className="transition hover:text-white">
              Jenis Usaha
            </a>
            <a href="#tentang" className="transition hover:text-white">
              Tentang DISBA POS
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-white"
            >
              Hubungi Admin
            </a>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} DISBA POS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
