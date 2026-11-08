import { createCrudService } from "./crud-service";
import {
  mockCategories,
  mockCustomers,
  mockEmployees,
  mockOrders,
  mockProducts,
  mockPurchases,
  mockStockMovements,
  mockSuppliers,
} from "@/lib/mock-data";
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

export const productService = createCrudService<Product>("products", mockProducts, "prod");
export const categoryService = createCrudService<Category>("categories", mockCategories, "cat");
export const customerService = createCrudService<Customer>("customers", mockCustomers, "cus");
export const supplierService = createCrudService<Supplier>("suppliers", mockSuppliers, "sup");
export const employeeService = createCrudService<Employee>("employees", mockEmployees, "emp");
export const orderService = createCrudService<Order>("orders", mockOrders, "ORD");
export const purchaseService = createCrudService<Purchase>("purchases", mockPurchases, "PO");
export const stockMovementService = createCrudService<StockMovement>(
  "stock-movements",
  mockStockMovements,
  "mov",
);
