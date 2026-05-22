# DISBA POS - Enterprise Cloud System

DISBA POS adalah platform Point of Sales berbasis SaaS yang dirancang khusus untuk industri F&B (Cafe, Restaurant, Club) dan Retail (Bottle Store).

## 🚀 Struktur Sistem

Sistem ini terbagi menjadi tiga level akses:
1. **Founder HQ (Central):** `/founder-hq` - Dashboard pusat untuk memantau omzet global dan mengelola lisensi outlet.
2. **Outlet Backoffice (HQ Panel):** `/admin/dashboard` - Area pemilik outlet untuk mengatur menu, stok, karyawan, dan laporan.
3. **Staff Terminal (POS):** `/dashboard` - Antarmuka kasir dan waiter untuk operasional harian.

## 🛠 Teknologi

- **Frontend:** React.js + Tailwind CSS + Lucide Icons
- **Backend/Database:** Supabase (PostgreSQL)
- **Reports:** jsPDF & SheetJS (Excel)
- **Hardware Integration:** Node.js Bridge Server (untuk thermal printing)

## 📦 Cara Instalasi Pengembangan

```bash
# Install dependensi
npm install

# Menjalankan local server
npm run dev

# Build untuk produksi
npm run build
```

## 🔑 Konfigurasi Environment

Buat file `.env` di root folder dan masukkan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🛠 Integrasi Printer Thermal

Untuk menggunakan printer thermal di browser, pastikan:
1. Aplikasi **DISBA Printer Bridge (Node.js)** berjalan di PC Kasir.
2. Masukkan IP PC Kasir tersebut di menu **Settings > Printer** pada Backoffice.
3. Pastikan printer sudah terhubung via LAN/USB dan terdeteksi oleh OS.

## ⚠️ Catatan Keamanan

- Jangan pernah membagikan `tenant_id` secara sembarangan.
- Akses `/founder-hq` dilindungi oleh otentikasi khusus Founder.
- Gunakan fitur **"Gembok PC Kasir"** pada perangkat terminal agar staff tidak bisa mengakses area pengaturan admin.

---
© 2024 DISBA PROTOCOL. All Rights Reserved.