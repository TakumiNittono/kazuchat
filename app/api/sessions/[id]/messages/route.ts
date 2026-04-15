import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")?.trim();
  if (!anonUserId) {
    return NextResponse.json({ error: "anonUserId required" }, { status: 400 });
  }

  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, anon_user_id")
    .eq("id", id)
    .maybeSingle();

  if (sessionErr) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  if (!session || session.anon_user_id !== anonUserId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")?.trim();
  if (!anonUserId) {
    return NextResponse.json({ error: "anonUserId required" }, { status: 400 });
  }

  const { data: session } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, anon_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!session || session.anon_user_id !== anonUserId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("chat_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
