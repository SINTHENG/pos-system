"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { CrudService } from "@/services/crud-service";

/** Loads a list from a service and exposes loading/error state plus CRUD helpers with toasts. */
export function useResource<T extends { id: string }>(service: CrudService<T>, label: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await service.list());
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const create = useCallback(
    async (input: Omit<T, "id">) => {
      try {
        const item = await service.create(input);
        setItems((prev) => [item, ...prev]);
        toast.success(`${label} created`);
        return item;
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? `Failed to create ${label.toLowerCase()}`);
        return undefined;
      }
    },
    [service, label],
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<T, "id">>) => {
      try {
        const item = await service.update(id, input);
        setItems((prev) => prev.map((x) => (x.id === id ? item : x)));
        toast.success(`${label} updated`);
        return item;
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? `Failed to update ${label.toLowerCase()}`);
        return undefined;
      }
    },
    [service, label],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await service.remove(id);
        setItems((prev) => prev.filter((x) => x.id !== id));
        toast.success(`${label} deleted`);
        return true;
      } catch (e) {
        toast.error((e as { message?: string })?.message ?? `Failed to delete ${label.toLowerCase()}`);
        return false;
      }
    },
    [service, label],
  );

  return { items, loading, error, reload, create, update, remove };
}
