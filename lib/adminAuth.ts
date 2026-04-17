import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_auth";
const COOKIE_MAX_AGE = 60 * 60 * 8;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

function requireSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_PASSWORD env var is not set");
  }
  return secret;
}

function tokenFor(secret: string): string {
  return createHmac("sha256", secret)
    .update(`admin:${process.env.ADMIN_EMAIL ?? ""}`)
    .digest("hex");
}

function safeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPw = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPw) return false;
  const emailOk = safeEqualStr(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase(),
  );
  const pwOk = safeEqualStr(password, expectedPw);
  return emailOk && pwOk;
}

export function buildAdminCookie() {
  const secret = requireSecret();
  return {
    name: COOKIE_NAME,
    value: tokenFor(secret),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export function clearAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function isAdminAuthed(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const store = await cookies();
  const got = store.get(COOKIE_NAME)?.value;
  if (!got) return false;
  const expected = tokenFor(process.env.ADMIN_PASSWORD!);
  return safeEqualStr(got, expected);
}
