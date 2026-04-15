"use client";

import { ReactNode, useEffect, useState } from "react";
import { detectStandalone } from "@/lib/pwa";
import { finishSubscribe, isPushSupported } from "@/lib/pushClient";
import { getAnonId } from "@/lib/anonId";

type Phase =
  | "loading"
  | "ask"
  | "working"
  | "granted"
  | "denied"
  | "unsupported"
  | "pass";

export default function PushGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // only gate inside the installed app.
    if (!detectStandalone()) {
      setPhase("pass");
      return;
    }
    if (!isPushSupported()) {
      // installed PWA but the browser can't do push (rare). let them through.
      setPhase("pass");
      return;
    }
    const perm = Notification.permission;
    if (perm === "granted") {
      // silently make sure the server has our latest subscription, then pass.
      void finishSubscribe(getAnonId());
      setPhase("pass");
      return;
    }
    if (perm === "denied") {
      setPhase("denied");
      return;
    }
    setPhase("ask");
  }, []);

  const allow = () => {
    // must be synchronous inside the click handler for iOS.
    setErrorMsg(null);
    setPhase("working");
    let pending: Promise<NotificationPermission> | NotificationPermission;
    try {
      pending = Notification.requestPermission();
    } catch (err) {
      console.error("requestPermission threw", err);
      setErrorMsg("通知許可のリクエストに失敗しました。");
      setPhase("ask");
      return;
    }
    Promise.resolve(pending).then(async (perm) => {
      if (perm === "denied") {
        setPhase("denied");
        return;
      }
      if (perm !== "granted") {
        // "default" — user dismissed the dialog.
        setErrorMsg("通知を許可してください。");
        setPhase("ask");
        return;
      }
      const result = await finishSubscribe(getAnonId());
      if (result === "granted") {
        setPhase("granted");
        window.setTimeout(() => setPhase("pass"), 2500);
      } else {
        setErrorMsg("購読に失敗しました。時間をおいて再試行してください。");
        setPhase("ask");
      }
    });
  };

  if (phase === "pass") return <>{children}</>;

  if (phase === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 safe-top safe-bottom bg-white">
      <div className="w-full max-w-md mx-auto flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-500/30">
            <BellIcon />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              通知を許可してください
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              インストール完了のお知らせと、新機能のアップデートをお届けします。
              iPhone では最初に一度だけ許可が必要です。
            </p>
          </div>
        </header>

        {phase === "ask" || phase === "working" ? (
          <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-5 flex flex-col gap-4">
            <ul className="text-sm text-sky-900 space-y-2">
              <li className="flex gap-2">
                <Dot /> すぐに「登録ありがとう！」通知が届きます
              </li>
              <li className="flex gap-2">
                <Dot /> 新機能リリース時にプッシュでお知らせ
              </li>
              <li className="flex gap-2">
                <Dot /> いつでも iOS の設定からオフにできます
              </li>
            </ul>
            <button
              onClick={allow}
              disabled={phase === "working"}
              className="w-full rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 transition-colors text-white font-medium py-4 shadow-lg shadow-sky-500/30"
            >
              {phase === "working" ? "許可を要求中…" : "通知を許可する"}
            </button>
            {errorMsg ? (
              <p className="text-xs text-rose-600">{errorMsg}</p>
            ) : null}
          </section>
        ) : null}

        {phase === "denied" ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
            <p className="font-medium text-amber-900">
              通知がブロックされています
            </p>
            <ol className="text-sm text-amber-900/90 mt-2 space-y-1 list-decimal pl-5 leading-relaxed">
              <li>iPhone の「設定」アプリを開く</li>
              <li>下にスクロールして「Nihongo Tutor」をタップ</li>
              <li>「通知」→「通知を許可」をオン</li>
              <li>このアプリに戻って再起動</li>
            </ol>
            <button
              onClick={() => setPhase("pass")}
              className="mt-4 w-full rounded-2xl bg-white border border-amber-300 text-amber-900 font-medium py-3 text-sm"
            >
              このまま続ける（通知なし）
            </button>
          </section>
        ) : null}

        {phase === "granted" ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5">
            <p className="font-medium text-emerald-900">通知をオンにしました</p>
            <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
              登録ありがとう通知を送信しました。数秒以内にロック画面に表示されます。
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-9 h-9"
    >
      <path d="M12 2a1 1 0 0 1 1 1v1.07A7 7 0 0 1 19 11v3.59l1.7 1.7A1 1 0 0 1 20 18H4a1 1 0 0 1-.7-1.71L5 14.59V11a7 7 0 0 1 6-6.93V3a1 1 0 0 1 1-1Zm-2 18a2 2 0 1 0 4 0h-4Z" />
    </svg>
  );
}

function Dot() {
  return (
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
  );
}
