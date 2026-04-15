"use client";

import { useEffect, useState } from "react";
import { finishSubscribe, isPushSupported } from "@/lib/pushClient";

type UiState = "hidden" | "prompt" | "working" | "granted" | "denied";

export default function PushOptIn({ anonUserId }: { anonUserId: string }) {
  const [ui, setUi] = useState<UiState>("hidden");

  useEffect(() => {
    if (!anonUserId) return;
    if (!isPushSupported()) {
      setUi("denied");
      return;
    }
    const perm = Notification.permission;
    if (perm === "granted") {
      // already granted: re-sync subscription and re-fire welcome.
      void finishSubscribe(anonUserId);
      setUi("granted");
      window.setTimeout(() => setUi("hidden"), 3000);
      return;
    }
    if (perm === "denied") {
      setUi("denied");
      return;
    }
    setUi("prompt");
  }, [anonUserId]);

  if (ui === "hidden") return null;

  const enable = () => {
    // CRITICAL for iOS: Notification.requestPermission() must be called
    // synchronously from the user gesture. No awaits before this call.
    setUi("working");
    let maybePromise: Promise<NotificationPermission> | NotificationPermission;
    try {
      maybePromise = Notification.requestPermission();
    } catch (err) {
      console.error("requestPermission threw", err);
      setUi("denied");
      return;
    }
    Promise.resolve(maybePromise).then(async (perm) => {
      if (perm !== "granted") {
        setUi(perm === "denied" ? "denied" : "prompt");
        return;
      }
      const result = await finishSubscribe(anonUserId);
      if (result === "granted") {
        setUi("granted");
        window.setTimeout(() => setUi("hidden"), 3000);
      } else if (result === "denied") {
        setUi("denied");
      } else {
        setUi("prompt");
      }
    });
  };

  if (ui === "granted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        通知をオンにしました。ウェルカム通知を送信中…
      </div>
    );
  }

  if (ui === "denied") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
        通知を有効にできません。iPhone では
        <b>ホーム画面に追加したアプリから開いた時だけ</b>
        通知がオンにできます。Safari タブではなく、ホーム画面の「Nihongo Tutor」アイコンから開き直してください。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500 text-white flex items-center justify-center">
          <BellIcon />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sky-900 text-sm">通知をオンにする</p>
          <p className="text-xs text-sky-800/80 mt-0.5 leading-relaxed">
            インストールの確認と、今後の新機能をプッシュでお知らせします。
          </p>
          <div className="mt-3">
            <button
              onClick={enable}
              disabled={ui === "working"}
              className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {ui === "working" ? "設定中…" : "オンにする"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M12 2a1 1 0 0 1 1 1v1.07A7 7 0 0 1 19 11v3.59l1.7 1.7A1 1 0 0 1 20 18H4a1 1 0 0 1-.7-1.71L5 14.59V11a7 7 0 0 1 6-6.93V3a1 1 0 0 1 1-1Zm-2 18a2 2 0 1 0 4 0h-4Z" />
    </svg>
  );
}
