/**
 * Continuous Order Numbering System
 *
 * Requirements:
 * - Single global sequence shared across all staff members and shifts.
 * - Order numbers never reset when staff changes shifts.
 * - Never generate duplicate numbers.
 * - Cancelled orders do NOT cause numbers to be reused.
 * - Formatted as: Order #001, Order #002, ...
 */

export function parseOrderSequence(order: {
  id?: string;
  orderNumber?: string;
  sequenceNumber?: number;
}): number {
  if (typeof order.sequenceNumber === "number" && !isNaN(order.sequenceNumber)) {
    return order.sequenceNumber;
  }

  if (order.orderNumber) {
    const match = order.orderNumber.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return num;
    }
  }

  if (order.id) {
    const match = order.id.match(/(?:ORD[-_]?)?(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return num;
    }
  }

  return 0;
}

export function getNextOrderSequence(
  existingOrders: { id?: string; orderNumber?: string; sequenceNumber?: number }[]
): {
  nextSequence: number;
  orderNumber: string;
  id: string;
} {
  let maxSeq = 0;
  for (const order of existingOrders) {
    const seq = parseOrderSequence(order);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSequence = maxSeq + 1;
  const padded = String(nextSequence).padStart(3, "0");

  return {
    nextSequence,
    orderNumber: `#${padded}`,
    id: `ORD-${padded}`,
  };
}

export function formatOrderNumber(order: {
  id?: string;
  orderNumber?: string;
  sequenceNumber?: number;
}): string {
  if (order.orderNumber) return order.orderNumber;
  const seq = parseOrderSequence(order);
  if (seq > 0) return `#${String(seq).padStart(3, "0")}`;
  return order.id ?? "#000";
}
