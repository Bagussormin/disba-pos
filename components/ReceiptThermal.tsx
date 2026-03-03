type Props = {
  transaction: any;
  onClose: () => void;
};


export default function ReceiptThermal({ data }: any) {
  
  return (
    <>
      <style>
        {`
          @media print {
            /* Sembunyikan semua elemen di layar kecuali struk ini */
            body * { visibility: hidden; }
            #thermal-receipt, #thermal-receipt * { visibility: visible; }
            #thermal-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 58mm; /* Sesuaikan dengan lebar kertas thermal */
            }
          }
        `}
      </style>

      <div id="thermal-receipt" className="p-4 bg-white text-black font-mono text-[12px] w-[58mm]">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">NES House Cold Brew</h2>
          <p>Terima Kasih Telah Berkunjung</p>
          <p>--------------------------------</p>
        </div>

        <div className="space-y-1">
          {data?.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>{item.qty}x {item.menus?.name || 'Item'}</span>
              <span>{(item.qty * item.price).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-black pt-2 font-bold">
          <div className="flex justify-between text-lg">
            <span>TOTAL</span>
            <span>Rp {data?.total?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
}