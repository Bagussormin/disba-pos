
const net = require('node:net');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-tenant-id']
}));

app.use(express.json());

// --- UTILS & FORMATTING ---
app.get('/ping', (req, res) => {
    console.log(
        `[${new Date().toLocaleTimeString()}] Connection test from client...`
    );

    res.json({
        success: true,
        message: 'PONG! DISBA BRIDGE V4.5 IS ALIVE',
        timestamp: new Date()
    });
});

const formatIDR = (val) =>
    'Rp. ' + Number(val || 0).toLocaleString('id-ID');

const line = '--------------------------------\n';

const center = '\x1b\x61\x01';
const left = '\x1b\x61\x00';
const boldOn = '\x1b\x21\x10';
const boldOff = '\x1b\x21\x00';

const cutPaper = Buffer.from([
    0x0a, 0x0a, 0x0a, 0x0a,
    0x1d, 0x56, 0x42, 0x00
]);

/**
 * CORE PRINTING ENGINE
 * Mengirim data ke printer thermal melalui TCP/IP port 9100.
 */
const sendToDevice = async (
    ip,
    port,
    content,
    label,
    tenantId = 'GLOBAL'
) => {
    if (!ip || String(ip).trim() === '' || ip === 'null') {
        return false;
    }

    const client = new net.Socket();
    client.setTimeout(5000);

    return new Promise((resolve) => {
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            resolve(result);
        };

        client.connect(port, ip, () => {
            console.log(
                `[${new Date().toLocaleTimeString()}] ` +
                `[${tenantId}] ${label} (${ip}) PRINTING...`
            );

            client.write(Buffer.from([0x1b, 0x40]));
            client.write(content);
            client.write(cutPaper);
            client.end();

            finish(true);
        });

        client.on('error', (err) => {
            console.error(
                `[${tenantId}] ${label} ERROR (${ip}): ${err.message}`
            );

            client.destroy();
            finish(false);
        });

        client.on('timeout', () => {
            console.error(`[${tenantId}] ${label} TIMEOUT (${ip})`);

            client.destroy();
            finish(false);
        });
    });
};

// --- 1. TIKET PESANAN: KITCHEN, BAR, RUNNER ---
app.post('/print-order', async (req, res) => {
    try {
        const d = req.body;
        const tid = d.tenant_id || 'UNKNOWN_TENANT';
        const items = Array.isArray(d.items) ? d.items : [];

        const generateTicket = (ticketItems, title) => {
            let h = `${center}${boldOn}*** ${title} ***${boldOff}\n\n`;

            h += `${left}TENANT : ${tid}\n`;
            h += `MEJA   : ${d.table_name || '-'}\n`;
            h += `JAM    : ${new Date().toLocaleTimeString('id-ID')}\n`;
            h += line;

            ticketItems.forEach((i) => {
                h += `${boldOn}${i.qty} x ${String(i.name || '').toUpperCase()}${boldOff}\n`;

                if (i.note) {
                    h += `   *${String(i.note).toUpperCase()}\n`;
                }

                h += line;
            });

            return Buffer.from(h);
        };

        const barKeywords = [
            'coffee', 'tea', 'juice', 'beer', 'bar',
            'drink', 'minuman', 'alcohol', 'cocktail', 'mocktail'
        ];

        const isBarItem = (i) =>
            barKeywords.some((key) =>
                String(i.category || '').toLowerCase().includes(key)
            );

        const barItems = items.filter(isBarItem);
        const kitchenItems = items.filter((i) => !isBarItem(i));

        const jobs = [];

        if (kitchenItems.length > 0) {
            jobs.push(
                sendToDevice(
                    d.ip_dapur,
                    9100,
                    generateTicket(kitchenItems, 'DAPUR'),
                    'KITCHEN',
                    tid
                )
            );
        }

        if (barItems.length > 0) {
            jobs.push(
                sendToDevice(
                    d.ip_bar,
                    9100,
                    generateTicket(barItems, 'BAR'),
                    'BAR',
                    tid
                )
            );
        }

        if (d.ip_runner) {
            jobs.push(
                sendToDevice(
                    d.ip_runner,
                    9100,
                    generateTicket(items, 'RUNNER'),
                    'RUNNER',
                    tid
                )
            );
        }

        const results = await Promise.all(jobs);
        const successCount = results.filter(Boolean).length;

        if (jobs.length > 0 && successCount === 0) {
            return res.status(500).json({
                success: false,
                message: 'Gagal terhubung ke semua printer produksi'
            });
        }

        return res.json({
            success: true,
            message: 'Order tickets processed',
            successCount
        });
    } catch (error) {
        console.error('Print order error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mencetak tiket pesanan'
        });
    }
});

// --- 2. STRUK KASIR & COPY OFFICE ---
app.post('/print-receipt', async (req, res) => {
    try {
        const d = req.body;
        const tid = d.tenant_id || 'UNKNOWN_TENANT';
        const items = Array.isArray(d.items) ? d.items : [];

        let h = '';

        // HEADER: RATA TENGAH
        h += center;

        if (d.reprint) {
            h += `${boldOn}-- REPRINT BILL --${boldOff}\n`;
        }

        h += `${boldOn}${d.storeName || 'DISBA POS'}${boldOff}\n`;

        if (d.address) {
            h += `${d.address}\n`;
        }

        if (d.contact) {
            h += `${d.contact}\n`;
        }

        h += line;

        // INFORMASI TRANSAKSI: RATA KIRI
        h += left;
        h += `INV   : ${d.receipt_no || '-'}\n`;
        h += `MEJA  : ${d.tableName || '-'}\n`;
        h += `JAM   : ${new Date().toLocaleTimeString('id-ID')}\n`;
        h += `KASIR : ${d.cashierName || '-'}\n`;
        h += line;

        // DAFTAR ITEM
        items.forEach((i) => {
            const qty = Number(i.qty || 0);
            const price = Number(i.price || 0);
            const subtotalItem = qty * price;

            h += `${String(i.name || '').toUpperCase()}\n`;
            h += `${qty} x ${price.toLocaleString('id-ID')} = ` +
                 `${subtotalItem.toLocaleString('id-ID')}\n`;
        });

        // RINGKASAN PEMBAYARAN: RATA KIRI
        h += '\n';
        h += left;
        h += line;
        h += `SUBTOTAL  : ${formatIDR(d.subtotal)}\n`;

        if (Number(d.discount) > 0) {
            h += `DISKON    : -${formatIDR(d.discount)}\n`;
        }

        if (Number(d.tax) > 0) {
            h += `PAJAK 10% : ${formatIDR(d.tax)}\n`;
        }

        h += line;
        h += `${boldOn}TOTAL     : ${formatIDR(d.total)}${boldOff}\n`;
        h += `BAYAR     : ${formatIDR(d.paid ?? d.total)}\n`;
        h += `KEMBALI   : ${formatIDR(d.change ?? 0)}\n`;
        h += line;

        // FOOTER: RATA TENGAH
        h += center;
        h += `${boldOn}${d.footerText || 'TERIMA KASIH'}${boldOff}\n`;
        h += '\n';

        const contentBuffer = Buffer.from(h);
        const jobs = [];

        // Cetak ke printer kasir.
        jobs.push(
            sendToDevice(
                d.ip_kasir,
                9100,
                contentBuffer,
                'KASIR_BILL',
                tid
            )
        );

        // Cetak salinan kantor jika IP tersedia.
        if (d.ip_office) {
            const officeHeader = Buffer.from(
                `${center}${boldOn}-- COPY KANTOR --${boldOff}\n`
            );

            jobs.push(
                sendToDevice(
                    d.ip_office,
                    9100,
                    Buffer.concat([officeHeader, contentBuffer]),
                    'OFFICE_COPY',
                    tid
                )
            );
        }

        const results = await Promise.all(jobs);
        const successCount = results.filter(Boolean).length;

        if (jobs.length > 0 && successCount === 0) {
            return res.status(500).json({
                success: false,
                message: 'Gagal terhubung ke printer kasir/kantor'
            });
        }

        return res.json({
            success: true,
            message: 'Receipt printed',
            successCount
        });
    } catch (error) {
        console.error('Print receipt error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mencetak struk'
        });
    }
});

// --- 3. LAPORAN SETTLEMENT / PENUTUPAN SHIFT ---
app.post('/print-settlement', async (req, res) => {
    try {
        const d = req.body || {};
        const c = d.closingData || {};
        const tid = d.tenant_id || 'UNKNOWN_TENANT';
        const soldItems = Array.isArray(d.items) ? d.items : [];
        const printedAt = new Date();
        const reportDate = c.date || printedAt.toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });

        let h = `${center}${boldOn}${d.storeName || 'DISBA POS'}${boldOff}\n`;
        if (d.address) h += `${d.address}\n`;
        if (d.contact) h += `${d.contact}\n`;
        h += `${boldOn}LAPORAN TUTUP SHIFT${boldOff}\n`;
        h += `${left}Tanggal        : ${reportDate}\n`;
        h += `Kasir          : ${d.cashierName || '-'}\n`;
        h += `Mulai Shift    : ${c.startTime || '-'}\n`;
        h += `Tutup Shift    : ${c.endTime || '-'}\n`;
        h += line;

        h += `${boldOn}RINCIAN BARANG TERJUAL${boldOff}\n`;
        if (soldItems.length === 0) {
            h += `Belum ada rincian barang.\n`;
        } else {
            soldItems.forEach((item) => {
                const name = String(item.name || 'Barang');
                const qty = Number(item.qty || 0);
                const price = Number(item.price || 0);
                const total = Number(item.total ?? (qty * price));
                h += `${name}\n`;
                h += `  ${qty} x ${formatIDR(price)} = ${formatIDR(total)}\n`;
            });
        }
        h += line;
        h += `Total Qty      : ${Number(c.totalItemTerjual || soldItems.reduce((sum, item) => sum + Number(item.qty || 0), 0))}\n`;
        h += `Total Penjualan: ${formatIDR(c.totalPenjualan)}\n`;
        h += `Subtotal       : ${formatIDR(c.subtotal)}\n`;
        if (Number(c.diskonBill || 0) > 0) h += `Diskon Bill    : -${formatIDR(c.diskonBill)}\n`;
        if (Number(c.service || 0) > 0) h += `Service Charge : ${formatIDR(c.service)}\n`;
        h += line;
        h += `${boldOn}REKONSILIASI KAS${boldOff}\n`;
        h += `Modal Kas Awal : ${formatIDR(c.awalLaci)}\n`;
        h += `Kas Penjualan  : ${formatIDR(c.kasPenjualan)}\n`;
        h += `Kas Diharapkan : ${formatIDR(c.kasDiharapkan)}\n`;
        h += `Kas Aktual     : ${formatIDR(c.kasAktual)}\n`;
        h += `Kas Selisih    : ${formatIDR(c.kasSelisih)}\n`;
        h += line;
        h += `${center}${d.footerText || 'SHIFT TELAH DITUTUP'}\n`;
        h += `Cetak: ${printedAt.toLocaleString('id-ID')}\n`;

        const settlementBuffer = Buffer.from(h);
        const jobs = [];
        jobs.push(sendToDevice(d.ip_kasir, 9100, settlementBuffer, 'SETTLEMENT', tid));
        if (d.ip_office) {
            jobs.push(sendToDevice(d.ip_office, 9100, settlementBuffer, 'SETTLEMENT_OFFICE', tid));
        }

        const results = await Promise.all(jobs);
        const successCount = results.filter(result => result === true).length;
        if (successCount === 0) {
            return res.status(500).json({
                success: false,
                message: 'Laporan shift gagal dicetak. Periksa IP dan koneksi printer.'
            });
        }
        return res.json({ success: true, message: 'Laporan shift dicetak', successCount });
    } catch (error) {
        console.error('Print settlement error:', error);

        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mencetak settlement'
        });
    }
});

// --- 4. EMAIL LAPORAN PDF ---
app.post('/send-report-email', async (req, res) => {
    const {
        email_to,
        outlet_name,
        period,
        summary,
        pdf_attachment,
        tenant_id
    } = req.body;

    if (!email_to || !pdf_attachment) {
        return res.status(400).json({
            success: false,
            message: 'Email atau lampiran PDF tidak valid'
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASS
            }
        });

        if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASS) {
            throw new Error('SMTP_EMAIL dan SMTP_PASS harus diatur di environment');
        }

        const base64Data = pdf_attachment.includes('base64,')
            ? pdf_attachment.split('base64,')[1]
            : pdf_attachment;

        const pdfBuffer = Buffer.from(base64Data, 'base64');

        const mailOptions = {
            from: `"Disba POS Intelligence" <${process.env.SMTP_EMAIL}>`,
            to: email_to,
            subject: `Laporan Penjualan - ${outlet_name} (${period})`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #0284c7;">Laporan Keuangan & Penjualan</h2>
                    <p>Halo Tim <strong>${outlet_name || '-'}</strong>,</p>
                    <p>Berikut adalah ringkasan laporan penjualan Anda untuk periode
                    <strong>${period || '-'}</strong>:</p>
                    <ul>
                        <li><strong>Gross Sales:</strong>
                        Rp ${Number(summary?.subtotal || 0).toLocaleString('id-ID')}</li>
                        <li><strong>Service Charge:</strong>
                        Rp ${Number(summary?.service || 0).toLocaleString('id-ID')}</li>
                        <li><strong>Tax (PB1):</strong>
                        Rp ${Number(summary?.tax || 0).toLocaleString('id-ID')}</li>
                        <li><strong>Net Revenue:</strong>
                        Rp ${Number(summary?.total || 0).toLocaleString('id-ID')}</li>
                    </ul>
                    <p>Laporan lengkap dalam format PDF dilampirkan pada email ini.</p>
                    <p style="font-size: 12px; color: #888;">
                    <i>Email ini dikirim otomatis oleh sistem DISBA POS.</i></p>
                </div>
            `,
            attachments: [
                {
                    filename: `Report_${tenant_id || 'tenant'}_${String(period || 'periode').replace(/\//g, '-')}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(
            `[${tenant_id || 'UNKNOWN_TENANT'}] EMAIL TERKIRIM KE: ` +
            `${email_to} (ID: ${info.messageId})`
        );

        return res.json({
            success: true,
            messageId: info.messageId
        });
    } catch (error) {
        console.error(
            `[${tenant_id || 'UNKNOWN_TENANT'}] GAGAL MENGIRIM EMAIL:`,
            error
        );

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// --- START SERVER ---
const PORT = 4000;

app.listen(PORT, '0.0.0.0', () => {
    console.log('=========================================');
    console.log('DISBA BRIDGE V4.5: ONLINE');
    console.log(`LISTENING ON PORT: ${PORT}`);
    console.log('MODE: MULTI-TENANT SAAS READY');
    console.log('SUPPORTED: KASIR, DAPUR, BAR, RUNNER, OFFICE');
    console.log('=========================================');
});
