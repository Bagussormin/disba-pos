type Props = {
  receiptNo: string;
  items: any[];
  total: number;
  paid: number;
};

export default function Receipt({
  receiptNo,
  items,
  total,
  paid,
}: Props) {
  return (
    <div style={{ marginTop: 20 }}>
      <h4>STRUK</h4>
      <p>No: {receiptNo}</p>
      {items.map((i, idx) => (
        <div key={idx}>
          {i.name} x{i.qty}
        </div>
      ))}
      <p>Total: {total}</p>
      <p>Bayar: {paid}</p>
      <p>Kembali: {paid - total}</p>
    </div>
  );
}
