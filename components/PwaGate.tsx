"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="Nihongo Tutor"
            width={80}
            height={80}
            className="w-20 h-20 rounded-3xl shadow-xl shadow-sky-500/30"
          />
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
    return <IosVideoSteps />;
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

const IOS_VIDEO_STEPS = [
  {
    title: "Open the Share menu",
    body: "Tap the Share icon at the bottom of Safari.",
    src: "/videos/install-step-1.mp4",
  },
  {
    title: "Tap \u201cAdd to Home Screen\u201d",
    body: "Scroll past AirDrop and Copy if you have to.",
    src: "/videos/install-step-2.mp4",
  },
  {
    title: "Tap \u201cAdd\u201d",
    body: "Nihongo Tutor now lives on your home screen.",
    src: "/videos/install-step-3.mp4",
  },
];

function IosVideoSteps() {
  const [idx, setIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const step = IOS_VIDEO_STEPS[idx];
  const total = IOS_VIDEO_STEPS.length;
  const isLast = idx === total - 1;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {
      /* autoplay may be blocked until user interaction */
    });
  }, [idx]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium text-sky-600">
          <AppleGlyph /> iPhone &middot; Safari
        </span>
        <span className="text-xs font-medium text-slate-400">
          Step {idx + 1} / {total}
        </span>
      </div>

      <div className="relative bg-slate-900 aspect-[9/16] max-h-[60vh] mx-auto w-full">
        <video
          ref={videoRef}
          key={step.src}
          src={step.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain bg-slate-900"
        />
      </div>

      <div className="px-5 py-4">
        <p className="font-semibold text-slate-900">
          {idx + 1}. {step.title}
        </p>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          {step.body}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {IOS_VIDEO_STEPS.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 flex-1 rounded-full " +
                (i <= idx ? "bg-sky-500" : "bg-slate-200")
              }
            />
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex-1 rounded-2xl bg-slate-100 text-slate-700 font-medium py-3 text-sm disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            disabled={isLast}
            className="flex-[2] rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 transition-colors text-white font-semibold py-3 text-sm shadow-lg shadow-sky-500/30 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {isLast ? "Follow the steps above" : "Next"}
          </button>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 text-xs text-slate-500">
        Using Chrome or an in-app browser? Open this page in{" "}
        <b>Safari</b> first.
      </div>

      {idx === 0 ? (
        <FloatingArrow anchor="center" label="Tap the Share button ↓" />
      ) : null}
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
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };
  const features = [
    "Friendly AI Japanese tutor",
    "Instant push notifications",
    "Private & secure",
  ];
  return (
    <>
      <section className="rounded-3xl border border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
        <div className="px-5 pt-5 pb-4">
          <p className="font-semibold text-amber-900 text-base leading-snug">
            Open this page in your main browser
          </p>
          <p className="text-sm text-amber-800 mt-1.5 leading-relaxed">
            In-app browsers (Instagram, Line, Facebook, etc.) can&apos;t install
            apps. Tap the share / &middot;&middot;&middot; button below, then
            choose <b>Open in Safari</b> or <b>Open in Chrome</b>.
          </p>

          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-white font-bold text-sm shadow-lg shadow-red-600/30">
              Tap Here
            </span>
            <svg
              viewBox="0 0 24 48"
              className="w-6 h-10 text-red-600 animate-bounce"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 0h4v32h6L12 48 4 32h6z" />
            </svg>
          </div>

          <button
            onClick={handleCopy}
            className="mt-4 w-full rounded-2xl bg-amber-900 text-amber-50 font-medium py-3 text-sm active:bg-amber-950"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <ul className="divide-y divide-amber-100 bg-white">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-3 px-5 py-3">
              <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
                  aria-hidden="true"
                >
                  <path d="M9.707 17.707a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 15.586l9.293-9.293a1 1 0 0 1 1.414 1.414l-10 10Z" />
                </svg>
              </span>
              <span className="text-sm text-slate-700">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <FloatingArrow anchor="right" label="Tap here ↓" />
    </>
  );
}

function FloatingArrow({
  anchor,
  label,
}: {
  anchor: "right" | "center";
  label: string;
}) {
  const positionClass =
    anchor === "right"
      ? "bottom-2 right-4 items-end"
      : "bottom-2 left-1/2 -translate-x-1/2 items-center";
  return (
    <div
      className={`pointer-events-none fixed z-40 flex flex-col gap-1 ${positionClass}`}
      aria-hidden="true"
    >
      <span className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-red-600/40">
        {label}
      </span>
      <svg
        viewBox="0 0 24 48"
        className="w-7 h-12 text-red-600 drop-shadow-[0_2px_3px_rgba(220,38,38,0.4)] animate-bounce"
        fill="currentColor"
      >
        <path d="M10 0h4v32h6L12 48 4 32h6z" />
      </svg>
    </div>
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
