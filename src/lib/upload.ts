import { API_URL, USE_MOCK } from "@/lib/api-client";

/**
 * Uploads an image and returns a URL to store on the entity.
 * - mock mode: returns a data URL (browser only)
 * - API mode: POST {API_URL}/upload (multipart, field "file") -> { url }
 */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or smaller");
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(file);
    });
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/upload`, { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
  if (!res.ok || !json.url) throw new Error(json.message ?? "Upload failed");
  return json.url;
}
