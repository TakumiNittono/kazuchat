import { NextRequest, NextResponse } from "next/server";
import {
  buildAdminCookie,
  isAdminConfigured,
  verifyCredentials,
} from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_EMAIL and ADMIN_PASSWORD not configured" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const email = body.email ?? "";
  const pw = body.password ?? "";
  if (!verifyCredentials(email, pw)) {
    return NextResponse.json({ ok: false, error: "invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(buildAdminCookie());
  return res;
}
