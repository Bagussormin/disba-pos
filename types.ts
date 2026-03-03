
export type Role = 'kasir' | 'admin' | 'manager';

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
}

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

export interface CartItem extends Product {
  quantity: number;
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

export type View = 'login' | 'pos' | 'backoffice';
export type BackofficeTab = 'dashboard' | 'reports' | 'catalog' | 'inventory' | 'sales' | 'categories' | 'ai' | 'tables' | 'settings';
