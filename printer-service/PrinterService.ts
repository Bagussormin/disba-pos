import net from 'node:net';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- FUNGSI UTAMA PENGIRIMAN KE PRINTER ---
const sendToDevice = (ip: string, port: number, text: string, label: string, openCashDrawer: boolean = false) => {
    if (!ip) {
        console.error(`❌ ${label} ERROR: IP Printer kosong/tidak disetting!`);
        return;
    }

    const client = new net.Socket();
    client.setTimeout(5000); 
    
    client.connect(port, ip, () => {
        console.log(`[${new Date().toLocaleTimeString('id-ID')}] 🖨️  PRINTING: ${label} ke IP ${ip}`);
        
        client.write(Buffer.from([0x1b, 0x40])); // 1. Inisialisasi Printer
        client.write(text); // 2. Cetak Teks Struk
        client.write(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); // 3. Auto-Cut (Potong Kertas)
        
        // 4. Buka Laci Uang (Kick Drawer) jika metode pembayaran CASH
        if (openCashDrawer) {
            client.write(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])); 
        }
        
        client.end();
    });

    client.on('error', (err) => console.error(`❌ ${label} ERROR ke ${ip}:`, err.message));
    client.on('timeout', () => { client.destroy(); });
};

// --- FUNGSI BANTUAN: RATA KIRI-KANAN (ALIGNMENT) ---
const formatLeftRight = (left: string, right: string, width: number = 32) => {
    const spaceLength = width - left.length - right.length;
    if (spaceLength > 0) {
        return left + " ".repeat(spaceLength) + right + "\n";
    }
    return left + " " + right + "\n"; // Fallback jika teks kepanjangan
};

// --- ENDPOINT CETAK STRUK KASIR ---
app.post('/print-receipt', (req, res) => {
    const { 
        target_ip, table_name, items_list, subtotal, discount_total, 
        service_charge, tax_total, total, paid, change, cashier,
        header_title, header_address, header_contact,
        footer_thanks, footer_message, footer_wifi,
        payment_method 
    } = req.body;
    
    let t = "";
    const paperWidth = 32; // GANTI JADI 48 JIKA PAKAI PRINTER BESAR (80mm)

    // --- 1. HEADER (Tengah) ---
    t += `\x1b\x61\x01`; // Align Center
    // Jika tidak ada data, cetak peringatan BELUM DI SET
    t += `\x1b\x21\x10${header_title || "NAMA OUTLET BELUM DI SET"}\x1b\x21\x00\n`; 
    t += `${header_address || "ALAMAT BELUM DI SET"}\n`;
    t += `${header_contact || "KONTAK BELUM DI SET"}\n`;
    t += "-".repeat(paperWidth) + "\n";
    
    // --- 2. INFO TRANSAKSI (Kiri) ---
    t += `\x1b\x61\x00`; // Align Left
    t += formatLeftRight(`MEJA : ${table_name?.substring(0, 10) || "TA"}`, `KASIR: ${cashier?.substring(0, 8) || "KASIR"}`);
    t += `WAKTU: ${new Date().toLocaleString('id-ID')}\n`;
    t += "-".repeat(paperWidth) + "\n";
    
    // --- 3. DAFTAR PESANAN ---
    if (items_list && items_list.length > 0) {
        items_list.forEach((i: any) => {
            t += `${i.name}\n`; 
            const qtyPrice = `${i.qty} x ${i.price.toLocaleString('id-ID')}`;
            const totalItem = `Rp${(i.qty * i.price).toLocaleString('id-ID')}`;
            t += formatLeftRight(`  ${qtyPrice}`, totalItem, paperWidth);
        });
    }

    // --- 4. TOTAL & PEMBAYARAN ---
    t += "-".repeat(paperWidth) + "\n";
    t += formatLeftRight("SUBTOTAL", `Rp${(subtotal || 0).toLocaleString('id-ID')}`, paperWidth);
    if(discount_total > 0) t += formatLeftRight("DISCOUNT", `-Rp${discount_total.toLocaleString('id-ID')}`, paperWidth);
    if(service_charge > 0) t += formatLeftRight("SERVICE(5%)", `Rp${service_charge.toLocaleString('id-ID')}`, paperWidth);
    if(tax_total > 0)      t += formatLeftRight("PB1 (10%)", `Rp${tax_total.toLocaleString('id-ID')}`, paperWidth);
    
    t += "=".repeat(paperWidth) + "\n";
    
    // Font diperbesar untuk Grand Total
    t += `\x1b\x21\x10`; 
    // Lebar karakter saat font membesar jadi setengahnya, maka paperWidth dibagi 2
    t += formatLeftRight("TOTAL", `${(total || 0).toLocaleString('id-ID')}`, Math.floor(paperWidth / 2));
    t += `\x1b\x21\x00`; 
    
    t += "-".repeat(paperWidth) + "\n";
    
    if (payment_method === "TRANSFER") {
        t += formatLeftRight("METODE BAYAR", "TRANSFER", paperWidth);
    } else {
        t += formatLeftRight("TUNAI (CASH)", `Rp${(paid || 0).toLocaleString('id-ID')}`, paperWidth);
        t += formatLeftRight("KEMBALIAN", `Rp${(change || 0).toLocaleString('id-ID')}`, paperWidth);
    }
    t += "-".repeat(paperWidth) + "\n";
    
    // --- 5. FOOTER (Tengah) ---
    t += `\x1b\x61\x01`; // Align Center
    // Jika tidak ada data, cetak peringatan BELUM DI SET
    t += `${footer_thanks || "UCAPAN TERIMA KASIH BELUM DI SET"}\n`;
    t += `${footer_message || "PESAN FOOTER BELUM DI SET"}\n`;
    t += `\n${footer_wifi || "INFO WIFI BELUM DI SET"}\n`; 
    
    // Cek apakah laci harus dibuka (Buka jika pembayaran CASH atau tidak didefinisikan)
    const shouldOpenDrawer = (!payment_method || payment_method === "CASH");

    // Eksekusi Print
    sendToDevice(target_ip, 9100, t, "STRUK_KASIR", shouldOpenDrawer);
    
    res.json({ success: true, message: "Mencetak ke LAN..." });
});

app.listen(4000, '0.0.0.0', () => console.log("✅ SERVER PRINTER READY @ PORT 4000"));