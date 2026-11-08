"use client";

import { Printer } from "lucide-react";
import type { Customer, Order } from "@/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Receipt } from "./receipt";
import { useSettingsStore } from "@/store/settings-store";

export function ReceiptModal({
  order,
  customer,
  onClose,
}: {
  order: Order | null;
  customer?: Customer;
  onClose: () => void;
}) {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <Modal open={!!order} onClose={onClose} title="Receipt" className="max-w-sm">
      {order && <Receipt order={order} customer={customer} settings={settings} />}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={() => window.print()}><Printer size={16} /> Print</Button>
      </div>
    </Modal>
  );
}
