"use client";

import { useEffect, useState } from "react";
import { detectStandalone } from "@/lib/pwa";
import { isPushSupported, subscribeAndRegister } from "@/lib/pushClient";

const DISMISS_KEY = "nihongo:push-dismissed";

type UiState = "hidden" | "prompt" | "working" | "granted" | "denied";

export default function PushOptIn({ anonUserId }: { anonUserId: string }) {
  const [ui, setUi] = useState<UiState>("hidden");

  useEffect(() => {
    if (!anonUserId) return;
    if (!isPushSupported()) return;
    // only show inside the installed app. iOS requires this; on other platforms
    // it also keeps the browser tab uncluttered.
    if (!detectStandalone()) return;

    const perm = Notification.permission;
    if (perm === "granted") {
      // already granted: re-sync subscription silently (idempotent upsert).
      void subscribeAndRegister(anonUserId);
      setUi("hidden");
      return;
    }
    if (perm === "denied") {
      setUi("hidden");
      return;
    }
    if (typeof window !== "undefined" && window.localStorage.getItem(DISMISS_KEY)) {
      setUi("hidden");
      return;
    }
    setUi("prompt");
  }, [anonUserId]);

  if (ui === "hidden") return null;

  const enable = async () => {
    setUi("working");
    const result = await subscribeAndRegister(anonUserId);
    if (result === "granted") {
      setUi("granted");
      window.setTimeout(() => setUi("hidden"), 3000);
    } else if (result === "denied") {
      setUi("denied");
    } else {
      setUi("prompt");
    }
  };

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setUi("hidden");
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
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        通知はブロックされています。ブラウザ/OSの設定から許可すると、ここで再度有効化できます。
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
          <div className="flex gap-2 mt-3">
            <button
              onClick={enable}
              disabled={ui === "working"}
              className="rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 transition-colors"
            >
              {ui === "working" ? "設定中…" : "オンにする"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 transition-colors"
            >
              あとで
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
