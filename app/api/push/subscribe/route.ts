import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWebPush } from "@/lib/webpush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribeBody = {
  anonUserId?: string | null;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
};

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return new Response("invalid subscription", { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? null;
  const anonUserId = body.anonUserId?.trim() || null;

  const { data: existing } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, created_at")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();

  const isNew = !existing;

  const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      anon_user_id: anonUserId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    return new Response(`db error: ${error.message}`, { status: 500 });
  }

  // only fire the welcome push the first time this endpoint registers,
  // otherwise refreshing/reinstalling would spam the user.
  if (isNew) {
    const result = await sendWebPush(
      {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      {
        title: "登録ありがとう！🎌",
        body: "Nihongo Tutor のインストール完了。ここから日本語の質問、いつでもどうぞ。",
        url: "/chat",
        tag: "welcome",
      },
    );

    if (!result.ok && (result.status === 404 || result.status === 410)) {
      // subscription invalid — clean up immediately
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", sub.endpoint);
      return Response.json({ ok: false, reason: "subscription-gone" }, { status: 410 });
    }
  }

  return Response.json({ ok: true, welcomed: isNew });
}
