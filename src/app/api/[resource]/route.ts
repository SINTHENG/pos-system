import { NextResponse } from "next/server";
import {
  ORDER_COLUMNS,
  RESOURCES,
  ensureResourceSeeded,
  getTableName,
} from "@/lib/server-resources";
import { getSupabaseServerClient } from "@/lib/supabase";
import { uid } from "@/lib/utils";

const fail = (e: unknown, status = 500) =>
  NextResponse.json({ message: e instanceof Error ? e.message : "Server error" }, { status });

export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    if (!RESOURCES[resource]) {
      return NextResponse.json({ message: "Unknown resource" }, { status: 404 });
    }

    await ensureResourceSeeded(resource);

    const table = getTableName(resource);
    const supabase = getSupabaseServerClient();

    let query = supabase.from(table).select("*");
    const orderCol = ORDER_COLUMNS[resource];
    if (orderCol) {
      query = query.order(orderCol, { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    if (!RESOURCES[resource]) {
      return NextResponse.json({ message: "Unknown resource" }, { status: 404 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ message: "Invalid body" }, { status: 400 });
    }

    const { id: incomingId, _id, ...data } = body as Record<string, unknown>;
    void _id;

    const id =
      typeof incomingId === "string" && incomingId.trim()
        ? incomingId
        : uid(resource.slice(0, 3));

    const doc = { ...data, id };
    const table = getTableName(resource);
    const supabase = getSupabaseServerClient();

    const { data: created, error } = await supabase
      .from(table)
      .insert([doc])
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json(created ?? doc, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
