
export type Role = 'kasir' | 'admin' | 'manager' | 'waiter' | 'kitchen';

export interface UserAccount {
  id: string;
  name: string;
  role: Role;
  username: string;
  password: string;
}

export interface Table {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'square' | 'circle';
  status: 'available' | 'occupied' | 'reserved';
  capacity: number;
  currentOrderId?: string;
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  startTime: number;
  endTime?: number;
  startCash: number;
  actualCash?: number;
  expectedCash?: number;
  totalSales: number;
  status: 'open' | 'closed';
}

// --- MODIFIER SYSTEM ---
export interface ModifierOption {
  id: string;
  name: string;
  price_adjustment: number; // e.g. +2000, -1000, 0
}

export interface ModifierGroup {
  id: string;
  tenant_id: string;
  name: string;           // e.g. "Level Pedas", "Topping", "Suhu"
  is_required: boolean;
  is_multiple: boolean;   // allow picking multiple options
  options: ModifierOption[];
}

// --- MENU & PRODUCT ---
export interface Product {
  id: string;
  productCode: string;
  name: string;
  costPrice: number;
  price: number;
  category: string;
  image: string;
  stock: number;
  isPackage?: boolean;
  packageItems?: { productId: string; quantity: number }[];
  modifier_groups?: ModifierGroup[]; // Linked modifier groups
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_price: number;
  created_at?: string;
}

export interface MenuItem {
  id: number | null;
  name: string;
  price: number;
  category: string;
  image_url: string;
  hpp?: number;
  tenant_id?: string;
}

export interface SelectedModifier {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_adjustment: number;
}

export interface CartItem extends Product {
  quantity: number;
  modifiers?: SelectedModifier[];       // Selected modifier options
  note?: string;                        // Special request / catatan pesanan
  total_price?: number;                 // price + sum of modifier adjustments
}

// --- CUSTOMER / CRM ---
export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  total_spent: number;
  visit_count: number;
  created_at: string;
  last_visit?: string;
}

// --- ORDER ---
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  prevStock: number;
  newStock: number;
  note: string;
  timestamp: number;
  userName: string;
}

export interface Order {
  id: string;
  shiftId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  profit: number;
  paymentMethod: 'Cash' | 'Card' | 'QRIS';
  timestamp: number;
  status: 'completed' | 'cancelled' | 'voided';
  orderType: 'Dine-in' | 'Take-away';
  tableId?: string;
  customerName?: string;
  // --- New Fields ---
  customerId?: string;              // Linked CRM customer
  isSplit?: boolean;                // This order is a split from another
  parentOrderId?: string;           // Original order before split
  splitGroupId?: string;            // Groups split orders together
}

export interface ShiftSummary {
  startTime: number;
  endTime: number;
  totalSales: number;
  totalProfit: number;
  completedCount: number;
  cancelledCount: number;
  cashTotal: number;
  merchantTotal: number;
}

// --- TENANT FISCAL SETTINGS (dynamic per tenant) ---
export interface FiscalSettings {
  tax_rate: number;         // e.g. 0.10 = 10%
  service_charge: number;   // e.g. 0.05 = 5%
  use_service_charge: boolean;
  use_tax: boolean;
  loyalty_point_rate: number; // e.g. 1000 = Rp1000 spent = 1 point
}

// --- VIEWS ---
export type View = 'login' | 'pos' | 'backoffice';
export type BackofficeTab = 'dashboard' | 'reports' | 'catalog' | 'inventory' | 'sales' | 'categories' | 'ai' | 'tables' | 'settings';
