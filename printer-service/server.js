const net = require('node:net');
const express = require('express');
const cors = require('cors');
// Mengatasi beda versi library Jimp
const jimpObj = require('jimp');
const Jimp = jimpObj.Jimp || jimpObj; 
const path = require('node:path');
const fs = require('node:fs');

const app = express();
app.use(cors());
app.use(express.json());

// Fallback Printer bawaan jika frontend gagal kirim IP
const PRINTERS = {
    KASIR: { ip: '192.168.1.27', port: 9100 },
    DAPUR: { ip: '192.168.1.30', port: 9100 },
    BAR:   { ip: '192.168.1.24', port: 9100 }
};

// --- FUNGSI LOGO ---
async function getLogoBuffer() {
    const logoPath = path.join(process.cwd(), 'logo.png');
    if (!fs.existsSync(logoPath)) return null;
    try {
        const image = await Jimp.read(logoPath);
        image.autocrop().resize({ w: 160 }).greyscale().contrast(1);
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const widthBytes = Math.ceil(width / 8);
        let header = Buffer.from([0x1d, 0x76, 0x30, 0x00, widthBytes % 256, Math.floor(widthBytes / 256), height % 256, Math.floor(height / 256)]);
        let pixels = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < widthBytes * 8; x++) {
                let isBlack = 0;
                if (x < width) {
                    const idx = (y * width + x) * 4;
                    if (image.bitmap.data[idx+3] > 128 && image.bitmap.data[idx] < 128) isBlack = 1;
                }
                pixels.push(isBlack);
            }
        }
        let bytes = [];
        for (let i = 0; i < pixels.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                byte |= (pixels[i + j] << (7 - j));
            }
            bytes.push(byte);
        }
        return Buffer.concat([header, Buffer.from(bytes)]);
    } catch (err) { return null; }
}

const sendToDevice = async (ip, port, content, label, includeLogo = false) => {
    const client = new net.Socket();
    client.setTimeout(5000);
    const logoBuffer = includeLogo ? await getLogoBuffer() : null;

    client.connect(port, ip, () => {
        console.log(`[${new Date().toLocaleTimeString()}] 📤 Printing to ${label} (${ip})...`);
        client.write(Buffer.from([0x1b, 0x40])); 
        if (logoBuffer) {
            client.write(Buffer.from([0x1b, 0x61, 0x01])); 
            client.write(logoBuffer);
            client.write(Buffer.from([0x0a, 0x0a])); 
        }
        client.write(content);
        client.write(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); 
        client.end();
    });

    client.on('error', (err) => {
        console.error(`❌ ${label} ERROR: ${err.message}`);
        client.destroy();
    });
};

// --- ENDPOINT KASIR ---
app.post('/print-receipt', async (req, res) => {
    const d = req.body;
    console.log(`[PRINT REQUEST] Type: ${d.payment_method || "RECEIPT"}`); 

    // 🔥 1. DETEKSI CETAK REKAP KATEGORI PRODUK
    if (d.payment_method === "REKAP_PRODUK") {
        let header = `\x1b\x61\x01\x1b\x21\x10${d.header_title || "NES HOUSE COLD BREW"}\x1b\x21\x00\n`;
        header += `Ringkasan Penjualan Produk\n\n`;

        let body = `\x1b\x61\x00`; 
        body += `Mulai    : ${d.table_name || "-"}\n`; 
        body += `Akhir    : ${new Date().toLocaleString('id-ID')}\n`;
        body += `Tercetak : ${new Date().toLocaleString('id-ID')}\n\n`;
        body += `Kategori\n`;

        const categories = d.items_list || d.items || [];
        categories.forEach(catGroup => {
            body += `--------------------------------\n`;
            body += `${catGroup.category}\n`;
            body += `--------------------------------\n`;
            catGroup.items.forEach(item => {
                let left = item.name.substring(0, 24); 
                let right = item.qty.toString();
                body += left + " ".repeat(Math.max(1, 32 - (left.length + right.length))) + right + "\n";
            });
            body += `\n`;
        });

        const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(body)]);
        await sendToDevice(PRINTERS.KASIR.ip, PRINTERS.KASIR.port, fullContent, "KASIR", false); 
        return res.json({ success: true, message: "Rekap Tercetak" });
    }

    // 🔥 2. DETEKSI CETAK TUTUP SHIFT
    if (d.payment_method === "TUTUP_SHIFT") {
        let header = `\x1b\x61\x01\x1b\x21\x10${d.header_title || "NES HOUSE COLD BREW"}\x1b\x21\x00\n`;
        header += `LAPORAN TUTUP SHIFT\n\n`;

        let body = `\x1b\x61\x00`; 
        body += `KASIR    : ${d.cashier || d.cashierName || "-"}\n`;
        body += `WAKTU    : ${new Date().toLocaleString('id-ID')}\n`;
        body += `--------------------------------\n`;

        const items = d.items_list || d.items || [];
        items.forEach(item => {
            let left = item.name.substring(0, 22); 
            let right = `Rp ${Number(item.price).toLocaleString('id-ID')}`;
            body += left + " ".repeat(Math.max(1, 32 - (left.length + right.length))) + right + "\n";
        });

        body += `--------------------------------\n\n`;
        
        const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(body)]);
        await sendToDevice(PRINTERS.KASIR.ip, PRINTERS.KASIR.port, fullContent, "KASIR", false); 
        return res.json({ success: true, message: "Tutup Shift Tercetak" });
    }

    // 🔥 3. CETAK STRUK TRANSAKSI NORMAL KASIR
    const noTrx = d.receipt_no || d.order_id || d.id || d.transaction_id || "-";
    const namaPelanggan = (d.customer_name || d.customer || d.pelanggan || "-").toUpperCase();
    const namaUser = (d.waiter || d.cashier || d.user_name || d.user || "-").toUpperCase();
    
    let header = `\x1b\x61\x01\x1b\x21\x10${d.header_title || "NES HOUSE COLD BREW"}\x1b\x21\x00\n`; 
    header += `${d.header_address || "Jl. Sudirman No. 61 AB"}\n${d.header_contact || "Pematangsiantar"}\n`;
    header += `--------------------------------\n`;

    let body = `\x1b\x61\x00`; 
    body += `NO. TRX : ${noTrx}\n`;
    body += `MEJA    : ${d.table_name || d.table || '-'}\n`;
    body += `PLG     : ${namaPelanggan}\n`;
    body += `KASIR   : ${namaUser}\n`;
    body += `TGL     : ${new Date().toLocaleString('id-ID')}\n`;
    body += `--------------------------------\n`;
    
    const items = d.items_list || d.items || [];
    items.forEach(i => {
        body += `${i.name.toUpperCase()}\n`;
        let left = `${i.qty} x ${Number(i.price).toLocaleString('id-ID')}`;
        let right = `Rp${(i.qty * i.price).toLocaleString('id-ID')}`;
        body += left + " ".repeat(Math.max(1, 32 - (left.length + right.length))) + right + "\n";
    });

    body += `--------------------------------\n`;
    const addLine = (label, val) => {
        let v = `Rp${(val || 0).toLocaleString('id-ID')}`;
        return label + " ".repeat(Math.max(1, 32 - (label.length + v.length))) + v + "\n";
    };

    body += addLine("SUBTOTAL", d.subtotal);
    if(d.discount_total || d.discount) body += addLine("DISKON", -(d.discount_total || d.discount));
    if(d.tax_total || d.tax) body += addLine("PB1 (10%)", d.tax_total || d.tax);
    if(d.service_charge || d.service) body += addLine("SERVICE", d.service_charge || d.service);
    body += `================================\n`;
    body += `\x1b\x21\x10` + addLine("TOTAL", d.total) + `\x1b\x21\x00`;
    body += `--------------------------------\n`;
    
    let footer = `\x1b\x61\x01\n${d.footer_thanks || "TERIMA KASIH"}\n${d.footer_message || "SELAMAT MENIKMATI!"}\n`;

    const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(body), Buffer.from(footer)]);
    await sendToDevice(PRINTERS.KASIR.ip, PRINTERS.KASIR.port, fullContent, "KASIR", true); 
    res.json({ success: true });
});

// --- ENDPOINT ORDER (DAPUR/BAR) ---
app.post('/print-order', async (req, res) => {
    const d = req.body;
    
    // 🔥 MENANGKAP IP DINAMIS DARI FRONTEND
    const { items, table_name, ip_dapur, ip_bar } = d;
    
    const namaPelanggan = (d.customer_name || d.customer || d.pelanggan || "-").toUpperCase();
    const namaWaiter = (d.waiter || d.cashier || d.user_name || d.user || "-").toUpperCase();
    
    const dapurCat = ['NUSANTARA', 'SPAGETTI', 'SNACK', 'ADD ON KITCHEN', 'NOODLE', 'VEGETABLE', 'HOTPLATE', 'SIRAM', 'SOUP', 'TELUR ASIN'];
    const food = (items || []).filter(i => dapurCat.includes(i.category?.toUpperCase()));
    const drink = (items || []).filter(i => !dapurCat.includes(i.category?.toUpperCase()));

    const formatOrder = (title, list) => {
        let h = `\x1b\x61\x01\x1b\x21\x30*** ${title} ***\x1b\x21\x00\n\n`; 
        h += `\x1b\x61\x00\x1b\x21\x20MEJA: ${table_name}\x1b\x21\x00\n`; 
        h += `PLG : ${namaPelanggan}\nOLEH: ${namaWaiter}\nJAM : ${new Date().toLocaleTimeString('id-ID')}\n`; 
        h += `--------------------------------\n`;
        list.forEach(i => {
            h += `\x1b\x21\x10${i.qty} x ${i.name.toUpperCase()}\x1b\x21\x00\n`;
            if (i.note) h += `   *NOTE: ${i.note.toUpperCase()}\n`;
            h += `--------------------------------\n`;
        });
        return Buffer.from(h);
    };

    // Gunakan IP dari Frontend. Jika kosong, gunakan PRINTERS bawaan.
    const targetDapur = ip_dapur || PRINTERS.DAPUR.ip;
    const targetBar = ip_bar || PRINTERS.BAR.ip;

    if (food.length > 0 && targetDapur) await sendToDevice(targetDapur, PRINTERS.DAPUR.port, formatOrder("DAPUR", food), "DAPUR", false);
    if (drink.length > 0 && targetBar) await sendToDevice(targetBar, PRINTERS.BAR.port, formatOrder("BAR", drink), "BAR", false);
    
    res.json({ success: true });
});

app.listen(4000, '0.0.0.0', () => console.log("🚀 DISBA PRINT BRIDGE ONLINE - PORT 4000"));