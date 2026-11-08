import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  ClipboardList,
  Users,
  Truck,
  ShoppingBag,
  UserCog,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
}

const ALL: Role[] = ["ADMIN", "MANAGER", "CASHIER"];
const STAFF: Role[] = ["ADMIN", "MANAGER"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: STAFF },
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ALL },
  { label: "Products", href: "/products", icon: Package, roles: STAFF },
  { label: "Categories", href: "/categories", icon: Tags, roles: STAFF },
  { label: "Inventory", href: "/inventory", icon: Warehouse, roles: STAFF },
  { label: "Orders", href: "/orders", icon: ClipboardList, roles: ALL },
  { label: "Customers", href: "/customers", icon: Users, roles: ALL },
  { label: "Suppliers", href: "/suppliers", icon: Truck, roles: STAFF },
  { label: "Purchases", href: "/purchases", icon: ShoppingBag, roles: STAFF },
  { label: "Employees", href: "/employees", icon: UserCog, roles: ["ADMIN"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: STAFF },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN", "MANAGER"] },
];
