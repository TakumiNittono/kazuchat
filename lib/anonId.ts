const KEY = "nihongo-chat:anon-id";

export function getAnonId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

const SESSION_KEY = "nihongo-chat:current-session";

export function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setCurrentSessionId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(SESSION_KEY, id);
  else window.localStorage.removeItem(SESSION_KEY);
}
