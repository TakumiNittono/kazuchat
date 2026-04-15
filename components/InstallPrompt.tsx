"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "nihongo-chat:install-prompt-dismissed";
const DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">(
    "other",
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS-specific
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) {
      return;
    }

    const ua = window.navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isAndroid = /Android/.test(ua);
    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (isIOS) {
      // iOS doesn't fire beforeinstallprompt; show manual tip after a short delay.
      const t = setTimeout(() => setVisible(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 pointer-events-none safe-bottom">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-slate-900 text-white shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-sm font-bold">
          日
        </div>
        <div className="flex-1 text-sm leading-snug">
          <p className="font-medium">Add to Home Screen</p>
          <p className="text-slate-300 text-xs mt-0.5">
            {platform === "ios"
              ? "Tap Share → Add to Home Screen"
              : "Install for a faster, app-like experience."}
          </p>
        </div>
        {platform !== "ios" && deferred ? (
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg bg-sky-500 text-white text-xs font-medium hover:bg-sky-600"
          >
            Install
          </button>
        ) : null}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-slate-400 hover:text-white p-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L10.94 12l-5.72 5.72a.75.75 0 1 0 1.06 1.06L12 13.06l5.72 5.72a.75.75 0 1 0 1.06-1.06L13.06 12l5.72-5.72a.75.75 0 0 0-1.06-1.06L12 10.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
