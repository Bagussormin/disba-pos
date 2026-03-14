export default function BarTicket({
  meja,
  tamu,
  items,
  waiter = "Staff", // Default ke "Staff" jika kosong
}: any) {
  const drinkItems = items?.filter(
    (i: any) => i.category === "minuman"
  ) || [];

  // 🔥 MENGAMBIL NAMA OUTLET SECARA DINAMIS
  const tenantName = typeof window !== "undefined" ? localStorage.getItem("tenant_name") || "STORE" : "STORE";

  if (drinkItems.length === 0) return null;

  return (
    <div
      id="bar-ticket"
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
        <b style={{ fontSize: "16px" }}>BAR ORDER</b>
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

      {drinkItems.map((i: any, idx: number) => (
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