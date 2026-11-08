import type {
  Category,
  Customer,
  Employee,
  Order,
  Product,
  Purchase,
  StockMovement,
  Supplier,
} from "@/types";

export const mockCategories: Category[] = [
  { id: "cat_1", name: "Beverages", description: "Coffee, tea, soft drinks and water" },
  { id: "cat_2", name: "Snacks", description: "Chips, cookies and chocolates" },
  { id: "cat_3", name: "Bakery", description: "Fresh bread and pastries" },
  { id: "cat_4", name: "Dairy", description: "Milk, cheese and yogurt" },
  { id: "cat_5", name: "Household", description: "Cleaning and daily supplies" },
];

const p = (
  n: number,
  sku: string,
  name: string,
  categoryId: string,
  purchasePrice: number,
  sellingPrice: number,
  stock: number,
  minStock: number,
): Product => ({
  id: `prod_${n}`,
  sku,
  barcode: `88500${String(10000 + n)}`,
  name,
  description: `${name} - quality product`,
  categoryId,
  purchasePrice,
  sellingPrice,
  stock,
  minStock,
});

export const mockProducts: Product[] = [
  p(1, "BEV-001", "Iced Latte", "cat_1", 1.2, 3.5, 120, 20),
  p(2, "BEV-002", "Green Tea Bottle", "cat_1", 0.6, 1.8, 8, 15),
  p(3, "BEV-003", "Mineral Water 500ml", "cat_1", 0.2, 0.8, 300, 50),
  p(4, "BEV-004", "Cola Can", "cat_1", 0.4, 1.2, 0, 30),
  p(5, "SNK-001", "Potato Chips", "cat_2", 0.7, 1.9, 75, 20),
  p(6, "SNK-002", "Chocolate Bar", "cat_2", 0.8, 2.2, 60, 15),
  p(7, "SNK-003", "Butter Cookies", "cat_2", 1.1, 2.9, 12, 15),
  p(8, "BAK-001", "Croissant", "cat_3", 0.9, 2.5, 40, 10),
  p(9, "BAK-002", "Baguette", "cat_3", 0.6, 1.7, 25, 10),
  p(10, "BAK-003", "Blueberry Muffin", "cat_3", 1.0, 2.8, 18, 10),
  p(11, "DAI-001", "Fresh Milk 1L", "cat_4", 1.0, 2.1, 55, 20),
  p(12, "DAI-002", "Cheddar Cheese", "cat_4", 2.5, 5.4, 6, 10),
  p(13, "DAI-003", "Yogurt Cup", "cat_4", 0.5, 1.3, 90, 25),
  p(14, "HOU-001", "Dish Soap", "cat_5", 1.5, 3.2, 35, 10),
  p(15, "HOU-002", "Paper Towels", "cat_5", 1.8, 4.0, 28, 10),
  p(16, "HOU-003", "Laundry Detergent", "cat_5", 4.5, 9.5, 14, 8),
];

export const mockCustomers: Customer[] = [
  { id: "cus_1", name: "Walk-in Customer", createdAt: "2026-01-01T08:00:00Z" },
  { id: "cus_2", name: "Sokha Chan", email: "sokha@example.com", phone: "+855 12 345 678", address: "Phnom Penh", createdAt: "2026-02-10T09:30:00Z" },
  { id: "cus_3", name: "Dara Vann", email: "dara@example.com", phone: "+855 96 222 111", address: "Siem Reap", createdAt: "2026-03-05T11:00:00Z" },
  { id: "cus_4", name: "Srey Neang", email: "neang@example.com", phone: "+855 17 888 999", address: "Phnom Penh", createdAt: "2026-04-18T14:20:00Z" },
  { id: "cus_5", name: "Vuthy Kem", email: "vuthy@example.com", phone: "+855 70 555 444", address: "Battambang", createdAt: "2026-06-01T10:10:00Z" },
];

export const mockSuppliers: Supplier[] = [
  { id: "sup_1", name: "Fresh Foods Co.", contactPerson: "Mony Lim", email: "sales@freshfoods.example", phone: "+855 23 111 222", address: "Phnom Penh" },
  { id: "sup_2", name: "Angkor Beverages", contactPerson: "Rith Sao", email: "orders@angkorbev.example", phone: "+855 63 333 444", address: "Siem Reap" },
  { id: "sup_3", name: "HomeCare Supply", contactPerson: "Bopha Ly", email: "info@homecare.example", phone: "+855 23 777 888", address: "Phnom Penh" },
];

export const mockEmployees: Employee[] = [
  { id: "emp_1", name: "Sim Sintheng", email: "admin@pos.example", phone: "+855 12 000 001", role: "ADMIN", active: true, hiredAt: "2025-01-15T00:00:00Z" },
  { id: "emp_2", name: "Chenda Pich", email: "manager@pos.example", phone: "+855 12 000 002", role: "MANAGER", active: true, hiredAt: "2025-05-01T00:00:00Z" },
  { id: "emp_3", name: "Vanna Heng", email: "cashier@pos.example", phone: "+855 12 000 003", role: "CASHIER", active: true, hiredAt: "2025-09-20T00:00:00Z" },
];

const methods = ["CASH", "CARD", "QR"] as const;
const statuses = ["COMPLETED", "COMPLETED", "COMPLETED", "PENDING", "CANCELLED", "REFUNDED"] as const;

export const mockOrders: Order[] = Array.from({ length: 90 }, (_, i) => {
  const a = mockProducts[(i * 3) % mockProducts.length];
  const b = mockProducts[(i * 5 + 2) % mockProducts.length];
  const qa = (i % 3) + 1;
  const qb = (i % 2) + 1;
  const subtotal = +(a.sellingPrice * qa + b.sellingPrice * qb).toFixed(2);
  const discount = i % 7 === 0 ? +(subtotal * 0.1).toFixed(2) : 0;
  const tax = +((subtotal - discount) * 0.1).toFixed(2);
  const status = statuses[i % statuses.length];
  const date = new Date("2026-11-04T09:00:00Z");
  date.setHours(date.getHours() - i * 26);
  return {
    id: `ORD-${String(1001 + i)}`,
    customerId: mockCustomers[i % mockCustomers.length].id,
    cashierId: "emp_3",
    items: [
      { productId: a.id, name: a.name, price: a.sellingPrice, quantity: qa },
      { productId: b.id, name: b.name, price: b.sellingPrice, quantity: qb },
    ],
    subtotal,
    discount,
    tax,
    total: +(subtotal - discount + tax).toFixed(2),
    paymentMethod: methods[i % 3],
    paymentStatus: status === "REFUNDED" ? "REFUNDED" : status === "COMPLETED" ? "PAID" : "UNPAID",
    status,
    createdAt: date.toISOString(),
  };
});

export const mockStockMovements: StockMovement[] = mockProducts.slice(0, 10).map((prod, i) => ({
  id: `mov_${i + 1}`,
  productId: prod.id,
  type: (["IN", "OUT", "ADJUSTMENT", "SALE"] as const)[i % 4],
  quantity: (i + 1) * 5,
  note: i % 4 === 2 ? "Stock count correction" : undefined,
  createdAt: new Date(Date.UTC(2026, 10, 4 - (i % 5), 8, i * 5)).toISOString(),
}));

export const mockPurchases: Purchase[] = [
  { id: "PO-501", supplierId: "sup_1", items: [{ productId: "prod_8", quantity: 50, unitCost: 0.9 }], total: 45, status: "RECEIVED", createdAt: "2026-10-28T08:00:00Z" },
  { id: "PO-502", supplierId: "sup_2", items: [{ productId: "prod_2", quantity: 100, unitCost: 0.6 }, { productId: "prod_4", quantity: 120, unitCost: 0.4 }], total: 108, status: "ORDERED", createdAt: "2026-11-02T10:30:00Z" },
];
