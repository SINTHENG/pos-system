import { NextResponse } from "next/server";
import { RESOURCES, getTableName } from "@/lib/server-resources";
import { getSupabaseServerClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ resource: string; id: string }> };
const fail = (e: unknown, status = 500) =>
  NextResponse.json({ message: e instanceof Error ? e.message : "Server error" }, { status });

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { resource, id } = await params;
    if (!RESOURCES[resource]) {
      return NextResponse.json({ message: "Unknown resource" }, { status: 404 });
    }

    const table = getTableName(resource);
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { resource, id } = await params;
    if (!RESOURCES[resource]) {
      return NextResponse.json({ message: "Unknown resource" }, { status: 404 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    const { id: _ignoredId, _id, ...data } = body as Record<string, unknown>;
    void _ignoredId;
    void _id;

    const table = getTableName(resource);
    const supabase = getSupabaseServerClient();

    if (Object.keys(data).length === 0) {
      const { data: existing, error: existingErr } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (existingErr) {
        return NextResponse.json({ message: existingErr.message }, { status: 500 });
      }
      if (!existing) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
      }
      return NextResponse.json(existing);
    }

    const { data: updated, error } = await supabase
      .from(table)
      .update(data)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { resource, id } = await params;
    if (!RESOURCES[resource]) {
      return NextResponse.json({ message: "Unknown resource" }, { status: 404 });
    }

    const table = getTableName(resource);
    const supabase = getSupabaseServerClient();

    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    if (count === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
