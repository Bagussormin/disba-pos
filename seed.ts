import { createClient } from "@supabase/supabase-js";

// ganti dengan URL & KEY Supabase-mu
const supabaseUrl = "https://YOUR_SUPABASE_URL.supabase.co";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  try {
    // 1️⃣ Reset tables (opsional, hati-hati)
    await supabase.from("order_items").delete().neq("id", 0);
    await supabase.from("open_bills").delete().neq("id", 0);
    await supabase.from("tables").delete().neq("id", 0);
    await supabase.from("menus").delete().neq("id", 0);

    // 2️⃣ Insert tables
    await supabase.from("tables").insert([
      { id: 1, name: "Meja 1", status: "empty" },
      { id: 2, name: "Meja 2", status: "empty" },
      { id: 3, name: "Meja 3", status: "empty" },
      { id: 4, name: "Meja 4", status: "empty" },
    ]);

    // 3️⃣ Insert menus
    await supabase.from("menus").insert([
      { id: 1, name: "Nasi Goreng", price: 15000, category: "Makanan" },
      { id: 2, name: "Mie Goreng", price: 12000, category: "Makanan" },
      { id: 3, name: "Kopi Hitam", price: 8000, category: "Minuman" },
      { id: 4, name: "Es Teh", price: 5000, category: "Minuman" },
    ]);

    // 4️⃣ Insert open bills
    await supabase.from("open_bills").insert([
      { id: 1, table_id: 1, status: "open" },
      { id: 2, table_id: 2, status: "open" },
    ]);

    // 5️⃣ Insert order items
    await supabase.from("order_items").insert([
      { open_bill_id: 1, name: "Nasi Goreng", category: "Makanan", qty: 2 },
      { open_bill_id: 1, name: "Es Teh", category: "Minuman", qty: 2 },
      { open_bill_id: 2, name: "Kopi Hitam", category: "Minuman", qty: 1 },
      { open_bill_id: 2, name: "Mie Goreng", category: "Makanan", qty: 1 },
    ]);

    console.log("✅ Seed data berhasil dibuat!");
  } catch (err) {
    console.error("❌ Seed gagal:", err);
  }
}

seed();
