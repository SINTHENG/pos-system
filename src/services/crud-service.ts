import { apiClient, toApiError, USE_MOCK } from "@/lib/api-client";
import { uid } from "@/lib/utils";

export interface CrudService<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, "id">): Promise<T>;
  update(id: string, input: Partial<Omit<T, "id">>): Promise<T>;
  remove(id: string): Promise<void>;
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/**
 * Builds a CRUD service. With NEXT_PUBLIC_USE_MOCK=true it operates on an in-memory
 * copy of the seed data; otherwise it calls the Spring Boot REST endpoint
 * (GET/POST/PUT/DELETE {API_URL}/{resource}).
 */
export function createCrudService<T extends { id: string }>(
  resource: string,
  seed: T[],
  idPrefix: string,
): CrudService<T> {
  let db = [...seed];

  return {
    async list() {
      if (USE_MOCK) {
        await delay();
        return [...db];
      }
      try {
        const res = await apiClient.get<T[]>(`/${resource}`);
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },
    async get(id) {
      if (USE_MOCK) {
        await delay(100);
        return db.find((x) => x.id === id);
      }
      try {
        return (await apiClient.get<T>(`/${resource}/${id}`)).data;
      } catch (e) {
        throw toApiError(e);
      }
    },
    async create(input) {
      if (USE_MOCK) {
        await delay();
        const item = { ...input, id: uid(idPrefix) } as T;
        db = [item, ...db];
        return item;
      }
      try {
        return (await apiClient.post<T>(`/${resource}`, input)).data;
      } catch (e) {
        throw toApiError(e);
      }
    },
    async update(id, input) {
      if (USE_MOCK) {
        await delay();
        const current = db.find((x) => x.id === id);
        if (!current) throw { message: "Not found", status: 404 };
        const next = { ...current, ...input } as T;
        db = db.map((x) => (x.id === id ? next : x));
        return next;
      }
      try {
        return (await apiClient.put<T>(`/${resource}/${id}`, input)).data;
      } catch (e) {
        throw toApiError(e);
      }
    },
    async remove(id) {
      if (USE_MOCK) {
        await delay();
        db = db.filter((x) => x.id !== id);
        return;
      }
      try {
        await apiClient.delete(`/${resource}/${id}`);
      } catch (e) {
        throw toApiError(e);
      }
    },
  };
}
