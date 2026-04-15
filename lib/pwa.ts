export type PwaPlatform =
  | "ios"
  | "android"
  | "desktop"
  | "in-app-instagram"
  | "in-app-facebook"
  | "in-app-line"
  | "in-app-other"
  | "other";

export type PwaInstallState = {
  loading: boolean;
  standalone: boolean;
  platform: PwaPlatform;
  canNativeInstall: boolean;
  justInstalled: boolean;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export function detectPlatform(): PwaPlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";

  if (/Instagram/i.test(ua)) return "in-app-instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "in-app-facebook";
  if (/Line\//i.test(ua)) return "in-app-line";
  // generic webview / in-app: iOS app has "WKWebView" cues, Android has "; wv)"
  if (/\bwv\b/i.test(ua) || /GSA\//.test(ua)) return "in-app-other";

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; detect via touch
    (navigator.platform === "MacIntel" &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints !=
        null &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! >
        1);
  if (isIOS) return "ios";

  if (/Android/.test(ua)) return "android";

  // any desktop Chrome/Edge/Brave/Arc supports beforeinstallprompt
  if (/Chrome|Chromium|Edg|Brave/i.test(ua)) return "desktop";

  return "other";
}
