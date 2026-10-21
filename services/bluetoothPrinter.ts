export async function testBluetoothPrint() {
  const response = await fetch(
    "http://localhost:9100/print",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: [
          {
            type: "text",
            text: "BINSARMA WINE AND LIQUOR",
            align: "center",
            bold: true,
            size: "large"
          },
          { type: "divider" },
          {
            type: "text",
            text: "TES BLUETOOTH DISBA POS",
            align: "center"
          },
          { type: "feed", lines: 3 }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Cleanter HTTP ${response.status}`);
  }

  return await response.json();
}