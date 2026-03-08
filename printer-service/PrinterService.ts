import net from 'node:net';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Fungsi ini sekarang menerima IP secara dinamis
const sendToDevice = (ip: string, port: number, text: string, label: string) => {
    if (!ip) {
        console.error(`❌ ${label} ERROR: IP Printer kosong/tidak disetting!`);
        return;
    }

    const client = new net.Socket();
    client.setTimeout(3000);
    client.connect(port, ip, () => {
        console.log(`[${new Date().toLocaleTimeString()}] 🖨️  PRINTING: ${label} ke IP ${ip}`);
        client.write(Buffer.from([0x1b, 0x40, 0x1b, 0x61, 0x01])); // Init & Center
        client.write(text);
        client.write(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00])); // Feed & Cut
        client.end();
    });
    client.on('error', (err) => console.error(`❌ ${label} ERROR ke ${ip}:`, err.message));
    client.on('timeout', () => { client.destroy(); });
};

// --- CANTIKKAN STRUK BILL ---
app.post('/print-receipt', (req, res) => {
    // MENERIMA TARGET IP DARI FRONTEND (REACT)
    const { target_ip, table_name, items_list, subtotal, discount_total, service_charge, tax_total, total, paid, change, cashier } = req.body;
    
    let t = `\x1b\x21\x10DISBA RESTO & CAFE\x1b\x21\x00\n`;
    t += `Jl. Utama No. 01, Kota Anda\n`;
    t += `--------------------------------\n`;
    t += `MEJA: ${table_name?.padEnd(10) || "TA"} KASIR: ${cashier}\n`;
    t += `TGL : ${new Date().toLocaleString()}\n`;
    t += `--------------------------------\n`;
    
    if (items_list && items_list.length > 0) {
        items_list.forEach((i: any) => {
            t += `\x1b\x61\x00${i.name}\n`; // Align Left
            t += `${i.qty} x ${i.price.toLocaleString().padEnd(10)}  Rp${(i.qty * i.price).toLocaleString().padStart(10)}\n`;
        });
    }

    t += `--------------------------------\n`;
    t += `SUBTOTAL:       Rp${(subtotal || 0).toLocaleString().padStart(10)}\n`;
    if(discount_total > 0) t += `DISCOUNT:      -Rp${discount_total.toLocaleString().padStart(10)}\n`;
    t += `SERVICE(5%):    Rp${(service_charge || 0).toLocaleString().padStart(10)}\n`;
    t += `PB1 (10%):      Rp${(tax_total || 0).toLocaleString().padStart(10)}\n`;
    t += `================================\n`;
    t += `\x1b\x21\x10TOTAL: Rp${(total || 0).toLocaleString()}\x1b\x21\x00\n`;
    t += `--------------------------------\n`;
    t += `BAYAR :         Rp${(paid || 0).toLocaleString().padStart(10)}\n`;
    t += `KEMBALI:        Rp${(change || 0).toLocaleString().padStart(10)}\n`;
    t += `--------------------------------\n`;
    t += `\x1b\x61\x01TERIMA KASIH\nSEMOGA HARI ANDA MENYENANGKAN!\n`; // Center
    
    // Kirim ke IP yang dikirim oleh Frontend
    sendToDevice(target_ip, 9100, t, "STRUK_KASIR");
    res.json({ success: true, message: "Mencetak ke LAN..." });
});

// Endpoint untuk Dapur dan Shift bisa menyesuaikan dengan pola di atas (tambahkan target_ip)

app.listen(4000, '0.0.0.0', () => console.log("✅ SERVER PRINTER READY @ PORT 4000"));