import { NextResponse } from "next/server";
import { getSupabaseServerClient, SUPABASE_STORAGE_BUCKET } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;
// SVG is intentionally excluded (can carry scripts).
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { message: "Only PNG, JPEG, WebP or GIF images are allowed" },
        { status: 415 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Image must be 5MB or smaller" }, { status: 413 });
    }

    const supabase = getSupabaseServerClient();
    const bucket = SUPABASE_STORAGE_BUCKET;

    const fileExt = file.name.split(".").pop() ?? "png";
    const sanitizedBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const fileName = `${Date.now()}-${sanitizedBase || "img"}.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    let uploadResult = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    // If bucket was not found, attempt auto-creating it and retry upload
    if (uploadResult.error && uploadResult.error.message.toLowerCase().includes("bucket")) {
      await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});
      uploadResult = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });
    }

    if (uploadResult.error) {
      return NextResponse.json(
        {
          message: `Storage upload failed: ${uploadResult.error.message}. Make sure the '${bucket}' bucket exists in your Supabase project with public access.`,
        },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return NextResponse.json({ url: publicData.publicUrl }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
