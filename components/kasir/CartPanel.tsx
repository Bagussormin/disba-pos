import React, { useState } from 'react';
import { printReceipt } from '../../lib/PrinterService';

interface CartItem {
  name: string;
  price: number;
  qty: number;
}

interface Props {
  cartItems: CartItem[];
  subtotal: number;
}

const CartPanel: React.FC<Props> = ({ cartItems, subtotal }) => {
  // 1. STATE UNTUK DATA STRUK
  const [customerName, setCustomerName] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [cashAmount, setCashAmount] = useState(0);

  // 2. STATE UNTUK DISKON & PIN
  const [discount, setDiscount] = useState(0); // Diskon Fix
  const [tempDiscount, setTempDiscount] = useState(0); // Input sementara
  const [showPinModal, setShowPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  
  const CORRECT_PIN = "1234"; // PIN ADMIN NES CAFE

  // 3. FUNGSI VERIFIKASI PIN
  const handleVerifyPin = () => {
    if (adminPin === CORRECT_PIN) {
      setDiscount(tempDiscount);
      setShowPinModal(false);
      setAdminPin("");
      alert("Diskon Berhasil Diterapkan!");
    } else {
      alert("PIN Admin Salah!");
      setAdminPin("");
    }
  };

  // 4. FUNGSI CETAK (Sesuai Log: customer_name, table_name, paid, change)
  const handleCetak = async () => {
    const pb1 = Math.round(subtotal * 0.1);
    const grandTotal = subtotal - discount + pb1;

    const payload = {
      items: cartItems,
      total: subtotal,
      cashier: "kasir",
      customer_name: customerName || "-",
      table_name: tableNo || "-",
      discount: discount,
      paid: cashAmount || grandTotal,
      change: cashAmount ? (cashAmount - grandTotal) : 0,
      pb1: pb1
    };

    try {
      await printReceipt(payload);
    } catch (error) {
      alert("Gagal konek ke printer!");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-black p-4 relative">
      <h2 className="font-bold text-xl mb-4 border-b pb-2">Keranjang Kasir</h2>

      {/* LIST MENU */}
      <div className="flex-1 overflow-y-auto mb-4">
        {cartItems.map((item, idx) => (
          <div key={idx} className="flex justify-between py-1 border-b text-sm">
            <span>{item.name} x{item.qty}</span>
            <span>Rp {(item.price * item.qty).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* INPUT DATA */}
      <div className="bg-gray-100 p-3 rounded-xl space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <input 
            placeholder="Nama Pelanggan" 
            className="p-2 border rounded text-sm bg-white"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input 
            placeholder="No. Meja" 
            className="p-2 border rounded text-sm bg-white"
            value={tableNo}
            onChange={(e) => setTableNo(e.target.value)}
          />
        </div>

        {/* INPUT DISKON */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400">Diskon (Rp)</label>
            <input 
              type="number" 
              className={`w-full p-2 border rounded text-sm ${discount > 0 ? 'bg-green-100 border-green-500' : 'bg-white'}`}
              value={tempDiscount}
              onChange={(e) => setTempDiscount(Number(e.target.value))}
            />
          </div>
          <button 
            onClick={() => setShowPinModal(true)}
            className="bg-orange-500 text-white px-3 py-2 rounded text-[10px] font-bold h-[38px]"
          >
            APPROVE PIN
          </button>
        </div>

        <input 
          type="number" 
          placeholder="Uang Tunai (Bayar)" 
          className="w-full p-2 border-2 border-blue-400 rounded text-sm font-bold"
          value={cashAmount}
          onChange={(e) => setCashAmount(Number(e.target.value))}
        />
      </div>

      {/* TOTALAN */}
      <div className="border-t pt-2 mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>Rp {subtotal.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-red-500 font-bold">
            <span>Diskon</span>
            <span>-Rp {discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-blue-600 font-bold text-lg">
          <span>Total + PB1</span>
          <span>Rp {(subtotal - discount + Math.round(subtotal * 0.1)).toLocaleString()}</span>
        </div>
      </div>

      <button 
        onClick={handleCetak}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg"
      >
        CETAK STRUK
      </button>

      {/* --- MODAL PIN ADMIN --- */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-center font-bold text-lg mb-4 text-black">PERSETUJUAN ADMIN</h3>
            <p className="text-center text-xs mb-4 text-gray-500">Konfirmasi Diskon: Rp {tempDiscount.toLocaleString()}</p>
            <input 
              type="password" 
              className="w-full p-3 border-2 border-orange-500 rounded-xl text-center text-2xl mb-4 bg-white text-black"
              placeholder="PIN"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowPinModal(false)} className="flex-1 p-3 bg-gray-200 rounded-xl text-black font-bold">BATAL</button>
              <button onClick={handleVerifyPin} className="flex-1 p-3 bg-orange-500 text-white rounded-xl font-bold">KONFIRMASI</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel;