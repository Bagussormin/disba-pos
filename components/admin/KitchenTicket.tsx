type Props = {
  meja: number | string;
  tamu: string;
  items: any[];
  waiter?: string; // Tanda tanya agar tidak wajib diisi
};

export default function KitchenTicket({
  meja,
  tamu,
  items,
  waiter = "Staff", // Default ke "Staff"
}: Props) {
  const foodItems = items?.filter(
    (i) => i.category !== "minuman"
  ) || [];

  // 🔥 MENGAMBIL NAMA OUTLET SECARA DINAMIS
  const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "STORE" : "STORE";

  if (foodItems.length === 0) return null;

  return (
    <div
      id="kitchen-ticket"
      style={{
        width: "58mm",
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#000",
        backgroundColor: "#fff",
        padding: "5px"
      }}
    >
      <center>
        <b style={{ fontSize: "16px" }}>KITCHEN ORDER</b>
        <br />
        ==========================
      </center>

      <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: "5px" }}>
        MEJA : {meja}
      </div>
      <div>TAMU : {tamu}</div>
      <div>WAITER : {waiter}</div>
      <div>
        JAM  : {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </div>

      <div style={{ borderTop: "1px dashed #000", marginTop: "5px", marginBottom: "5px" }}></div>

      {foodItems.map((i, idx) => (
        <div key={idx} style={{ marginBottom: "4px" }}>
          <div style={{ fontWeight: "bold" }}>
            {i.qty}x {i.name}
          </div>
          {i.note && (
            <div style={{ marginLeft: "10px", fontStyle: "italic" }}>
              * {i.note}
            </div>
          )}
        </div>
      ))}

      <div style={{ borderTop: "1px dashed #000", marginTop: "5px" }}></div>
      <center style={{ fontSize: "10px", marginTop: "5px", fontWeight: "bold" }}>
        {tenantName.toUpperCase()}
      </center>
    </div>
  );
}