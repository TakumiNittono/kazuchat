"use client";

import { ReactNode, useEffect, useState } from "react";
import { detectStandalone } from "@/lib/pwa";
import { finishSubscribe, isPushSupported } from "@/lib/pushClient";
import { getAnonId } from "@/lib/anonId";
import { BUILD_ID } from "@/lib/buildId";

type Phase =
  | "loading"
  | "ask"
  | "working"
  | "granted"
  | "denied"
  | "unsupported"
  | "pass";

type Diag = {
  standalone: boolean;
  pushSupported: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: string;
  ua: string;
};

export default function PushGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diag, setDiag] = useState<Diag | null>(null);

  useEffect(() => {
    const standalone = detectStandalone();
    const hasServiceWorker =
      typeof navigator !== "undefined" && "serviceWorker" in navigator;
    const hasPushManager =
      typeof window !== "undefined" && "PushManager" in window;
    const hasNotification =
      typeof window !== "undefined" && "Notification" in window;
    const pushSupported = isPushSupported();
    const permission = hasNotification
      ? Notification.permission
      : "unavailable";
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const d: Diag = {
      standalone,
      pushSupported,
      hasServiceWorker,
      hasPushManager,
      hasNotification,
      permission,
      ua,
    };
    setDiag(d);

    // NEVER skip the gate in standalone — we want the user to see what's
    // happening even if push isn't supported on this device.
    if (!standalone) {
      setPhase("pass");
      return;
    }
    if (!pushSupported) {
      setPhase("unsupported");
      return;
    }
    if (permission === "granted") {
      // already granted: try to sync subscription in the background, but still
      // show a quick "granted" screen so the user can retrigger the welcome.
      void finishSubscribe(getAnonId()).then((r) => {
        if (!r.ok) {
          setErrorMsg(`[${r.stage}] ${r.message}`);
        }
      });
      setPhase("granted");
      return;
    }
    if (permission === "denied") {
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
      setErrorMsg("Failed to request notification permission.");
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
        setErrorMsg("Please allow notifications.");
        setPhase("ask");
        return;
      }
      const result = await finishSubscribe(getAnonId());
      if (result.ok) {
        setPhase("granted");
      } else {
        setErrorMsg(`[${result.stage}] ${result.message}`);
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
      <div className="w-full max-w-md mx-auto flex flex-col gap-6">
        <div className="rounded-full bg-fuchsia-600 text-white text-[11px] font-mono px-2 py-1 self-center">
          build: {BUILD_ID}
        </div>
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-sky-500 text-white flex items-center justify-center shadow-xl shadow-sky-500/30">
            <BellIcon />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Allow notifications
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              We&apos;ll let you know when your install is complete and ping
              you about new features. On iPhone you only need to allow it
              once.
            </p>
          </div>
        </header>

        {phase === "ask" || phase === "working" ? (
          <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-5 flex flex-col gap-4">
            <ul className="text-sm text-sky-900 space-y-2">
              <li className="flex gap-2">
                <Dot /> Get a &ldquo;Thanks for signing up!&rdquo; push right away
              </li>
              <li className="flex gap-2">
                <Dot /> Be the first to hear about new features
              </li>
              <li className="flex gap-2">
                <Dot /> Turn it off any time in iOS Settings
              </li>
            </ul>
            <button
              onClick={allow}
              disabled={phase === "working"}
              className="w-full rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 transition-colors text-white font-medium py-4 shadow-lg shadow-sky-500/30"
            >
              {phase === "working" ? "Requesting permission…" : "Allow notifications"}
            </button>
            {errorMsg ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-mono text-rose-900 break-all">
                <div className="font-semibold mb-1">Error details</div>
                {errorMsg}
              </div>
            ) : null}
          </section>
        ) : null}

        {phase === "denied" ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
            <p className="font-medium text-amber-900">
              Notifications are blocked
            </p>
            <ol className="text-sm text-amber-900/90 mt-2 space-y-1 list-decimal pl-5 leading-relaxed">
              <li>Open the iPhone Settings app</li>
              <li>Scroll down and tap &ldquo;Chat with Marin&rdquo;</li>
              <li>Tap &ldquo;Notifications&rdquo; → turn &ldquo;Allow Notifications&rdquo; on</li>
              <li>Come back to this app and relaunch it</li>
            </ol>
            <button
              onClick={() => setPhase("pass")}
              className="mt-4 w-full rounded-2xl bg-white border border-amber-300 text-amber-900 font-medium py-3 text-sm"
            >
              Continue without notifications
            </button>
          </section>
        ) : null}

        {phase === "granted" ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-5 flex flex-col gap-3">
            <p className="font-medium text-emerald-900">Notifications enabled</p>
            <p className="text-sm text-emerald-800 leading-relaxed">
              We&apos;ve sent you a welcome push. Check your lock screen!
            </p>
            <button
              onClick={async () => {
                setErrorMsg(null);
                const r = await finishSubscribe(getAnonId());
                if (!r.ok) {
                  setErrorMsg(`[${r.stage}] ${r.message}`);
                } else {
                  setErrorMsg("Resent.");
                }
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 text-sm"
            >
              Resend welcome push
            </button>
            <button
              onClick={() => setPhase("pass")}
              className="rounded-xl bg-white border border-emerald-300 text-emerald-800 font-medium px-4 py-2 text-sm"
            >
              Continue to chat
            </button>
            {errorMsg ? (
              <p className="text-xs text-emerald-800">{errorMsg}</p>
            ) : null}
          </section>
        ) : null}

        {phase === "unsupported" ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
            <p className="font-medium text-amber-900">
              Push notifications aren&apos;t supported on this device
            </p>
            <p className="text-sm text-amber-900/90 mt-1 leading-relaxed">
              On iPhone, you need <b>iOS 16.4 or later</b> and you must open
              the app from the home-screen icon you just added. Check the
              diagnostics below to confirm your iOS version.
            </p>
            <button
              onClick={() => setPhase("pass")}
              className="mt-4 w-full rounded-2xl bg-white border border-amber-300 text-amber-900 font-medium py-3 text-sm"
            >
              Continue to chat
            </button>
          </section>
        ) : null}

        {diag ? <DiagBox diag={diag} /> : null}
      </div>
    </main>
  );
}

function DiagBox({ diag }: { diag: Diag }) {
  const copyDiag = async () => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(diag, null, 2));
    } catch {
      /* noop */
    }
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-mono text-slate-600 leading-relaxed">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-slate-700">diagnostic</span>
        <button
          onClick={copyDiag}
          className="text-[10px] text-sky-600 underline"
        >
          copy
        </button>
      </div>
      <div>standalone: {String(diag.standalone)}</div>
      <div>pushSupported: {String(diag.pushSupported)}</div>
      <div>serviceWorker: {String(diag.hasServiceWorker)}</div>
      <div>PushManager: {String(diag.hasPushManager)}</div>
      <div>Notification: {String(diag.hasNotification)}</div>
      <div>permission: {diag.permission}</div>
      <div className="mt-1 break-all">ua: {diag.ua.slice(0, 120)}</div>
    </section>
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
