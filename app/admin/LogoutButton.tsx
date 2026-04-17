"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
      disabled={busy}
      className="text-xs text-slate-500 hover:text-slate-900 underline"
    >
      {busy ? "..." : "logout"}
    </button>
  );
}
