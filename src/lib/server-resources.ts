import { getSupabaseServerClient } from "@/lib/supabase";
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

/** Allowed REST resources -> seed data used when the Supabase table is empty. */
export const RESOURCES: Record<string, { seed: { id: string }[] }> = {
  categories: { seed: mockCategories },
  products: { seed: mockProducts },
  customers: { seed: mockCustomers },
  suppliers: { seed: mockSuppliers },
  employees: { seed: mockEmployees },
  orders: { seed: mockOrders },
  purchases: { seed: mockPurchases },
  "stock-movements": { seed: mockStockMovements },
};

const TABLE_MAP: Record<string, string> = {
  "stock-movements": "stock_movements",
};

export function getTableName(resource: string): string {
  return TABLE_MAP[resource] ?? resource;
}

export const ORDER_COLUMNS: Record<string, string> = {
  orders: "createdAt",
  "stock-movements": "createdAt",
  customers: "createdAt",
  purchases: "createdAt",
};

const seeded = new Set<string>();

export async function ensureResourceSeeded(resource: string) {
  if (process.env.SUPABASE_SEED === "false") return;
  if (seeded.has(resource)) return;

  const def = RESOURCES[resource];
  if (!def) return;

  try {
    const supabase = getSupabaseServerClient();
    const table = getTableName(resource);

    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.warn(`Could not verify table "${table}":`, error.message);
      return;
    }

    if (count === 0 && def.seed.length > 0) {
      // Ensure all objects in the batch have matching keys for PostgREST
      const allKeys = Array.from(new Set(def.seed.flatMap((item) => Object.keys(item))));
      const normalizedSeed = def.seed.map((item) => {
        const row: Record<string, unknown> = {};
        for (const k of allKeys) {
          row[k] = (item as Record<string, unknown>)[k] ?? null;
        }
        return row;
      });

      const { error: insertError } = await supabase.from(table).insert(normalizedSeed);
      if (insertError) {
        console.warn(`Could not seed table "${table}":`, insertError.message);
      }
    }
    seeded.add(resource);
  } catch (err) {
    console.warn(`Failed seeding check for resource "${resource}":`, err);
  }
}

/** Clean document helper (returns the doc; retained for compatibility) */
export function clean<T extends Record<string, unknown>>(doc: T | null): T | null {
  if (!doc) return doc;
  return doc;
}
