import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LogoutButton from "../../LogoutButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  if (!process.env.ADMIN_PASSWORD) redirect("/admin");
  const authed = await isAdminAuthed();
  if (!authed) redirect("/admin");

  const { sessionId } = await params;

  const { data: session } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, anon_user_id, title, created_at, updated_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) notFound();

  const { data: messages } = await supabaseAdmin
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const msgs = messages ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-xs text-sky-600 hover:underline"
          >
            ← back to dashboard
          </Link>
          <h1 className="text-lg font-semibold mt-1">
            Session {session.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            anon: {session.anon_user_id}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            created {formatTime(session.created_at)} · updated{" "}
            {formatTime(session.updated_at)}
          </p>
          {session.title ? (
            <p className="text-sm text-slate-700 mt-1">
              title: {session.title}
            </p>
          ) : null}
        </div>
        <LogoutButton />
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-xs text-slate-500">{msgs.length} messages</p>
        {msgs.map((m) => (
          <article
            key={m.id}
            className={
              m.role === "user"
                ? "bg-sky-50 border border-sky-200 rounded-2xl p-4"
                : m.role === "assistant"
                ? "bg-white border border-slate-200 rounded-2xl p-4"
                : "bg-slate-100 border border-slate-200 rounded-2xl p-4"
            }
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-semibold uppercase tracking-wider">
                {m.role}
              </span>
              <span>{formatTime(m.created_at)}</span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800">
              {m.content}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
