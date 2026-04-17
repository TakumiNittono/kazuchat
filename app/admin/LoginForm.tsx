"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 503) {
        setError("ADMIN_PASSWORD が環境変数に設定されていません");
        return;
      }
      if (!res.ok) {
        setError("パスワードが違います");
        return;
      }
      router.refresh();
    } catch {
      setError("通信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm mx-auto flex flex-col gap-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-slate-900">Admin login</h1>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <button
        type="submit"
        disabled={busy || !password}
        className="rounded-xl bg-slate-900 text-white font-medium py-3 disabled:bg-slate-300"
      >
        {busy ? "..." : "Sign in"}
      </button>
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : null}
    </form>
  );
}
