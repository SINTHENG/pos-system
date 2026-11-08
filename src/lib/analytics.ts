import type { Category, Order, Product } from "@/types";

const day = (iso: string) => iso.slice(0, 10);

export function completed(orders: Order[]) {
  return orders.filter((o) => o.status === "COMPLETED");
}

export function revenueTotal(orders: Order[]) {
  return completed(orders).reduce((s, o) => s + o.total, 0);
}

export function dailySales(orders: Order[], days = 7) {
  const map = new Map<string, number>();
  completed(orders).forEach((o) => map.set(day(o.createdAt), (map.get(day(o.createdAt)) ?? 0) + o.total));
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-days)
    .map(([date, total]) => ({ date: date.slice(5), total: +total.toFixed(2) }));
}

export function monthlyRevenue(orders: Order[]) {
  const map = new Map<string, number>();
  completed(orders).forEach((o) => {
    const m = o.createdAt.slice(0, 7);
    map.set(m, (map.get(m) ?? 0) + o.total);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, revenue]) => ({ month, revenue: +revenue.toFixed(2) }));
}

export function productSales(orders: Order[]) {
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  completed(orders).forEach((o) =>
    o.items.forEach((i) => {
      const cur = map.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += i.quantity * i.price;
      map.set(i.productId, cur);
    }),
  );
  return [...map.entries()]
    .map(([productId, v]) => ({ productId, ...v, revenue: +v.revenue.toFixed(2) }))
    .sort((a, b) => b.qty - a.qty);
}

export function salesByCategory(orders: Order[], products: Product[], categories: Category[]) {
  const catOf = new Map(products.map((p) => [p.id, p.categoryId]));
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const map = new Map<string, number>();
  completed(orders).forEach((o) =>
    o.items.forEach((i) => {
      const name = names.get(catOf.get(i.productId) ?? "") ?? "Other";
      map.set(name, (map.get(name) ?? 0) + i.price * i.quantity);
    }),
  );
  return [...map.entries()].map(([name, value]) => ({ name, value: +value.toFixed(2) }));
}

export function paymentBreakdown(orders: Order[]) {
  const map = new Map<string, { count: number; total: number }>();
  completed(orders).forEach((o) => {
    const cur = map.get(o.paymentMethod) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += o.total;
    map.set(o.paymentMethod, cur);
  });
  return [...map.entries()].map(([method, v]) => ({ method, count: v.count, total: +v.total.toFixed(2) }));
}

export function stockStatus(p: Product): "OUT" | "LOW" | "OK" {
  if (p.stock <= 0) return "OUT";
  if (p.stock <= p.minStock) return "LOW";
  return "OK";
}
