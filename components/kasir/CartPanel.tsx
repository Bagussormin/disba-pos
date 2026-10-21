import React, { useState } from 'react';
import { executePrint } from '../../lib/printer';
import { supabase } from '../../lib/supabase';
import { testBluetoothPrint } from '../../services/bluetoothPrinter';

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
  // DATA STRUK
  const [customerName, setCustomerName] = useState('');
  const [tableNo, setTableNo] = useState('');
  const [cashAmount, setCashAmount] = useState(0);

  // DISKON DAN PIN ADMIN
  const [discount, setDiscount] = useState(0);
  const [tempDiscount, setTempDiscount] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  // STATUS TES BLUETOOTH
  const [testingBluetooth, setTestingBluetooth] = useState(false);

  const getAdminPin = async (): Promise<string | null> => {
    const tenantId = localStorage.getItem('tenant_id');

    if (!tenantId) return null;

    const { data, error } = await supabase
      .from('users')
      .select('pin')
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .single();

    if (error) {
      console.error('Error fetching admin PIN:', error.message);
    }

    return data?.pin || null;
  };

  // VERIFIKASI PIN ADMIN
  const handleVerifyPin = async () => {
    setAdminPinError(null);

    try {
      const adminPin = await getAdminPin();

      if (adminPin !== null && enteredPin === adminPin) {
        setDiscount(tempDiscount);
        setShowPinModal(false);
        setEnteredPin('');
        alert('Diskon berhasil diterapkan!');
      } else {
        setAdminPinError('PIN admin salah atau tidak tersedia.');
        setEnteredPin('');
      }
    } catch (error) {
      console.error('Verifikasi PIN gagal:', error);
      setAdminPinError('Gagal memverifikasi PIN. Silakan coba lagi.');
    }
  };

  // TES CETAK BLUETOOTH MELALUI CLEANTER
  const handleTestBluetooth = async () => {
    if (testingBluetooth) return;

    setTestingBluetooth(true);

    try {
      const result = await testBluetoothPrint();
      console.log('Hasil tes Bluetooth:', result);
      alert(
        'Permintaan tes Bluetooth telah dikirim. Periksa apakah printer mengeluarkan kertas.'
      );
    } catch (error) {
      console.error('Tes Bluetooth gagal:', error);

      const message =
        error instanceof Error ? error.message : 'Kesalahan tidak diketahui';

      alert(`Tes Bluetooth gagal: ${message}`);
    } finally {
      setTestingBluetooth(false);
    }
  };

  // CETAK STRUK MELALUI JALUR LAMA (LAN)
  const handleCetak = async () => {
    const pb1 = Math.round(subtotal * 0.1);
    const grandTotal = subtotal - discount + pb1;

    if (cashAmount > 0 && cashAmount < grandTotal) {
      alert('Uang pembayaran kurang.');
      return;
    }

    const payload = {
      items: cartItems,
      total: grandTotal,
      subtotal,
      cashier: 'kasir',
      customer_name: customerName || '-',
      table_name: tableNo || '-',
      discount,
      paid: cashAmount || grandTotal,
      change: cashAmount > 0 ? cashAmount - grandTotal : 0,
      pb1,
    };

    try {
      await executePrint(payload);
    } catch (error) {
      console.error('Cetak LAN gagal:', error);
      alert('Gagal mengirim permintaan cetak melalui jalur LAN.');
    }
  };

  const grandTotal = subtotal - discount + Math.round(subtotal * 0.1);

  return (
    <div className="flex flex-col h-full bg-white text-black p-4 relative">
      <h2 className="font-bold text-xl mb-4 border-b pb-2">
        Keranjang Kasir
      </h2>

      {/* DAFTAR MENU */}
      <div className="flex-1 overflow-y-auto mb-4">
        {cartItems.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="flex justify-between py-1 border-b text-sm"
          >
            <span>
              {item.name} x{item.qty}
            </span>
            <span>
              Rp {(item.price * item.qty).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>

      {/* DATA PELANGGAN DAN PEMBAYARAN */}
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

        {/* DISKON */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-gray-500">
              Diskon (Rp)
            </label>
            <input
              type="number"
              min="0"
              className={`w-full p-2 border rounded text-sm ${
                discount > 0
                  ? 'bg-green-100 border-green-500'
                  : 'bg-white'
              }`}
              value={tempDiscount}
              onChange={(e) =>
                setTempDiscount(Math.max(0, Number(e.target.value)))
              }
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setEnteredPin('');
              setAdminPinError(null);
              setShowPinModal(true);
            }}
            className="bg-orange-500 text-white px-3 py-2 rounded text-[10px] font-bold h-[38px]"
          >
            APPROVE PIN
          </button>
        </div>

        <input
          type="number"
          min="0"
          placeholder="Uang Tunai (Bayar)"
          className="w-full p-2 border-2 border-blue-400 rounded text-sm font-bold"
          value={cashAmount}
          onChange={(e) =>
            setCashAmount(Math.max(0, Number(e.target.value)))
          }
        />
      </div>

      {/* RINGKASAN TOTAL */}
      <div className="border-t pt-2 mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>Rp {subtotal.toLocaleString('id-ID')}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-red-500 font-bold">
            <span>Diskon</span>
            <span>-Rp {discount.toLocaleString('id-ID')}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>PB1 (10%)</span>
          <span>
            Rp {Math.round(subtotal * 0.1).toLocaleString('id-ID')}
          </span>
        </div>

        <div className="flex justify-between text-blue-600 font-bold text-lg">
          <span>Total</span>
          <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
        </div>

        {cashAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Kembalian</span>
            <span>
              Rp {Math.max(0, cashAmount - grandTotal).toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>

      {/* TOMBOL TES BLUETOOTH - TERPISAH DARI LAN */}
      <button
        type="button"
        onClick={handleTestBluetooth}
        disabled={testingBluetooth}
        className="w-full bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl mb-2"
      >
        {testingBluetooth
          ? 'MENGUJI BLUETOOTH...'
          : 'TES CETAK BLUETOOTH'}
      </button>

      {/* CETAK STRUK LAMA - TETAP MENGGUNAKAN executePrint */}
      <button
        type="button"
        onClick={handleCetak}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg"
      >
        CETAK STRUK
      </button>

      {/* MODAL PIN ADMIN */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-center font-bold text-lg mb-4 text-black">
              PERSETUJUAN ADMIN
            </h3>

            <p className="text-center text-xs mb-4 text-gray-500">
              Konfirmasi Diskon: Rp {tempDiscount.toLocaleString('id-ID')}
            </p>

            <input
              type="password"
              className="w-full p-3 border-2 border-orange-500 rounded-xl text-center text-2xl mb-4 bg-white text-black"
              placeholder="PIN"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              autoFocus
            />

            {adminPinError && (
              <p className="text-red-600 text-sm text-center mb-3">
                {adminPinError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setEnteredPin('');
                  setAdminPinError(null);
                }}
                className="flex-1 p-3 bg-gray-200 rounded-xl text-black font-bold"
              >
                BATAL
              </button>

              <button
                type="button"
                onClick={handleVerifyPin}
                className="flex-1 p-3 bg-orange-500 text-white rounded-xl font-bold"
              >
                KONFIRMASI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel;