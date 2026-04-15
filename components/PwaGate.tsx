"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  BeforeInstallPromptEvent,
  detectPlatform,
  detectStandalone,
  PwaInstallState,
  PwaPlatform,
} from "@/lib/pwa";

export default function PwaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PwaInstallState>({
    loading: true,
    standalone: false,
    platform: "other",
    canNativeInstall: false,
    justInstalled: false,
  });
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone = detectStandalone();
    const platform = detectPlatform();
    setState((s) => ({ ...s, loading: false, standalone, platform }));

    if (standalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(evt);
      setState((s) => ({ ...s, canNativeInstall: true }));
    };
    const onInstalled = () => {
      setState((s) => ({ ...s, justInstalled: true }));
    };
    const mql = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (mql.matches) {
        setState((s) => ({ ...s, standalone: true }));
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    mql.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setState((s) => ({ ...s, justInstalled: true }));
      }
    } catch (err) {
      console.error("install prompt failed", err);
    } finally {
      setDeferredPrompt(null);
      setState((s) => ({ ...s, canNativeInstall: false }));
    }
  };

  if (state.loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state.standalone) {
    return <>{children}</>;
  }

  return (
    <InstallScreen
      platform={state.platform}
      canNativeInstall={state.canNativeInstall}
      justInstalled={state.justInstalled}
      onInstall={triggerInstall}
    />
  );
}

function InstallScreen({
  platform,
  canNativeInstall,
  justInstalled,
  onInstall,
}: {
  platform: PwaPlatform;
  canNativeInstall: boolean;
  justInstalled: boolean;
  onInstall: () => void;
}) {
  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 safe-top safe-bottom bg-white">
      <div className="w-full max-w-md mx-auto flex flex-col gap-8">
        <header className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-sky-500 text-white flex items-center justify-center text-3xl font-bold shadow-xl shadow-sky-500/30">
            日
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Install Nihongo Tutor
            </h1>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              This app only works when installed. It&apos;s a one-time setup
              and takes 10 seconds.
            </p>
          </div>
        </header>

        {justInstalled ? (
          <JustInstalledCard />
        ) : (
          <PlatformInstructions
            platform={platform}
            canNativeInstall={canNativeInstall}
            onInstall={onInstall}
          />
        )}

        <WhyInstall />
      </div>
    </main>
  );
}

function PlatformInstructions({
  platform,
  canNativeInstall,
  onInstall,
}: {
  platform: PwaPlatform;
  canNativeInstall: boolean;
  onInstall: () => void;
}) {
  if (
    platform === "in-app-instagram" ||
    platform === "in-app-facebook" ||
    platform === "in-app-line" ||
    platform === "in-app-other"
  ) {
    return <InAppBrowserCard />;
  }

  if (platform === "ios") {
    return <IosInstructions />;
  }

  if (platform === "android" || platform === "desktop") {
    return (
      <NativeInstallCard
        canNativeInstall={canNativeInstall}
        onInstall={onInstall}
        platform={platform}
      />
    );
  }

  return <GenericInstructions />;
}

function IosInstructions() {
  const steps = [
    {
      title: "Open the Share menu",
      body: "Tap the Share icon at the bottom of Safari.",
      visual: <ShareIcon />,
    },
    {
      title: "Scroll down, tap \u201cAdd to Home Screen\u201d",
      body: "You may have to scroll past AirDrop and Copy.",
      visual: <AddToHomeIcon />,
    },
    {
      title: "Tap \u201cAdd\u201d in the top right",
      body: "Nihongo Tutor now lives on your home screen.",
      visual: <PlusIcon />,
    },
  ];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-sky-600">
          <AppleGlyph /> iPhone &middot; Safari
        </div>
      </div>
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 px-5 py-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center font-semibold">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{s.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{s.body}</p>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
              {s.visual}
            </div>
          </li>
        ))}
      </ol>
      <div className="px-5 py-4 bg-slate-50 text-xs text-slate-500">
        If you don&apos;t see the Share button, make sure you&apos;re using
        Safari &mdash; not Chrome or an in-app browser.
      </div>
    </section>
  );
}

function NativeInstallCard({
  canNativeInstall,
  onInstall,
  platform,
}: {
  canNativeInstall: boolean;
  onInstall: () => void;
  platform: PwaPlatform;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-sky-600">
          {platform === "android" ? (
            <>
              <AndroidGlyph /> Android &middot; Chrome
            </>
          ) : (
            <>
              <ChromeGlyph /> Desktop &middot; Chrome / Edge
            </>
          )}
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-slate-700 text-sm leading-relaxed">
          Tap the button below. Your browser will show an install prompt &mdash;
          confirm to add Nihongo Tutor to your
          {platform === "android" ? " home screen" : " apps"}.
        </p>
        <button
          onClick={onInstall}
          disabled={!canNativeInstall}
          className="mt-4 w-full rounded-2xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-500 transition-colors text-white font-medium py-4 shadow-lg shadow-sky-500/30 disabled:shadow-none"
        >
          {canNativeInstall
            ? "Install Nihongo Tutor"
            : "Preparing install\u2026"}
        </button>
        {!canNativeInstall ? (
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Waiting for the browser&apos;s install signal. If nothing happens
            within a few seconds, open the browser menu (&middot;&middot;&middot;)
            and tap <b>Install app</b> /{" "}
            <b>Add to Home Screen</b>.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function InAppBrowserCard() {
  const handleCopy = async () => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* noop */
    }
  };
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 overflow-hidden">
      <div className="px-5 py-4">
        <p className="font-medium text-amber-900">
          Open this page in your main browser
        </p>
        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
          In-app browsers (Instagram, Line, Facebook, etc.) can&apos;t install
          apps. Tap the <b>&middot;&middot;&middot;</b> or share button in your
          current app and choose <b>Open in Safari</b> or{" "}
          <b>Open in Chrome</b>, then come back here.
        </p>
        <button
          onClick={handleCopy}
          className="mt-3 w-full rounded-2xl bg-amber-900 text-amber-50 font-medium py-3 text-sm"
        >
          Copy link
        </button>
      </div>
    </section>
  );
}

function GenericInstructions() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4">
        <p className="font-medium text-slate-900">Install from your browser</p>
        <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc pl-5">
          <li>
            <b>Chrome / Edge</b>: open the browser menu and tap{" "}
            <i>Install app</i>.
          </li>
          <li>
            <b>Safari (iPhone/iPad)</b>: tap Share &rarr; <i>Add to Home Screen</i>.
          </li>
          <li>
            <b>Firefox</b>: tap the menu and choose <i>Install</i>.
          </li>
        </ul>
      </div>
    </section>
  );
}

function JustInstalledCard() {
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <p className="font-medium text-emerald-900">Install complete</p>
      <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
        Open Nihongo Tutor from your home screen (or app menu) to start
        chatting. This tab can now be closed.
      </p>
    </section>
  );
}

function WhyInstall() {
  const points = [
    "One-tap to launch, no URL to remember",
    "Opens fullscreen, no browser chrome",
    "Saves your chat even when offline",
  ];
  return (
    <section>
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
        Why install
      </p>
      <ul className="space-y-2">
        {points.map((p) => (
          <li
            key={p}
            className="flex items-start gap-2 text-sm text-slate-600"
          >
            <CheckIcon />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function AddToHomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0"
    >
      <path d="M9.707 17.707a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 15.586l9.293-9.293a1 1 0 0 1 1.414 1.414l-10 10Z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5"
    >
      <path d="M16.365 1.43c0 1.14-.493 2.23-1.292 2.988-.803.76-2.114 1.32-3.11 1.25-.122-1.1.39-2.23 1.19-2.98.803-.75 2.16-1.28 3.21-1.26Zm3.89 17.28c-.66 1.51-1.46 3-2.75 3.02-1.25.02-1.66-.74-3.09-.74-1.44 0-1.9.72-3.09.76-1.26.05-2.21-1.63-2.88-3.12-1.36-3.04-2.4-8.58.99-12.33 1.18-1.32 3.21-2.18 5.24-2.2 1.24-.02 2.42.75 3.09.75.66 0 2.1-.92 3.53-.78.6.03 2.29.24 3.37 1.83-.09.06-2.01 1.18-1.99 3.51.03 2.8 2.44 3.72 2.47 3.73-.02.07-.37 1.3-1.22 2.57Z" />
    </svg>
  );
}

function AndroidGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5"
    >
      <path d="M17.523 15.341a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm-11.046 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm11.41-6.05 1.991-3.45a.41.41 0 1 0-.71-.41l-2.016 3.49A12.3 12.3 0 0 0 12 7.77c-1.808 0-3.52.36-5.152 1.15L4.832 5.43a.41.41 0 0 0-.71.41l1.99 3.45A11.27 11.27 0 0 0 1 17h22a11.27 11.27 0 0 0-5.113-7.71Z" />
    </svg>
  );
}

function ChromeGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="w-3.5 h-3.5"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v9M20.5 7 12 12M3.5 7 12 12" />
    </svg>
  );
}
