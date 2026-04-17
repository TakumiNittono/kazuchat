"use client";

import { useState } from "react";

export default function PromptEditor({
  initial,
  fallback,
}: {
  initial: string;
  fallback: string;
}) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "system", value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? `status ${res.status}`);
        return;
      }
      setMsg("Saved. Next chat will use the new prompt.");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">System prompt</h2>
        <button
          onClick={() => {
            if (confirm("Reset to built-in default?")) setValue(fallback);
          }}
          className="text-xs text-slate-500 hover:text-slate-900 underline"
        >
          reset to default
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={20}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{value.length.toLocaleString()} chars</span>
        <div className="flex items-center gap-3">
          {msg ? <span className="text-emerald-600">{msg}</span> : null}
          {error ? <span className="text-rose-600">{error}</span> : null}
          <button
            onClick={save}
            disabled={busy || !value.trim()}
            className="rounded-xl bg-slate-900 text-white font-medium px-4 py-2 disabled:bg-slate-300"
          >
            {busy ? "..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
