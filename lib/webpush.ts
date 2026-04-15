import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

if (!publicKey || !privateKey) {
  throw new Error(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set",
  );
}

webpush.setVapidDetails(subject, publicKey, privateKey);

export type WebPushPayload = {
  title: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
};

export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendWebPush(
  target: PushTarget,
  payload: WebPushPayload,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 },
    );
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    return {
      ok: false,
      status: e.statusCode ?? 0,
      message: e.body ?? e.message ?? "unknown push error",
    };
  }
}
