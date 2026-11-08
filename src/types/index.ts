export type Role = "ADMIN" | "MANAGER" | "CASHIER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  active: boolean;
  hiredAt: string;
}

export type PaymentMethod = "CASH" | "CARD" | "QR";
export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PAID" | "UNPAID" | "REFUNDED";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId?: string;
  cashierId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
}

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "SALE";

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  note?: string;
  createdAt: string;
}

export type PurchaseStatus = "ORDERED" | "RECEIVED" | "CANCELLED";

export interface PurchaseItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  total: number;
  status: PurchaseStatus;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
