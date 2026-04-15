export type SubscribeResult =
  | { ok: true }
  | { ok: false; stage: string; message: string };

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function finishSubscribe(
  anonUserId: string,
): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { ok: false, stage: "support", message: "push not supported on this device" };
  }
  if (Notification.permission !== "granted") {
    return { ok: false, stage: "permission", message: `permission=${Notification.permission}` };
  }

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) {
    return { ok: false, stage: "vapid", message: "NEXT_PUBLIC_VAPID_PUBLIC_KEY missing in bundle" };
  }

  let reg: ServiceWorkerRegistration;
  try {
    reg =
      (await navigator.serviceWorker.getRegistration("/")) ??
      (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
  } catch (err) {
    return {
      ok: false,
      stage: "sw-register",
      message: (err as Error)?.message ?? String(err),
    };
  }

  let sub: PushSubscription;
  try {
    const existing = await reg.pushManager.getSubscription();
    sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapid),
      }));
  } catch (err) {
    return {
      ok: false,
      stage: "push-subscribe",
      message: (err as Error)?.message ?? String(err),
    };
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return {
      ok: false,
      stage: "subscription-shape",
      message: `endpoint=${!!json.endpoint} p256dh=${!!json.keys?.p256dh} auth=${!!json.keys?.auth}`,
    };
  }

  let res: Response;
  try {
    res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonUserId,
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      }),
    });
  } catch (err) {
    return {
      ok: false,
      stage: "api-fetch",
      message: (err as Error)?.message ?? String(err),
    };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      stage: "api-response",
      message: `status=${res.status} body=${text.slice(0, 200)}`,
    };
  }

  return { ok: true };
}
