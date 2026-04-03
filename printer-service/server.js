const net = require('node:net');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 🛡️ FUNGSI TEMBAK PRINTER (ASLI MILIK LETJEN)
// ==========================================
const sendToDevice = async (ip, port, content, label) => {
    if (!ip) return false; // JIKA IP KOSONG DARI FRONTEND, BATAL TEMBAK ALIAS AMAN

    const client = new net.Socket();
    client.setTimeout(5000);

    return new Promise((resolve) => {
        client.connect(port, ip, () => {
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 MENEMBAK ${label} (${ip})...`);
            client.write(Buffer.from([0x1b, 0x40])); // Reset Printer
            client.write(content); // Kirim Isi
            client.write(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); // Cut Paper
            client.end();
            resolve(true);
        });

        client.on('error', (err) => {
            console.error(`❌ ${label} (${ip}) ERROR: ${err.message}`);
            client.destroy();
            resolve(false);
        });

        client.on('timeout', () => {
            console.error(`❌ ${label} (${ip}) TIMEOUT!`);
            client.destroy();
            resolve(false);
        });
    });
};

// ==========================================
// 🔥 ENDPOINT DAPUR & BAR (DINAMIS SaaS 100%)
// ==========================================
app.post('/print-order', async (req, res) => {
    const d = req.body;
    
    console.log(`[ORDER REQUEST] Meja: ${d.table_name || "-"} | Item: ${d.items?.length}`);

    if (!d.items || d.items.length === 0) {
        return res.json({ success: false, message: "No items" });
    }

    // FORMAT TIKET DAPUR UNIVERSAL
    let h = `\x1b\x61\x01\x1b\x21\x30*** TIKET ORDER ***\x1b\x21\x00\n\n`; 
    h += `\x1b\x61\x00\x1b\x21\x20MEJA: ${d.table_name || "-"}\x1b\x21\x00\n`; 
    h += `WAITER: ${d.waiter || "-"}\n`;
    h += `JAM   : ${new Date().toLocaleTimeString('id-ID')}\n`; 
    h += `--------------------------------\n`;
    
    d.items.forEach(i => {
        h += `\x1b\x21\x10${i.qty} x ${i.name.toUpperCase()}\x1b\x21\x00\n`;
        if (i.note) h += `   *NOTE: ${i.note.toUpperCase()}\n`;
        h += `--------------------------------\n`;
    });

    const bufferData = Buffer.from(h);

    // Tembak sesuai perintah Frontend Letjen
    if (d.ip_dapur) {
        await sendToDevice(d.ip_dapur, 9100, bufferData, "DAPUR");
    }
    
    if (d.ip_bar) {
        await sendToDevice(d.ip_bar, 9100, bufferData, "BAR");
    }

    res.json({ success: true, message: "Perintah tembak selesai diproses" });
});

// ==========================================
// 💳 ENDPOINT KASIR (DINAMIS SaaS 100%)
// ==========================================
app.post('/print-receipt', async (req, res) => {
    const d = req.body;
    const targetKasir = d.target_ip;

    console.log(`[RECEIPT REQUEST] Kasir Tujuan: ${targetKasir || "KOSONG"}`);

    if (!targetKasir) {
        return res.status(400).json({ success: false, message: "IP Kasir tidak dikirim dari frontend" });
    }

    // FORMAT STRUK KASIR THERMAL
    let h = `\x1b\x61\x01\x1b\x21\x10${d.header_title || "DISBA POS"}\x1b\x21\x00\n`;
    if (d.header_address) h += `${d.header_address}\n`;
    h += `--------------------------------\n\x1b\x61\x00`;
    h += `NO   : ${d.receipt_no || "-"}\n`;
    h += `MEJA : ${d.table_name || "-"}\n`;
    h += `KASIR: ${d.cashier || "-"}\n`;
    h += `JAM  : ${new Date().toLocaleTimeString('id-ID')}\n`;
    h += `--------------------------------\n`;
    
    if (d.items) {
        d.items.forEach(i => {
            h += `${i.name.toUpperCase()}\n`;
            h += `${i.qty} x ${i.price || 0}   ${(i.qty * (i.price || 0))}\n`;
        });
    }
    
    h += `--------------------------------\n`;
    h += `SUBTOTAL: ${d.subtotal || 0}\n`;
    h += `\x1b\x21\x10TOTAL   : ${d.total || 0}\x1b\x21\x00\n`;
    h += `\x1b\x61\x01\n*** ${d.payment_method || "LUNAS"} ***\n\n\n`;

    const success = await sendToDevice(targetKasir, 9100, Buffer.from(h), "KASIR");

    res.json({ success: success });
});

// ==========================================
// 🧪 ENDPOINT BARU: TEST PRINT (BACKOFFICE)
// ==========================================
app.post('/print-lan', async (req, res) => {
    const { printerIp, content } = req.body;

    console.log(`[TEST REQUEST] Mencoba menembak ke: ${printerIp || "IP KOSONG"}`);

    if (!printerIp) {
        return res.status(400).json({ success: false, message: "IP tidak terdeteksi dari frontend" });
    }

    // Menggunakan fungsi sendToDevice asli milik Letjen agar tetap aman dan standar
    const success = await sendToDevice(printerIp, 9100, Buffer.from(content), "TEST-STATION");

    res.json({ success: success });
});

// ==========================================
// 🚀 AKTIVASI POS ARTILLERY
// ==========================================
app.listen(4000, '0.0.0.0', () => {
    console.log(`
    =========================================
    🚀 DISBA POS SERVER ONLINE - PORT 4000
    -----------------------------------------
    - ENDPOINT ORDER   : READY
    - ENDPOINT RECEIPT : READY
    - ENDPOINT TEST    : READY (SaaS BACKOFFICE)
    =========================================
    `);
});