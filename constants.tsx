
import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', productCode: 'SKU-001', name: 'Nasi Goreng Special', costPrice: 20000, price: 35000, category: 'Food', image: 'https://picsum.photos/seed/food1/300/300', stock: 50 },
  { id: '2', productCode: 'SKU-002', name: 'Es Teh Manis', costPrice: 3000, price: 8000, category: 'Drinks', image: 'https://picsum.photos/seed/drink1/300/300', stock: 100 },
  { id: '3', productCode: 'SKU-003', name: 'Ayam Bakar Madu', costPrice: 25000, price: 42000, category: 'Food', image: 'https://picsum.photos/seed/food2/300/300', stock: 30 },
  { id: '4', productCode: 'SKU-004', name: 'Coffee Latte', costPrice: 15000, price: 28000, category: 'Drinks', image: 'https://picsum.photos/seed/drink2/300/300', stock: 45 },
  { id: '5', productCode: 'SKU-005', name: 'Brownies Melt', costPrice: 12000, price: 22000, category: 'Dessert', image: 'https://picsum.photos/seed/dessert1/300/300', stock: 20 },
  { id: '6', productCode: 'SKU-006', name: 'Kentang Goreng', costPrice: 8000, price: 18000, category: 'Snacks', image: 'https://picsum.photos/seed/snack1/300/300', stock: 60 },
  { id: '7', productCode: 'SKU-007', name: 'Sate Ayam (10 Tusuk)', costPrice: 18000, price: 30000, category: 'Food', image: 'https://picsum.photos/seed/food3/300/300', stock: 25 },
  { id: '8', productCode: 'SKU-008', name: 'Matcha Green Tea', costPrice: 14000, price: 25000, category: 'Drinks', image: 'https://picsum.photos/seed/drink3/300/300', stock: 40 },
  { id: '9', productCode: 'SKU-009', name: 'Tiramisu Cake', costPrice: 20000, price: 35000, category: 'Dessert', image: 'https://picsum.photos/seed/dessert2/300/300', stock: 15 },
  { id: '10', productCode: 'SKU-010', name: 'Roti Bakar Cokelat', costPrice: 7000, price: 15000, category: 'Snacks', image: 'https://picsum.photos/seed/snack2/300/300', stock: 55 },
];

export const CATEGORIES: string[] = ['All', 'Food', 'Drinks', 'Dessert', 'Snacks'];
