import net from 'node:net';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PRINTERS = {
    KASIR: { ip: '192.168.1.27', port: 9100 },
    DAPUR: { ip: '192.168.1.30', port: 9100 },
    BAR:   { ip: '192.168.1.24', port: 9100 }
};

const sendToDevice = (ip, port, text, label) => {
    const client = new net.Socket();
    client.setTimeout(3000);
    client.connect(port, ip, () => {
        console.log(`[${new Date().toLocaleTimeString()}] 🖨️  PRINTING: ${label}`);
        client.write(Buffer.from([0x1b, 0x40, 0x1b, 0x61, 0x01])); // Init & Center
        client.write(text);
        client.write(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); // Feed & Cut
        client.end();
    });
    client.on('error', (err) => console.error(`❌ ${label} ERROR:`, err.message));
    client.on('timeout', () => { client.destroy(); });
};

// --- 1. CANTIKKAN PRINT ORDER (DAPUR/BAR) ---
app.post('/print-order', (req, res) => {
    const { items, table_name } = req.body;
    const dapurCat = ['NUSANTARA', 'SPAGETTI', 'SNACK', 'ADD ON KITCHEN', 'NOODLE', 'VEGETABLE', 'HOTPLATE', 'SIRAM', 'SOUP', 'TELUR ASIN'];
    
    const food = items.filter(i => dapurCat.includes(i.category?.toUpperCase()));
    const drink = items.filter(i => !dapurCat.includes(i.category?.toUpperCase()));

    const formatOrder = (title, list) => {
        let t = `\n\x1b\x21\x30*** ${title} ***\x1b\x21\x00\n`; // Bold & Double Height
        t += `\x1b\x21\x10MEJA: ${table_name}\x1b\x21\x00\n`;
        t += `--------------------------------\n`;
        list.forEach(i => {
            t += `\x1b\x21\x01${i.qty}x ${i.name}\x1b\x21\x00\n`; // Larger Text
        });
        t += `--------------------------------\n`;
        t += `JAM: ${new Date().toLocaleTimeString()}\n`;
        return t;
    };

    if (food.length > 0) sendToDevice(PRINTERS.DAPUR.ip, PRINTERS.DAPUR.port, formatOrder("DAPUR", food), "DAPUR");
    if (drink.length > 0) sendToDevice(PRINTERS.BAR.ip, PRINTERS.BAR.port, formatOrder("BAR", drink), "BAR");
    res.json({ success: true });
});

// --- 2. CANTIKKAN STRUK BILL ---
app.post('/print-receipt', (req, res) => {
    const { table_name, items_list, subtotal, discount_total, service_charge, tax_total, total, paid, change, cashier } = req.body;
    
    let t = `\x1b\x21\x10DISBA RESTO & CAFE\x1b\x21\x00\n`;
    t += `Jl. Utama No. 01, Kota Anda\n`;
    t += `--------------------------------\n`;
    t += `MEJA: ${table_name.padEnd(10)} KASIR: ${cashier}\n`;
    t += `TGL : ${new Date().toLocaleString()}\n`;
    t += `--------------------------------\n`;
    
    items_list.forEach(i => {
        t += `\x1b\x61\x00${i.name}\n`; // Align Left
        t += `${i.qty} x ${i.price.toLocaleString().padEnd(10)}  Rp${(i.qty * i.price).toLocaleString().padStart(10)}\n`;
    });

    t += `--------------------------------\n`;
    t += `SUBTOTAL:       Rp${subtotal.toLocaleString().padStart(10)}\n`;
    if(discount_total > 0) t += `DISCOUNT:      -Rp${discount_total.toLocaleString().padStart(10)}\n`;
    t += `SERVICE(5%):    Rp${service_charge.toLocaleString().padStart(10)}\n`;
    t += `PB1 (10%):      Rp${tax_total.toLocaleString().padStart(10)}\n`;
    t += `================================\n`;
    t += `\x1b\x21\x10TOTAL: Rp${total.toLocaleString()}\x1b\x21\x00\n`;
    t += `--------------------------------\n`;
    t += `BAYAR :         Rp${paid.toLocaleString().padStart(10)}\n`;
    t += `KEMBALI:        Rp${change.toLocaleString().padStart(10)}\n`;
    t += `--------------------------------\n`;
    t += `\x1b\x61\x01TERIMA KASIH\nSEMOGA HARI ANDA MENYENANGKAN!\n`; // Center
    
    sendToDevice(PRINTERS.KASIR.ip, PRINTERS.KASIR.port, t, "STRUK_KASIR");
    res.json({ success: true });
});

// --- 3. PRINT LAPORAN SHIFT (FITUR BARU) ---
app.post('/print-shift-report', (req, res) => {
    const { shift_id, start_time, cashier, starting_cash, total_rev, actual_cash, gap } = req.body;

    let t = `\x1b\x21\x10LAPORAN SHIFT KASIR\x1b\x21\x00\n`;
    t += `--------------------------------\n`;
    t += `SHIFT ID  : #${shift_id}\n`;
    t += `KASIR     : ${cashier}\n`;
    t += `MULAI     : ${new Date(start_time).toLocaleString()}\n`;
    t += `SELESAI   : ${new Date().toLocaleString()}\n`;
    t += `--------------------------------\n`;
    t += `MODAL AWAL:   Rp${starting_cash.toLocaleString().padStart(12)}\n`;
    t += `TOTAL SALES:  Rp${total_rev.toLocaleString().padStart(12)}\n`;
    t += `--------------------------------\n`;
    t += `ESTIMASI KAS: Rp${(starting_cash + total_rev).toLocaleString().padStart(12)}\n`;
    t += `UANG FISIK:   Rp${actual_cash.toLocaleString().padStart(12)}\n`;
    t += `--------------------------------\n`;
    t += `SELISIH:      Rp${gap.toLocaleString().padStart(12)}\n`;
    t += `--------------------------------\n\n`;
    t += `TANDA TANGAN KASIR,\n\n\n\n( ${cashier} )\n`;

    sendToDevice(PRINTERS.KASIR.ip, PRINTERS.KASIR.port, t, "LAPORAN_SHIFT");
    res.json({ success: true });
});

app.listen(4000, '0.0.0.0', () => console.log("✅ SERVER PRINTER READY @ PORT 4000"));