import { getSupabaseServerClient, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return new Response("Not found", { status: 404 });

    const decodedId = decodeURIComponent(id);
    const supabase = getSupabaseServerClient();
    const bucket = SUPABASE_STORAGE_BUCKET;

    const { data, error } = await supabase.storage.from(bucket).download(decodedId);
    if (error || !data) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
