import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/adminAuth";
import { savePrompt, type PromptKey } from "@/lib/promptStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS: PromptKey[] = ["system"];

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { key?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const key = body.key as PromptKey;
  const value = body.value;
  if (!key || !ALLOWED_KEYS.includes(key) || typeof value !== "string") {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (value.length > 20000) {
    return NextResponse.json({ ok: false, error: "too long" }, { status: 413 });
  }

  const result = await savePrompt(key, value);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "save failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
