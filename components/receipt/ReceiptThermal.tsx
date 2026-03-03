import React from "react";

interface Props {
  data: any;
}

export const ReceiptThermal = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  if (!data) return null;

  const now = new Date();
  const subtotal = data.items?.reduce((sum: number, item: any) => sum + item.qty * item.price, 0) || 0;
  const pb1 = Math.round(subtotal * 0.1);
  const service = Math.round(subtotal * 0.07); // Service charge 7% sesuai standar restobar
  const grandTotal = subtotal + pb1 + service - (data.discount || 0);

  return (
    <div ref={ref} className="bg-white text-black p-[2mm] w-[58mm] font-mono text-[10px] leading-tight">
      <div className="text-center mb-2">
        <b className="text-[12px]">NES RESTOBAR</b>
        <p className="text-[8px]">PREMIUM POOL & LOUNGE</p>
        <p className="text-[8px]">--------------------------------</p>
      </div>

      <div className="text-[9px] uppercase">
        <div className="flex justify-between"><span>No: {data.receipt_no}</span></div>
        <div className="flex justify-between"><span>Meja: {data.table_name || "-"}</span></div>
        <div className="flex justify-between"><span>Kasir: {data.cashier || "Staff"}</span></div>
        <div className="flex justify-between"><span>{now.toLocaleDateString()} {now.toLocaleTimeString()}</span></div>
      </div>

      <p className="text-center">--------------------------------</p>

      <div className="space-y-1">
        {data.items?.map((item: any, i: number) => (
          <div key={i} className="flex flex-col">
            <span className="uppercase">{item.name}</span>
            <div className="flex justify-between pl-2">
              <span>{item.qty} x {item.price.toLocaleString()}</span>
              <span>{(item.qty * item.price).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center">--------------------------------</p>

      <div className="space-y-1 font-bold">
        <div className="flex justify-between">
          <span>SUBTOTAL</span>
          <span>{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>SERVICE (7%)</span>
          <span>{service.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>PB1 (10%)</span>
          <span>{pb1.toLocaleString()}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between">
            <span>DISKON</span>
            <span>-{data.discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-[12px] border-t border-black pt-1">
          <span>TOTAL</span>
          <span>{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-6 uppercase text-[8px]">
        <p>Terima Kasih</p>
        <p>Follow IG: @nes.restobar</p>
        <div className="h-10"></div> {/* Spasi sobekan kertas */}
      </div>
    </div>
  );
});