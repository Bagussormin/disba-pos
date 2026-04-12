const net = require('node:net');
const express = require('express');
const cors = require('cors');

const app = express();

// Konfigurasi CORS untuk keamanan arsitektur SaaS
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST'], 
    allowedHeaders: ['Content-Type', 'x-tenant-id'] 
}));
app.use(express.json());

// --- UTILS & FORMATTING ---
const formatIDR = (val) => "Rp. " + Number(val || 0).toLocaleString('id-ID');
const line = "--------------------------------\n";
const center = "\x1b\x61\x01";
const left = "\x1b\x61\x00";
const boldOn = "\x1b\x21\x10";
const boldOff = "\x1b\x21\x00";
const cutPaper = Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]);

/**
 * CORE PRINTING ENGINE
 * Menangani pengiriman data ke printer thermal via TCP/IP (Port 9100)
 */
const sendToDevice = async (ip, port, content, label, tenantId = 'GLOBAL') => {
    // Validasi: Jika IP tidak ada atau kosong, abaikan tanpa error
    if (!ip || ip.trim() === "" || ip === "null") return false;

    const client = new net.Socket();
    client.setTimeout(5000); // Timeout 5 detik agar tidak menggantung

    return new Promise((resolve) => {
        client.connect(port, ip, () => {
            console.log(`[${new Date().toLocaleTimeString()}] 🚀 [${tenantId}] ${label} (${ip}) PRINTING...`);
            client.write(Buffer.from([0x1b, 0x40])); // Reset Printer
            client.write(content);
            client.write(cutPaper);
            client.end();
            resolve(true);
        });

        client.on('error', (err) => { 
            console.error(`❌ [${tenantId}] ${label} ERROR (${ip}): ${err.message}`); 
            client.destroy(); 
            resolve(false); 
        });

        client.on('timeout', () => { 
            console.error(`❌ [${tenantId}] ${label} TIMEOUT (${ip})`);
            client.destroy(); 
            resolve(false); 
        });
    });
};

// --- ENDPOINTS ---

/**
 * 1. JALUR TIKET PESANAN (KITCHEN, BAR, RUNNER)
 * Logika: Memisahkan item berdasarkan kategori keyword secara otomatis.
 */
app.post('/print-order', async (req, res) => {
    const d = req.body;
    const tid = d.tenant_id || 'UNKNOWN_TENANT';

    const generateTicket = (items, title) => {
        let h = `${center}${boldOn}*** ${title} ***${boldOff}\n\n`;
        h += `${left}TENANT : ${tid}\n`;
        h += `MEJA   : ${d.table_name || '-'}\n`;
        h += `JAM    : ${new Date().toLocaleTimeString('id-ID')}\n`;
        h += line;
        items.forEach(i => {
            h += `\x1b\x21\x10${i.qty} x ${i.name.toUpperCase()}\x1b\x21\x00\n`;
            if (i.note) h += `   *${i.note.toUpperCase()}\n`;
            h += line;
        });
        return Buffer.from(h);
    };

    // Filter Kategori (Logic yang sudah kita bangun)
    const barKeywords = ['coffee', 'tea', 'juice', 'beer', 'bar', 'drink', 'minuman', 'alcohol', 'cocktail', 'mocktail'];
    const barItems = d.items.filter(i => barKeywords.some(key => (i.category || "").toLowerCase().includes(key)));
    const kitchenItems = d.items.filter(i => !barKeywords.some(key => (i.category || "").toLowerCase().includes(key)));

    const jobs = [];
    if (kitchenItems.length > 0) jobs.push(sendToDevice(d.ip_dapur, 9100, generateTicket(kitchenItems, "DAPUR"), "KITCHEN", tid));
    if (barItems.length > 0) jobs.push(sendToDevice(d.ip_bar, 9100, generateTicket(barItems, "BAR"), "BAR", tid));
    
    // Runner mendapatkan rekap seluruh item
    if (d.ip_runner) jobs.push(sendToDevice(d.ip_runner, 9100, generateTicket(d.items, "RUNNER"), "RUNNER", tid));

    await Promise.all(jobs);
    res.json({ success: true, message: "Order tickets sent" });
});

/**
 * 2. JALUR STRUK KASIR & OFFICE
 * Logika: Cetak struk belanja pelanggan dan copy untuk kantor.
 */
app.post('/print-receipt', async (req, res) => {
    const d = req.body;
    const tid = d.tenant_id || 'UNKNOWN_TENANT';

    let h = `${center}`;
    if (d.reprint) h += `${boldOn}-- REPRINT BILL --${boldOff}\n`;
    h += `${boldOn}${d.storeName || 'DISBA POS'}${boldOff}\n`;
    if (d.address) h += `${d.address}\n`;
    if (d.contact) h += `${d.contact}\n`;
    h += line;

    h += `${left}INV   : ${d.receipt_no || '-'}\n`;
    h += `MEJA  : ${d.tableName || '-'}\n`;
    h += `JAM   : ${new Date().toLocaleTimeString('id-ID')}\n`;
    h += `KASIR : ${d.cashierName || '-'}\n`;
    h += line + `\n`;

    if (d.items) {
        d.items.forEach(i => {
            const sub = Number(i.qty * i.price).toLocaleString('id-ID');
            h += `${i.name.toUpperCase()}\n`;
            h += `${i.qty} x ${Number(i.price).toLocaleString('id-ID')} = ${sub}\n`;
        });
    }

    h += `\n` + line;
    h += `SUBTOTAL  : ${formatIDR(d.subtotal)}\n`;
    if (d.discount > 0)      h += `DISKON    : -${formatIDR(d.discount)}\n`;
    if (d.serviceCharge > 0) h += `SERVICE   : ${formatIDR(d.serviceCharge)}\n`;
    if (d.tax > 0)           h += `PB1 (10%) : ${formatIDR(d.tax)}\n`;
    
    h += line;
    h += `${boldOn}TOTAL     : ${formatIDR(d.total)}${boldOff}\n`;
    h += `BAYAR     : ${formatIDR(d.paid || d.total)}\n`;
    h += `KEMBALI   : ${formatIDR(d.change || 0)}\n`;
    h += line;
    h += `${center}\n${d.footerText || 'TERIMA KASIH'}\n`;

    const contentBuffer = Buffer.from(h);
    const jobs = [];
    
    // Cetak ke Kasir
    jobs.push(sendToDevice(d.ip_kasir, 9100, contentBuffer, "KASIR_BILL", tid));
    
    // Cetak ke Office (Arsip Kantor)
    if (d.ip_office) {
        const officeHeader = Buffer.from(`${center}${boldOn}-- COPY KANTOR --${boldOff}\n`);
        jobs.push(sendToDevice(d.ip_office, 9100, Buffer.concat([officeHeader, contentBuffer]), "OFFICE_COPY", tid));
    }

    await Promise.all(jobs);
    res.json({ success: true, message: "Receipt printed" });
});

/**
 * 3. JALUR LAPORAN SETTLEMENT (SHIFT CLOSE)
 */
app.post('/print-settlement', async (req, res) => {
    const d = req.body;
    const c = d.closingData;
    const tid = d.tenant_id || 'UNKNOWN_TENANT';

    let h = `${center}${boldOn}${d.storeName}${boldOff}\n`;
    h += `LAPORAN PENUTUPAN SHIFT\n\n`;
    h += `${left}Kasir          : ${d.cashierName || '-'}\n`;
    h += `Mulai Shift    : ${c.startTime}\n`;
    h += `Shift Berakhir : ${c.endTime}\n`;
    h += line;
    h += `Total Penjualan: ${formatIDR(c.totalPenjualan)}\n`;
    h += `Subtotal       : ${formatIDR(c.subtotal)}\n`;
    h += `Diskon Bill    : ${formatIDR(c.diskonBill * -1)}\n`;
    h += `Service Charge : ${formatIDR(c.service)}\n`;
    h += line;
    h += `Kas Diharapkan : ${formatIDR(c.kasDiharapkan)}\n`;
    h += `Kas Aktual     : ${formatIDR(c.kasAktual)}\n`;
    h += `Kas Selisih    : ${formatIDR(c.kasSelisih)}\n`;
    h += line;
    h += `${center}\nCetak: ${new Date().toLocaleString('id-ID')}\n`;

    const settlementBuffer = Buffer.from(h);
    const jobs = [];
    
    jobs.push(sendToDevice(d.ip_kasir, 9100, settlementBuffer, "SETTLEMENT", tid));
    if (d.ip_office) jobs.push(sendToDevice(d.ip_office, 9100, settlementBuffer, "SETTLEMENT_OFFICE", tid));

    await Promise.all(jobs);
    res.json({ success: true });
});

// --- START SERVER ---
const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
    console.log("=========================================");
    console.log(`🚀 DISBA BRIDGE V4.5: ONLINE`);
    console.log(`📡 LISTENING ON PORT: ${PORT}`);
    console.log(`🛡️  MODE: MULTI-TENANT SAAS READY`);
    console.log(`🔧 SUPPORTED: KASIR, DAPUR, BAR, RUNNER, OFFICE`);
    console.log("=========================================");
});