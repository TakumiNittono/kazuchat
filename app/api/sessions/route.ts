import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")?.trim();
  if (!anonUserId) {
    return NextResponse.json({ error: "anonUserId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("anon_user_id", anonUserId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("list sessions failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: NextRequest) {
  let body: { anonUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const anonUserId = body.anonUserId?.trim();
  if (!anonUserId) {
    return NextResponse.json({ error: "anonUserId required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .insert({ anon_user_id: anonUserId })
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("create session failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
